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

export const CLEARWATER_COUNTY_ADAPTER_KEY = "clearwater-county-mn-current-roster" as const;
export const CLEARWATER_COUNTY_CURRENT_SOURCE_URL =
  "https://map.co.clearwater.mn.us/inmate-list/inmate-data/inmates.json" as const;
export const CLEARWATER_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 500;
// The Inmate List page says the file is refreshed every 60 minutes; a file this old has stopped.
const MAX_SOURCE_AGE_MS = 36 * 60 * 60 * 1000;
const CHARGE_LINE = /^(\S+) - (.+)$/;

const ClearwaterChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const ClearwaterRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  inmateNumber: z.string().regex(/^CRIN\d{9}$/),
  charges: z.array(ClearwaterChargeSchema).max(100)
});
const ClearwaterRosterSchema = z.object({
  records: z.array(ClearwaterRecordSchema).max(MAX_RECORDS),
  sourceLastUpdatedAt: z.string().datetime(),
  validEmptyMarker: z.boolean()
});

// Only the fields this adapter reads are declared; age and sex are ignored and never stored.
const ListResponseSchema = z.object({
  data: z.array(
    z.object({
      Last_First_Name: z.string(),
      Inmate_number: z.string(),
      Charges_for_All_Hold_Reasons_New_Lines: z.string().nullable()
    })
  )
});

export type ClearwaterRoster = z.infer<typeof ClearwaterRosterSchema>;
export type ClearwaterRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type ClearwaterRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface ClearwaterRosterAdapterOptions {
  readonly fetch: ClearwaterRosterFetch;
  readonly facilityId: string;
  readonly createId: ClearwaterRosterIdFactory;
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
    publicMessage:
      "The approved Clearwater County, Minnesota inmate search could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `CLEARWATER_COUNTY_${code}`.slice(0, 100)
  };
}

/** Each charge is on its own line as "statute - description"; a line without a statute is kept whole. */
export function parseClearwaterCharges(
  text: string | null
): { description: string; statuteCode: string | null }[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .map((line) => {
      const match = CHARGE_LINE.exec(line);
      return match
        ? { statuteCode: match[1]!, description: match[2]! }
        : { statuteCode: null, description: line };
    });
}

async function crawlRoster(
  options: ClearwaterRosterAdapterOptions,
  context: AdapterContext
): Promise<ClearwaterRoster> {
  const response = await options.fetch(CLEARWATER_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/json", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const lastModified = Date.parse(response.headers.get("last-modified") ?? "");
  if (!Number.isFinite(lastModified)) throw new Error("LAST_MODIFIED_MISSING");
  if (Date.parse(context.requestedAt) - lastModified > MAX_SOURCE_AGE_MS) {
    throw new Error("SOURCE_STALE");
  }
  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
  const parsed = ListResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
  const rows = parsed.data.data;
  if (rows.length > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");

  const numbers = rows.map((row) => normalizeText(row.Inmate_number));
  if (new Set(numbers).size !== numbers.length) throw new Error("DUPLICATE_INMATE_NUMBER");
  const records = rows.map((row) => {
    const displayName = normalizeText(row.Last_First_Name);
    if (!displayName) throw new Error("INVALID_RECORD_IDENTITY");
    return ClearwaterRecordSchema.parse({
      displayName,
      inmateNumber: normalizeText(row.Inmate_number),
      charges: parseClearwaterCharges(row.Charges_for_All_Hold_Reasons_New_Lines)
    });
  });

  // The jail is never empty; an empty list means the export broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return ClearwaterRosterSchema.parse({
    records,
    sourceLastUpdatedAt: new Date(lastModified).toISOString(),
    validEmptyMarker: false
  });
}

async function requestRoster(
  options: ClearwaterRosterAdapterOptions,
  context: AdapterContext
): Promise<ClearwaterRoster> {
  if (context.source.sourceUrl !== CLEARWATER_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  return crawlRoster(options, context);
}

export function createClearwaterCountySourceAdapter(
  options: ClearwaterRosterAdapterOptions
): SourceAdapter<ClearwaterRoster, ClearwaterRoster, ClearwaterRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: CLEARWATER_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: CLEARWATER_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<ClearwaterRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<ClearwaterRoster>> {
      const result = ClearwaterRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<ClearwaterRoster>> {
      const result = ClearwaterRosterSchema.safeParse(payload);
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
              evidence:
                "The official Clearwater County, Minnesota inmate search reported zero people in custody."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const recordKey = record.inmateNumber;
          const bookingId = options.createId("booking", recordKey);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId("charge", `${recordKey}|${sequence}|${charge.description}`),
            bookingId,
            sequence,
            description: charge.description,
            sourceLabel: "Charges",
            statuteCode: charge.statuteCode,
            disposition: null
          }));
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", `${recordKey}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The list calls this an inmate number, not a booking number, so it is not shown as one.
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
            sourceLastUpdatedAt: payload.sourceLastUpdatedAt,
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
        await crawlRoster(options, context);
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
