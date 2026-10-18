import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
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

export const CLAY_COUNTY_ADAPTER_KEY = "clay-county-mn-current-roster" as const;
export const CLAY_COUNTY_CURRENT_SOURCE_URL =
  "https://files.claycountymn.gov/InmateRoster/index.htm" as const;
export const CLAY_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;
// The roster is regenerated through the day; an older page means the county stopped updating it.
const MAX_PAGE_AGE_MS = 48 * 60 * 60 * 1_000;
// The generation time is printed in Central time; allow for the offset when comparing to UTC.
const TIMEZONE_ALLOWANCE_MS = 6 * 60 * 60 * 1_000;
const GENERATED_AT =
  /<!--Page last generated at (\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})-->/;
const GENERATED_AT_TEXT = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
const ENTRY_START = "<p><font color=#496C8B><strong>";
const ENTRY_END = "<hr width=500 align=left color=#496C8B>";
// Each charge sits on its own line behind three non-breaking spaces.
const CHARGE_LINE = /^&nbsp&nbsp&nbsp(.+)$/;
const LABEL_LINE = /^<b>([^<]+):<\/b>\s*(.*)$/;
const BOOKING_DATE = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2} [AP]M$/;
// "LAST , FIRST MIDDLE" as printed; the space before the comma is dropped.
const NAME = /^([^,<>]+?) , ([^,<>]+)$/;

const ClayRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).min(1).max(100)
});
const ClayRosterSchema = z.object({
  records: z.array(ClayRecordSchema).max(MAX_RECORDS),
  generatedAtText: z.string().regex(GENERATED_AT_TEXT),
  validEmptyMarker: z.boolean()
});

export type ClayRoster = z.infer<typeof ClayRosterSchema>;
export type ClayRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type ClayRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface ClayRosterAdapterOptions {
  readonly fetch: ClayRosterFetch;
  readonly facilityId: string;
  readonly createId: ClayRosterIdFactory;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value
    .replace(/&nbsp;?/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
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
      "The approved Clay County, Minnesota inmate roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `CLAY_COUNTY_${code}`.slice(0, 100)
  };
}

/** Central-time generation stamp read as if it were UTC; the age check allows for the offset. */
function generatedAtMs(text: string): number {
  const match = text.match(GENERATED_AT_TEXT);
  if (!match) throw new Error("GENERATED_AT_MISSING");
  const [, month, day, year, hour, minute, second] = match.map(Number);
  return Date.UTC(year!, month! - 1, day, hour, minute, second);
}

/**
 * Reads the generated roster page: one block per person with name, age, booking date, and one or
 * more arresting-agency groups, each with its charges. Ages, booking dates, agencies, mugshot
 * links, and lines outside a Charges group (such as holds) are read past and never kept.
 */
export function parseClayRoster(html: string): ClayRoster {
  const generated = html.match(GENERATED_AT);
  if (!generated || !html.includes("https://files.claycountymn.gov/InmateRoster/Roster_A.htm")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  if (!html.trimEnd().endsWith("</body>")) throw new Error("ROSTER_TRUNCATED");

  const blocks = html.split(ENTRY_START).slice(1);
  const records = blocks.map((block) => {
    const end = block.indexOf(ENTRY_END);
    if (end < 0) throw new Error("ENTRY_STRUCTURE_CHANGED");
    const lines = block
      .slice(0, end)
      .split(/<br>/)
      .map((line) => line.trim());
    const name = normalizeText(lines[0]!.split("</strong>")[0] ?? "").match(NAME);
    if (!name) throw new Error("NAME_UNREADABLE");
    const displayName = `${name[1]!.trim()}, ${name[2]!.trim()}`;

    let bookingDate: string | null = null;
    let inCharges = false;
    let groups = 0;
    const charges: string[] = [];
    for (const line of lines.slice(1)) {
      const label = line.match(LABEL_LINE);
      if (label) {
        const [, key, value] = label;
        if (key === "Booking Date") bookingDate = normalizeText(value ?? "");
        if (key === "Charges") groups += 1;
        inCharges = key === "Charges";
        continue;
      }
      const charge = line.match(CHARGE_LINE);
      if (charge && inCharges) {
        const text = normalizeText(charge[1]!);
        if (text) charges.push(text);
      }
    }
    if (!bookingDate || !BOOKING_DATE.test(bookingDate)) throw new Error("BOOKING_DATE_UNREADABLE");
    if (groups === 0 || charges.length === 0) throw new Error("CHARGES_MISSING");
    return { recordKey: `${displayName}|${bookingDate}`, displayName, charges };
  });

  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_ROSTER_ENTRY");
  }
  // The county jail is never empty; a page without people means the export broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return ClayRosterSchema.parse({
    records,
    generatedAtText: `${generated.slice(1, 4).join("/")} ${generated.slice(4, 7).join(":")}`,
    validEmptyMarker: false
  });
}

async function requestRoster(
  options: ClayRosterAdapterOptions,
  context: AdapterContext
): Promise<ClayRoster> {
  if (context.source.sourceUrl !== CLAY_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(CLAY_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  const roster = parseClayRoster(html);
  const ageMs = Date.parse(context.requestedAt) - generatedAtMs(roster.generatedAtText);
  if (ageMs > MAX_PAGE_AGE_MS + TIMEZONE_ALLOWANCE_MS) throw new Error("SOURCE_PAGE_STALE");
  return roster;
}

export function createClayCountySourceAdapter(
  options: ClayRosterAdapterOptions
): SourceAdapter<ClayRoster, ClayRoster, ClayRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: CLAY_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: CLAY_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<ClayRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<ClayRoster>> {
      const result = ClayRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<ClayRoster>> {
      const result = ClayRosterSchema.safeParse(payload);
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
              evidence: "The official Clay County inmate roster listed no one."
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
            // The roster shows no booking number.
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
