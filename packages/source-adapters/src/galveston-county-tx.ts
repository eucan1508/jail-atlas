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

export const GALVESTON_COUNTY_TX_ADAPTER_KEY = "galveston-county-tx-current-roster" as const;
// The Sheriff's P2C Inmate Inquiry page; its grid loads the list from the handler below.
export const GALVESTON_COUNTY_TX_CURRENT_SOURCE_URL =
  "https://p2c.galvestoncountytx.gov/jailinmates.aspx" as const;
const LIST_URL = "https://p2c.galvestoncountytx.gov/jqHandler.ashx?op=s";
export const GALVESTON_COUNTY_TX_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 3_000;
// The jail holds about 650-850 people; a far shorter list means a broken export.
const MIN_RECORDS = 200;
const MAX_RESPONSE_BYTES = 6_000_000;
// "ACUFF, CODY SHANE (W /M/42)": the parenthetical (race, sex, age) is not kept.
const DISPLAY_NAME = /^(.+?) \([A-Z ]*\/[A-Z ]*\/\d*\)$/;

const ListRowSchema = z.object({
  book_id: z.string().regex(/^\d{1,12}$/),
  disp_name: z.string().regex(DISPLAY_NAME),
  disp_charge: z.string().max(1_000)
});
const ListSchema = z.object({
  total: z.string(),
  page: z.string(),
  records: z.string().regex(/^\d+$/),
  rows: z.array(z.unknown()).max(MAX_RECORDS)
});

const GalvestonRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z.string().regex(/^\d{1,12}$/),
  primaryCharge: z.string().trim().min(1).max(1_000)
});
const GalvestonRosterSchema = z.object({
  records: z.array(GalvestonRecordSchema).min(MIN_RECORDS).max(MAX_RECORDS)
});

export type GalvestonRoster = z.infer<typeof GalvestonRosterSchema>;
export type GalvestonRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type GalvestonRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface GalvestonRosterAdapterOptions {
  readonly fetch: GalvestonRosterFetch;
  readonly facilityId: string;
  readonly createId: GalvestonRosterIdFactory;
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
    publicMessage: "The approved Galveston County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `GALVESTON_COUNTY_TX_${code}`.slice(0, 100)
  };
}

/**
 * Reads the P2C Inmate Inquiry list the way its own grid does with "All" rows selected. The list
 * gives each person's name, booking number, and primary charge; ages, birth dates, race, sex, and
 * agencies are not kept. Only the primary charge is published, labeled as such.
 */
export function parseGalvestonList(body: unknown): GalvestonRoster {
  const list = ListSchema.parse(body);
  // Everything must arrive on the one requested page and match the declared total.
  if (list.page !== "1" || list.total !== "1" || Number(list.records) !== list.rows.length) {
    throw new Error("LIST_INCOMPLETE");
  }
  const seen = new Set<string>();
  const records = list.rows.map((raw) => {
    const row = ListRowSchema.parse(raw);
    if (seen.has(row.book_id)) throw new Error("DUPLICATE_BOOKING_NUMBER");
    seen.add(row.book_id);
    const displayName = normalizeText(row.disp_name.match(DISPLAY_NAME)?.[1] ?? "");
    const primaryCharge = normalizeText(row.disp_charge);
    if (!primaryCharge) throw new Error("CHARGE_MISSING");
    return GalvestonRecordSchema.parse({ displayName, bookingNumber: row.book_id, primaryCharge });
  });
  return GalvestonRosterSchema.parse({ records });
}

async function requestRoster(
  options: GalvestonRosterAdapterOptions,
  context: AdapterContext
): Promise<GalvestonRoster> {
  if (context.source.sourceUrl !== GALVESTON_COUNTY_TX_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(LIST_URL, {
    method: "POST",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/json", "accept-encoding": "identity" },
    body: new URLSearchParams({
      t: "ii",
      _search: "false",
      rows: "10000",
      page: "1",
      sidx: "disp_name",
      sord: "asc"
    })
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const text = await response.text();
  if (!text || text.length > MAX_RESPONSE_BYTES) throw new Error("RESPONSE_SIZE");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }
  return parseGalvestonList(body);
}

export function createGalvestonCountyTxSourceAdapter(
  options: GalvestonRosterAdapterOptions
): SourceAdapter<GalvestonRoster, GalvestonRoster, GalvestonRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: GALVESTON_COUNTY_TX_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: GALVESTON_COUNTY_TX_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<GalvestonRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<GalvestonRoster>> {
      const result = GalvestonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<GalvestonRoster>> {
      const result = GalvestonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      // The schema refuses a near-empty list, so a valid payload is never empty.
      return Promise.resolve({ kind: "not_empty", recordCount: payload.records.length });
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingNumber);
          const charges: Charge[] = [
            {
              id: options.createId("charge", `${record.bookingNumber}|0|${record.primaryCharge}`),
              bookingId,
              sequence: 0,
              description: record.primaryCharge,
              sourceLabel: "Primary charge",
              statuteCode: null,
              disposition: null
            }
          ];
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", `${record.bookingNumber}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            bookingIdentifier: {
              value: record.bookingNumber,
              sourceLabel: "Booking",
              sourceIdentifiesAsBookingIdentifier: true
            },
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
