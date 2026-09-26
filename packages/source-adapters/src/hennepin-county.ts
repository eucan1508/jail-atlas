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

export const HENNEPIN_COUNTY_ADAPTER_KEY = "hennepin-county-mn-current-roster" as const;
export const HENNEPIN_COUNTY_CURRENT_SOURCE_URL = "https://jailroster.hennepin.us/" as const;
export const HENNEPIN_COUNTY_API_URL =
  "https://api.hennepincounty.gov/hcso-public-services-api/v1/JailRoster/Search" as const;

const HennepinRecordSchema = z.object({
  incarcerationId: z.number().int().positive(),
  bookingNumber: z.string().trim().min(1).max(200),
  fullName: z.string().trim().min(1).max(250),
  custodyStatus: z.literal(1),
  custodyStatusDisplay: z.string().trim().min(1).max(100),
  arrestedBy: z.string().trim().max(250).nullable().optional(),
  receivedDateTime: z.string().trim().max(80).nullable().optional(),
  releasedDateTime: z.null().optional()
});
const HennepinResponseSchema = z.object({
  data: z.array(HennepinRecordSchema).max(2_000),
  pagination: z.object({ totalRecords: z.number().int().nonnegative() }).passthrough()
});
export type HennepinRosterRecord = z.infer<typeof HennepinRecordSchema>;
export type HennepinRosterResponse = z.infer<typeof HennepinResponseSchema>;
export type HennepinRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type HennepinRosterIdFactory = (
  kind: "snapshot" | "person" | "booking",
  sourceKey: string
) => string;

export interface HennepinRosterAdapterOptions {
  readonly fetch: HennepinRosterFetch;
  readonly subscriptionKey: string;
  readonly facilityId: string;
  readonly createId: HennepinRosterIdFactory;
  readonly nowMs?: () => number;
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
    publicMessage: "The approved Hennepin County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `HENNEPIN_COUNTY_${code}`.slice(0, 100)
  };
}

export function createHennepinCountySourceAdapter(
  options: HennepinRosterAdapterOptions
): SourceAdapter<HennepinRosterResponse, HennepinRosterResponse, HennepinRosterResponse> {
  const nowMs = options.nowMs ?? (() => Date.now());

  const requestRoster = async (context: AdapterContext): Promise<HennepinRosterResponse> => {
    if (context.source.sourceUrl !== HENNEPIN_COUNTY_CURRENT_SOURCE_URL) {
      throw new Error("SOURCE_CONFIGURATION");
    }
    const response = await options.fetch(HENNEPIN_COUNTY_API_URL, {
      method: "POST",
      redirect: "error",
      signal: context.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "Ocp-Apim-Subscription-Key": options.subscriptionKey
      },
      body: JSON.stringify({ custodyStatus: 1 })
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return HennepinResponseSchema.parse(await response.json());
  };

  return {
    key: HENNEPIN_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: "1.0.0",
    async fetch(context): Promise<FetchResult<HennepinRosterResponse>> {
      try {
        return { ok: true, value: await requestRoster(context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<HennepinRosterResponse>> {
      try {
        return Promise.resolve({ ok: true, value: HennepinResponseSchema.parse(payload) });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "validate", error) });
      }
    },
    parse(payload, context): Promise<ParseResult<HennepinRosterResponse>> {
      try {
        return Promise.resolve({ ok: true, value: HennepinResponseSchema.parse(payload) });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "parse", error) });
      }
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.data.length === 0
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: "The approved Hennepin current-custody API returned an empty result."
            }
          : { kind: "not_empty", recordCount: payload.data.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.data.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", String(record.incarcerationId));
          const personId = options.createId("person", record.fullName);
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: personId,
              snapshotId,
              displayName: record.fullName,
              sourceDisplayText: record.fullName
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
        await requestRoster(context);
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
