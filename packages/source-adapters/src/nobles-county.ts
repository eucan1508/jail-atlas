import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
import { load } from "cheerio/slim";
import { z } from "zod";

import type {
  AdapterContext,
  AdapterStage,
  EmptyResultInterpretation,
  FailureClassification,
  FetchResult,
  NormalizationResult,
  ParseResult,
  SourceAdapter,
  SourceHealth,
  ValidationResult
} from "./contracts.js";
import { assertFewWithoutCharges } from "./charge-gaps.js";

export const NOBLES_COUNTY_ADAPTER_KEY = "nobles-county-mn-current-roster" as const;
export const NOBLES_COUNTY_CURRENT_SOURCE_URL =
  "https://ftp.co.nobles.mn.us/jail/Inmate_listing/inmate_listing.html" as const;
export const NOBLES_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;
// The listing is rebuilt every few minutes; an older one means the county stopped updating it.
const MAX_PAGE_AGE_MS = 48 * 60 * 60 * 1_000;
// "Last Updated" is printed in Central time; allow for the offset when comparing to UTC.
const TIMEZONE_ALLOWANCE_MS = 6 * 60 * 60 * 1_000;
const RECORD_START = '<div class="inmate_detail_row">';
const LAST_UPDATED = /Last Updated: <strong>([^<]*)<\/strong>/g;
const STAMP = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}) ([AP]M)$/;
const BOOKING_DATE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const NAME = /^[^,]+, \S.*$/;
const CHARGE_COLUMNS = ["Agency", "Type", "Description"];
const CHARGE_TYPES = new Set(["Felony", "Gross Misdemeanor", "Misdemeanor", "Unknown"]);

const NoblesRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});
const NoblesRosterSchema = z.object({
  records: z.array(NoblesRecordSchema).max(MAX_RECORDS),
  lastUpdatedText: z.string().regex(STAMP),
  validEmptyMarker: z.boolean()
});

export type NoblesRoster = z.infer<typeof NoblesRosterSchema>;
export type NoblesRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type NoblesRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface NoblesRosterAdapterOptions {
  readonly fetch: NoblesRosterFetch;
  readonly facilityId: string;
  readonly createId: NoblesRosterIdFactory;
  readonly nowMs?: () => number;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage:
      "The approved Nobles County, Minnesota inmate listing could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `NOBLES_COUNTY_${code}`.slice(0, 100)
  };
}

/** Central-time stamp read as if it were UTC; the age check allows for the offset. */
function stampMs(text: string): number {
  const match = text.match(STAMP);
  if (!match) throw new Error("LAST_UPDATED_MISSING");
  const [, month, day, year, hour, minute, meridiem] = match;
  const hours = (Number(hour) % 12) + (meridiem === "PM" ? 12 : 0);
  return Date.UTC(Number(year), Number(month) - 1, Number(day), hours, Number(minute));
}

/**
 * Reads the Inmate Listing. The county writes each person as its own small page (record, then a
 * "Last Updated" stamp and closing tags), so every record must be followed by the same stamp.
 * Photos, booking dates, and arresting agencies are read past and never kept.
 */
