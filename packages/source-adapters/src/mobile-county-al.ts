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

export const MOBILE_COUNTY_AL_ADAPTER_KEY = "mobile-county-al-current-roster" as const;
export const MOBILE_COUNTY_AL_CURRENT_SOURCE_URL =
  "https://all.mobileso.com/OthReports/CurrentInmates.aspx" as const;
export const MOBILE_COUNTY_AL_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 3_000;
const MAX_PAGE_BYTES = 6_000_000;
// Metro Jail holds about 1,500 people a day; a list far below that means a broken report.
const MIN_RECORDS = 200;
const EXPECTED_COLUMNS = ["NAME", "DATE", "CHARGES", "BONDS"] as const;

const MobileRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingDateText: z.string().regex(/^\d{1,2}\/\d{1,2}\/\d{4}$/),
  charges: z.array(z.string().trim().min(1).max(1_000)).min(1).max(100)
});

const MobileRosterSchema = z.object({
  records: z.array(MobileRecordSchema).min(MIN_RECORDS).max(MAX_RECORDS)
});

export type MobileRoster = z.infer<typeof MobileRosterSchema>;
export type MobileRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type MobileRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface MobileRosterAdapterOptions {
  readonly fetch: MobileRosterFetch;
  readonly facilityId: string;
  readonly createId: MobileRosterIdFactory;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value
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
    publicMessage: "The approved Mobile County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `MOBILE_COUNTY_AL_${code}`.slice(0, 100)
  };
}

// Many charges start with the case or warrant number ("CC21-1775.71 PROBATION",
// "HC0035494 THEFT OF PROPERTY 3RD DEGREE (MISD)"). The number is dropped; the offense stays.
const CASE_NUMBER_PREFIX = /^(?=[A-Z0-9.-]*\d)[A-Z]{0,5}\d[\d.-]*\s+(?=[A-Z(])/;

export function formatMobileCharge(value: string): string {
  const text = normalizeText(value);
  const stripped = text.replace(CASE_NUMBER_PREFIX, "");
  return stripped.length > 0 ? stripped : text;
}

/**
 * Reads the Sheriff's "Current Inmates" report: one table row per person with name, booking date,
 * charges (one per line), and bonds. Bond lines do not always pair with charge lines, so bonds are
 * not read. The report repeats some rows verbatim; exact repeats are kept once.
 */
export function parseMobileRosterHtml(html: string): MobileRoster {
  // A cut-off download would silently lose the end of the alphabet.
  if (!/<\/html>\s*$/i.test(html)) throw new Error("RESPONSE_TRUNCATED");
  const $ = load(html);
  if ($("form#form1[action='CurrentInmates.aspx']").length !== 1) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const tables = $("table").filter((_index, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .children("th")
      .toArray()
      .map((cell) => normalizeText($(cell).text()));
    return JSON.stringify(headers) === JSON.stringify(EXPECTED_COLUMNS);
  });
  if (tables.length !== 1) throw new Error("ROSTER_COLUMNS_CHANGED");

  const seen = new Set<string>();
  const records: MobileRoster["records"] = [];
  tables
    .first()
    .find("tr")
    .slice(1)
    .each((_index, row) => {
      const cells = $(row).children("td");
      if (cells.length !== EXPECTED_COLUMNS.length) throw new Error("ROW_STRUCTURE_CHANGED");
      const displayName = normalizeText(cells.eq(0).text());
      const bookingDateText = normalizeText(cells.eq(1).text());
      const chargeCell = cells.eq(2).clone();
      chargeCell.find("br").replaceWith("\n");
      const charges = chargeCell.text().split("\n").map(formatMobileCharge).filter(Boolean);
      if (!displayName || charges.length === 0) throw new Error("INVALID_RECORD");
      const key = JSON.stringify([displayName, bookingDateText, charges]);
      if (seen.has(key)) return;
      seen.add(key);
      records.push(MobileRecordSchema.parse({ displayName, bookingDateText, charges }));
    });
  return MobileRosterSchema.parse({ records });
}

async function requestRoster(
  options: MobileRosterAdapterOptions,
  context: AdapterContext
): Promise<MobileRoster> {
  if (context.source.sourceUrl !== MOBILE_COUNTY_AL_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(MOBILE_COUNTY_AL_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return parseMobileRosterHtml(html);
}

export function createMobileCountySourceAdapter(
  options: MobileRosterAdapterOptions
): SourceAdapter<MobileRoster, MobileRoster, MobileRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: MOBILE_COUNTY_AL_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: MOBILE_COUNTY_AL_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<MobileRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<MobileRoster>> {
      const result = MobileRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<MobileRoster>> {
      const result = MobileRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      // The schema refuses a near-empty report, so a valid payload is never empty.
      return Promise.resolve({ kind: "not_empty", recordCount: payload.records.length });
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          // The report has no booking number; name, booking date, and position identify a row.
          const recordKey = `${record.displayName}|${record.bookingDateText}|${sourceOrder}`;
          const bookingId = options.createId("booking", recordKey);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${recordKey}|${sequence}|${description}`),
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
              id: options.createId("person", recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
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
