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

export const RAMSEY_COUNTY_ADAPTER_KEY = "ramsey-county-mn-current-roster" as const;
export const RAMSEY_COUNTY_CURRENT_SOURCE_URL =
  "https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/" as const;
export const RAMSEY_COUNTY_RESOURCE_BASE_URL =
  "https://opendata.ramseycountymn.gov/resource/" as const;
export const RAMSEY_COUNTY_BOOKINGS_DATASET = "rmrn-stdv" as const;
export const RAMSEY_COUNTY_ARREST_CHARGES_DATASET = "9xpb-vsb7" as const;
export const RAMSEY_COUNTY_FORMAL_CHARGES_DATASET = "yvg4-ntpb" as const;

const RAMSEY_BOOKINGS_LIMIT = 2_000;
const RAMSEY_CHARGES_LIMIT = 10_000;

const textValue = z.union([z.string(), z.number()]).transform(String);
const nullableTextValue = textValue.nullable().optional();

const RamseyBookingSchema = z.object({
  person_id: textValue,
  booking_no: z.string().trim().min(1).max(200),
  date_booked: z.string().trim().min(1).max(80),
  // The request is explicitly filtered to current custody. A non-null release
  // value means the upstream ignored that filter and must fail closed.
  date_released: z.null().optional(),
  name: z.string().trim().min(1).max(250)
});

const RamseyChargeSchema = z.object({
  booking_no: z.string().trim().min(1).max(200),
  charge_id: textValue,
  arrest_charge: nullableTextValue,
  arrest_charge_level: nullableTextValue,
  formal_charge: nullableTextValue,
  formal_charge_level: nullableTextValue
});

const RamseyRosterSchema = z.object({
  bookings: z.array(RamseyBookingSchema).max(RAMSEY_BOOKINGS_LIMIT),
  charges: z.array(RamseyChargeSchema).max(RAMSEY_CHARGES_LIMIT)
});
export type RamseyRoster = z.infer<typeof RamseyRosterSchema>;
export type RamseyRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type RamseyRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface RamseyRosterAdapterOptions {
  readonly fetch: RamseyRosterFetch;
  readonly facilityId: string;
  readonly createId: RamseyRosterIdFactory;
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
    publicMessage: "The approved Ramsey County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `RAMSEY_COUNTY_${code}`.slice(0, 100)
  };
}

async function fetchDataset(
  options: RamseyRosterAdapterOptions,
  dataset: string,
  query: URLSearchParams,
  context: AdapterContext,
  maximumRows: number
): Promise<unknown> {
  const response = await options.fetch(
    `${RAMSEY_COUNTY_RESOURCE_BASE_URL}${dataset}.json?${query.toString()}`,
    {
      method: "GET",
      redirect: "error",
      signal: context.signal,
      headers: { accept: "application/json", "accept-encoding": "identity" }
    }
  );
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const payload: unknown = await response.json();
  const rows = z.array(z.unknown()).parse(payload);
  if (rows.length >= maximumRows) {
    throw new Error(`ROW_LIMIT_REACHED_${dataset}`);
  }
  return rows;
}

async function requestRoster(
  options: RamseyRosterAdapterOptions,
  context: AdapterContext
): Promise<RamseyRoster> {
  if (context.source.sourceUrl !== RAMSEY_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const bookings = await fetchDataset(
    options,
    RAMSEY_COUNTY_BOOKINGS_DATASET,
    new URLSearchParams({
      $limit: "2000",
      $where: "date_released IS NULL"
    }),
    context,
    RAMSEY_BOOKINGS_LIMIT
  );
  const arrestCharges = await fetchDataset(
    options,
    RAMSEY_COUNTY_ARREST_CHARGES_DATASET,
    new URLSearchParams({ $limit: "10000" }),
    context,
    RAMSEY_CHARGES_LIMIT
  );
  const formalCharges = await fetchDataset(
    options,
    RAMSEY_COUNTY_FORMAL_CHARGES_DATASET,
    new URLSearchParams({ $limit: "10000" }),
    context,
    RAMSEY_CHARGES_LIMIT
  );
  const currentBookings = z.array(RamseyBookingSchema).parse(bookings);
  const bookingNumbers = new Set<string>();
  for (const booking of currentBookings) {
    if (bookingNumbers.has(booking.booking_no)) {
      throw new Error("DUPLICATE_BOOKING_NUMBER");
    }
    bookingNumbers.add(booking.booking_no);
  }
  const currentBookingNumbers = bookingNumbers;
  const combinedCharges = [
    ...z
      .array(RamseyChargeSchema.partial({ formal_charge: true, formal_charge_level: true }))
      .parse(arrestCharges),
    ...z
      .array(RamseyChargeSchema.partial({ arrest_charge: true, arrest_charge_level: true }))
      .parse(formalCharges)
  ].filter((charge) => currentBookingNumbers.has(charge.booking_no));
  return RamseyRosterSchema.parse({ bookings: currentBookings, charges: combinedCharges });
}

export function createRamseyCountySourceAdapter(
  options: RamseyRosterAdapterOptions
): SourceAdapter<RamseyRoster, RamseyRoster, RamseyRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());

  return {
    key: RAMSEY_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: "1.0.0",
    async fetch(context): Promise<FetchResult<RamseyRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<RamseyRoster>> {
      try {
        return Promise.resolve({ ok: true, value: RamseyRosterSchema.parse(payload) });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "validate", error) });
      }
    },
    parse(payload, context): Promise<ParseResult<RamseyRoster>> {
      try {
        return Promise.resolve({ ok: true, value: RamseyRosterSchema.parse(payload) });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "parse", error) });
      }
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.bookings.length === 0
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: "The approved Ramsey current-custody query returned an empty result."
            }
          : { kind: "not_empty", recordCount: payload.bookings.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const chargesByBooking = new Map<string, z.infer<typeof RamseyChargeSchema>[]>();
        for (const charge of payload.charges) {
          const entries = chargesByBooking.get(charge.booking_no) ?? [];
          entries.push(charge);
          chargesByBooking.set(charge.booking_no, entries);
        }
        const bookings: Booking[] = payload.bookings.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.booking_no);
          const personId = options.createId("person", record.person_id);
          const charges: Charge[] = [];
          for (const charge of chargesByBooking.get(record.booking_no) ?? []) {
            const descriptions = [
              [charge.arrest_charge, charge.arrest_charge_level, "Arresting charge"],
              [charge.formal_charge, charge.formal_charge_level, "Formal charge"]
            ] as const;
            for (const [description, level, label] of descriptions) {
              if (!description) continue;
              charges.push({
                id: options.createId("charge", `${charge.charge_id}|${label}`),
                bookingId,
                sequence: charges.length,
                description,
                sourceLabel: level ? `${label} (${level})` : label,
                statuteCode: null,
                disposition: null
              });
            }
          }
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: personId,
              snapshotId,
              displayName: record.name,
              sourceDisplayText: record.name
            },
            bookingIdentifier: {
              value: record.booking_no,
              sourceLabel: "Booking Number",
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