export function parseNoblesListing(html: string): NoblesRoster {
  const parts = html.split(RECORD_START);
  if (!parts[0]!.includes('<h3 class="page_header">Inmate Listing</h3>')) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  if (!html.trimEnd().endsWith("</html>")) throw new Error("LISTING_TRUNCATED");
  const stamps = [...html.matchAll(LAST_UPDATED)].map((match) => normalizeText(match[1]));
  const blocks = parts.slice(1);
  // An empty listing still prints one stamp; otherwise there is one per person.
  if (stamps.length !== Math.max(blocks.length, 1) || new Set(stamps).size !== 1) {
    throw new Error("LISTING_STAMPS_INCONSISTENT");
  }

  const records = blocks.map((block) => {
    const $ = load(block);
    const displayName = normalizeText($(".inmate_detail_name").first().text());
    const bookingDate = normalizeText($(".inmate_detail_booking_date").first().text());
    if (!NAME.test(displayName)) throw new Error("NAME_UNREADABLE");
    if (!BOOKING_DATE.test(bookingDate)) throw new Error("BOOKING_DATE_UNREADABLE");
    const table = $("table.inmate_detail_charges");
    if (table.length !== 1) throw new Error("CHARGES_TABLE_MISSING");
    const header = table
      .find("tr.inmate_detail_charges_headers td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()));
    if (JSON.stringify(header) !== JSON.stringify(CHARGE_COLUMNS)) {
      throw new Error("CHARGE_COLUMNS_CHANGED");
    }
    const charges = table
      .find("tr.inmate_detail_charge_row")
      .toArray()
      .map((row) => {
        const type = normalizeText($(row).find(".inmate_detail_charge_type").text());
        const description = normalizeText($(row).find(".inmate_detail_charge_description").text());
        if (!description || !CHARGE_TYPES.has(type)) throw new Error("CHARGE_ROW_UNREADABLE");
        return type === "Unknown" ? description : `${description} (${type})`;
      });
    return { recordKey: `${displayName}|${bookingDate}`, displayName, charges };
  });

  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_LISTING_ENTRY");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  // The county jail is never empty; a listing without people means the export broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return NoblesRosterSchema.parse({
    records,
    lastUpdatedText: stamps[0],
    validEmptyMarker: false
  });
}

async function requestRoster(
  options: NoblesRosterAdapterOptions,
  context: AdapterContext
): Promise<NoblesRoster> {
  if (context.source.sourceUrl !== NOBLES_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(NOBLES_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  const roster = parseNoblesListing(html);
  const ageMs = Date.parse(context.requestedAt) - stampMs(roster.lastUpdatedText);
  if (ageMs > MAX_PAGE_AGE_MS + TIMEZONE_ALLOWANCE_MS) throw new Error("SOURCE_LISTING_STALE");
  return roster;
}

export function createNoblesCountySourceAdapter(
  options: NoblesRosterAdapterOptions
): SourceAdapter<NoblesRoster, NoblesRoster, NoblesRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: NOBLES_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: NOBLES_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<NoblesRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<NoblesRoster>> {
      const result = NoblesRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<NoblesRoster>> {
      const result = NoblesRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.records.length === 0 && payload.validEmptyMarker
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: "The official Nobles County Inmate Listing listed no one."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.recordKey);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${record.recordKey}|${sequence}|${description}`),
            bookingId,
            sequence,
            description,
            sourceLabel: "Charges",
            statuteCode: null,
            disposition: null
          }));
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", record.recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The listing shows no booking number.
            bookingIdentifier: null,
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            bondEntries: [],
            sourceOrder
          };
        });
        return Promise.resolve({
          ok: true,
          value: NormalizedCustodySnapshotSchema.parse({
            id: snapshotId,
            sourceId: context.source.id,
            ingestRunId: context.runId,
            capturedAt: context.requestedAt,
            sourceLastUpdatedAt: null,
            custodyScope: "current_custody",
            recordCount: bookings.length,
            validEmptyResult: emptyResult.kind === "valid_empty",
            stale: false,
            expiresAt: null,
            bookings
          })
        });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "normalize", error) });
      }
    },
    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        await requestRoster(options, context);
        return {
          status: "healthy",
          checkedAt: context.requestedAt,
          latencyMs: Math.max(0, nowMs() - started),
          failure: null
        };
      } catch (error) {
        return {
          status: "unavailable",
          checkedAt: context.requestedAt,
          latencyMs: Math.max(0, nowMs() - started),
          failure: classify(context, "health_check", error)
        };
      }
    },
    classifyFailure(error, stage, context) {
      return classify(context, stage, error);
    }
  };
}
