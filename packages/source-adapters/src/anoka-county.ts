import { NormalizedCustodySnapshotSchema, type Booking } from "@jail-atlas/domain";
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

export const ANOKA_COUNTY_ADAPTER_KEY = "anoka-county-mn-current-roster" as const;
export const ANOKA_COUNTY_CURRENT_SOURCE_URL =
  "https://incustodysearch.co.anoka.mn.us/JailInfoForPublic/inmates_jsonp.aspx?callback=anokaInmates" as const;

const MAX_RECORDS = 2_000;
const MAX_RESPONSE_BYTES = 2_000_000;

const textValue = z.string().trim().min(1).max(250);
const AnokaRecordSchema = z.object({
  displayName: textValue,
  bookingNumber: z.string().trim().min(1).max(100)
});
const AnokaRosterSchema = z.object({
  records: z.array(AnokaRecordSchema).max(MAX_RECORDS),
  sourceLastUpdatedAt: z.string().trim().max(100).nullable()
});
const AnokaRowSchema = z.array(z.unknown()).min(7).max(20);
const AnokaPayloadSchema = z.object({
  LastUpdate: z.union([z.string(), z.number(), z.null()]),
  inmates: z.array(AnokaRowSchema).max(MAX_RECORDS)
});

export type AnokaRoster = z.infer<typeof AnokaRosterSchema>;
export type AnokaRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type AnokaRosterIdFactory = (
  kind: "snapshot" | "person" | "booking",
  sourceKey: string
) => string;

export interface AnokaRosterAdapterOptions {
  readonly fetch: AnokaRosterFetch;
  readonly facilityId: string;
  readonly createId: AnokaRosterIdFactory;
  readonly nowMs?: () => number;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function scalar(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

function isInJail(value: unknown): boolean {
  return value === true || scalar(value).toLowerCase() === "true";
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
    publicMessage: "The approved Anoka County inmate locator could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `ANOKA_COUNTY_${code}`.slice(0, 100)
  };
}

function parseJsonp(body: string): unknown {
  const match = body.match(/^\s*([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)\s*;?\s*$/);
  const callbackName = match?.[1] ?? "";
  if (!match || !["anokaInmates", "jsonpInmates"].includes(callbackName)) {
    throw new Error("INVALID_JSONP_CALLBACK");
  }
  try {
    return JSON.parse(match[2] ?? "");
  } catch {
    throw new Error("INVALID_JSONP_PAYLOAD");
  }
}

async function requestRoster(
  options: AnokaRosterAdapterOptions,
  context: AdapterContext
): Promise<AnokaRoster> {
  if (context.source.sourceUrl !== ANOKA_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(ANOKA_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/javascript", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const body = await response.text();
  if (!body || body.length > MAX_RESPONSE_BYTES) throw new Error("RESPONSE_SIZE");
  const payload = AnokaPayloadSchema.parse(parseJsonp(body));
  const recordsByBooking = new Map<string, AnokaRoster["records"][number]>();
  for (const row of payload.inmates) {
    if (!isInJail(row[4])) continue;
    const lastName = text(row[0]);
    const firstName = text(row[1]);
    const middleName = text(row[2]);
    const bookingNumber = scalar(row[3]);
    if (!lastName || !firstName || !bookingNumber) throw new Error("INVALID_CURRENT_INMATE_ROW");
    const record = AnokaRecordSchema.parse({
      displayName: `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}`,
      bookingNumber
    });
    const previous = recordsByBooking.get(bookingNumber);
    if (previous && previous.displayName !== record.displayName) {
      throw new Error("CONFLICTING_DUPLICATE_BOOKING_NUMBER");
    }
    recordsByBooking.set(bookingNumber, record);
  }
  const sourceLastUpdatedAt = scalar(payload.LastUpdate) || null;
  return AnokaRosterSchema.parse({
    records: [...recordsByBooking.values()],
    sourceLastUpdatedAt
  });
}

export function createAnokaCountySourceAdapter(
  options: AnokaRosterAdapterOptions
): SourceAdapter<AnokaRoster, AnokaRoster, AnokaRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: ANOKA_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: "1.0.0",
    async fetch(context): Promise<FetchResult<AnokaRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<AnokaRoster>> {
      const result = AnokaRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<AnokaRoster>> {
      const result = AnokaRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.records.length === 0
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: "The approved Anoka current-in-custody locator returned no records."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingNumber);
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", record.displayName),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            bookingIdentifier: {
              value: record.bookingNumber,
              sourceLabel: "Booking Number",
              sourceIdentifiesAsBookingIdentifier: true
            },
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges: [],
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
