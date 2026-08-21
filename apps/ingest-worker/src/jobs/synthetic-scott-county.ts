import {
  BookingSchema,
  NormalizedCustodySnapshotSchema,
  type Booking,
  type BondEntry,
  type Charge,
  type CustodyDataScope,
  type NormalizedCustodySnapshot
} from "@jail-atlas/domain";
import {
  type AdapterContext,
  type EmptyResultInterpretation,
  type FailureClassification,
  type FetchResult,
  type NormalizationResult,
  type ParseResult,
  type SourceAdapter,
  type SourceHealth,
  type ValidationResult
} from "@jail-atlas/source-adapters";
import { syntheticScottCountyFixture } from "@jail-atlas/test-fixtures";
import { z } from "zod";

import {
  SYNTHETIC_SCOTT_ADAPTER_ID,
  SyntheticScenarioSchema,
  type SyntheticScenario
} from "../execution-guard.ts";

const SyntheticPayloadSchema = z.object({
  scenario: SyntheticScenarioSchema,
  rows: z.array(BookingSchema),
  stale: z.boolean()
});

type SyntheticPayload = z.infer<typeof SyntheticPayloadSchema>;

const fixtureIds = {
  facility: syntheticScottCountyFixture.facility.id,
  bookingOne: "20000000-0000-4000-8000-000000000011",
  bookingTwo: "20000000-0000-4000-8000-000000000012",
  bookingThree: "20000000-0000-4000-8000-000000000013",
  bookingFour: "20000000-0000-4000-8000-000000000014",
  bookingFive: "20000000-0000-4000-8000-000000000015",
  personOne: "20000000-0000-4000-8000-000000000021",
  personTwo: "20000000-0000-4000-8000-000000000022",
  personThree: "20000000-0000-4000-8000-000000000023",
  personFour: "20000000-0000-4000-8000-000000000024",
  personFive: "20000000-0000-4000-8000-000000000025",
  rawSnapshot: "20000000-0000-4000-8000-000000000099"
} as const;

interface RowOptions {
  readonly sequence: number;
  readonly bookingId: string;
  readonly personId: string;
  readonly displayName: string;
  readonly custodyScope?: CustodyDataScope;
  readonly releasedAt?: string | null;
  readonly chargeDescriptions?: readonly string[];
  readonly bonds?: readonly BondState[];
}

type BondState =
  | { readonly state: "monetary"; readonly amountMinor: number }
  | { readonly state: "no_bond" }
  | { readonly state: "not_published" }
  | { readonly state: "unknown" }
  | { readonly state: "not_applicable" };

function fixtureUuid(category: number, sequence: number, item: number): string {
  const suffix = `${category}${sequence.toString().padStart(3, "0")}${item
    .toString()
    .padStart(4, "0")}`.padStart(12, "0");
  return `30000000-0000-4000-8000-${suffix}`;
}

function createCharges(
  bookingId: string,
  sequence: number,
  descriptions: readonly string[]
): Charge[] {
  return descriptions.map((description, index) => ({
    id: fixtureUuid(1, sequence, index + 1),
    bookingId,
    sequence: index,
    description,
    sourceLabel: "Synthetic charge label",
    statuteCode: null,
    disposition: null
  }));
}

function createBonds(
  bookingId: string,
  sequence: number,
  states: readonly BondState[]
): BondEntry[] {
  return states.map((bond, index) => {
    const base = {
      id: fixtureUuid(2, sequence, index + 1),
      bookingId,
      sequence: index,
      sourceLabel: "Synthetic bond label",
      note: null
    } as const;

    return bond.state === "monetary"
      ? { ...base, state: "monetary" as const, amountMinor: bond.amountMinor, currency: "USD" }
      : { ...base, state: bond.state };
  });
}

function createRow(options: RowOptions): SyntheticPayload["rows"][number] {
  const custodyScope = options.custodyScope ?? "current_custody";
  return {
    id: options.bookingId,
    snapshotId: fixtureIds.rawSnapshot,
    person: {
      id: options.personId,
      snapshotId: fixtureIds.rawSnapshot,
      displayName: options.displayName,
      sourceDisplayText: `${options.displayName} — synthetic fixture only`
    },
    bookingIdentifier: {
      value: `SYNTHETIC-BOOKING-${options.sequence.toString().padStart(3, "0")}`,
      sourceLabel: "Synthetic booking identifier",
      sourceIdentifiesAsBookingIdentifier: true
    },
    custodyScope,
    bookedAt: "2026-01-02T08:00:00.000Z",
    releasedAt:
      custodyScope === "recent_release" ? (options.releasedAt ?? "2026-01-03T08:00:00.000Z") : null,
    facilityId: fixtureIds.facility,
    charges: createCharges(
      options.bookingId,
      options.sequence,
      options.chargeDescriptions ?? ["Synthetic charge description"]
    ),
    bondEntries: createBonds(
      options.bookingId,
      options.sequence,
      options.bonds ?? [{ state: "unknown" }]
    ),
    sourceOrder: options.sequence
  };
}

function rowsForScenario(scenario: SyntheticScenario): SyntheticPayload["rows"] {
  const base = {
    sequence: 1,
    bookingId: fixtureIds.bookingOne,
    personId: fixtureIds.personOne,
    displayName: "Synthetic Person Alpha"
  } as const;

  switch (scenario) {
    case "valid-empty":
    case "source-failure":
    case "parser-failure":
      return [];
    case "recent-release":
      return [createRow({ ...base, custodyScope: "recent_release" })];
    case "multiple-charges":
      return [
        createRow({
          ...base,
          chargeDescriptions: [
            "Synthetic first charge description",
            "Synthetic second charge description"
          ]
        })
      ];
    case "multiple-bonds":
      return [
        createRow({
          ...base,
          bonds: [
            { state: "monetary", amountMinor: 125_000 },
            { state: "monetary", amountMinor: 50_000 }
          ]
        })
      ];
    case "bond-states":
      return [
        createRow({ ...base, bonds: [{ state: "monetary", amountMinor: 125_000 }] }),
        createRow({
          sequence: 2,
          bookingId: fixtureIds.bookingTwo,
          personId: fixtureIds.personTwo,
          displayName: "Synthetic Person Beta",
          bonds: [{ state: "no_bond" }]
        }),
        createRow({
          sequence: 3,
          bookingId: fixtureIds.bookingThree,
          personId: fixtureIds.personThree,
          displayName: "Synthetic Person Gamma",
          bonds: [{ state: "not_published" }]
        }),
        createRow({
          sequence: 4,
          bookingId: fixtureIds.bookingFour,
          personId: fixtureIds.personFour,
          displayName: "Synthetic Person Delta",
          bonds: [{ state: "unknown" }]
        }),
        createRow({
          sequence: 5,
          bookingId: fixtureIds.bookingFive,
          personId: fixtureIds.personFive,
          displayName: "Synthetic Person Epsilon",
          bonds: [{ state: "not_applicable" }]
        })
      ];
    case "current-custody":
    case "stale-source":
      return [createRow(base)];
  }
}

function failure(
  context: AdapterContext,
  stage: FailureClassification["stage"],
  classification: FailureClassification["classification"],
  diagnosticCode: string,
  publicMessage: string,
  retryable: boolean
): FailureClassification {
  return {
    stage,
    classification,
    diagnosticCode,
    publicMessage,
    retryable,
    occurredAt: context.requestedAt
  };
}

function snapshotIdForScenario(scenario: SyntheticScenario): string {
  const index = [
    "current-custody",
    "recent-release",
    "multiple-charges",
    "multiple-bonds",
    "bond-states",
    "valid-empty",
    "stale-source",
    "source-failure",
    "parser-failure"
  ].indexOf(scenario);
  return `40000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`;
}

export function createSyntheticScottCountyAdapter(
  scenario: SyntheticScenario
): SourceAdapter<unknown, SyntheticPayload, SyntheticPayload> {
  return {
    key: SYNTHETIC_SCOTT_ADAPTER_ID,
    adapterVersion: "1.0.0-synthetic",
    parserVersion: "1.0.0-synthetic",

    fetch(context): Promise<FetchResult<unknown>> {
      if (scenario === "source-failure") {
        return Promise.resolve({
          ok: false,
          failure: failure(
            context,
            "fetch",
            "network",
            "SYNTHETIC_FETCH_FAILURE",
            "The synthetic source request failed.",
            true
          )
        });
      }
      return Promise.resolve({
        ok: true,
        value: {
          scenario,
          rows: rowsForScenario(scenario),
          stale: scenario === "stale-source"
        }
      });
    },

    validate(payload, context): Promise<ValidationResult<SyntheticPayload>> {
      const result = SyntheticPayloadSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : {
              ok: false,
              failure: failure(
                context,
                "validate",
                "validation",
                "SYNTHETIC_VALIDATION_FAILURE",
                "The synthetic fixture did not match its schema.",
                false
              )
            }
      );
    },

    parse(payload, context): Promise<ParseResult<SyntheticPayload>> {
      if (scenario === "parser-failure") {
        return Promise.resolve({
          ok: false,
          failure: failure(
            context,
            "parse",
            "parser",
            "SYNTHETIC_PARSER_FAILURE",
            "The synthetic parser failed.",
            false
          )
        });
      }
      return Promise.resolve({ ok: true, value: payload });
    },

    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.rows.length === 0
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: "The approved synthetic fixture explicitly represents a valid empty roster."
            }
          : { kind: "not_empty", recordCount: payload.rows.length }
      );
    },

    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      const snapshotId = snapshotIdForScenario(scenario);
      const bookings: Booking[] = payload.rows.map((row) => ({
        ...row,
        snapshotId,
        person: { ...row.person, snapshotId }
      }));
      const scope = bookings[0]?.custodyScope ?? "current_custody";
      const candidate: NormalizedCustodySnapshot = {
        id: snapshotId,
        sourceId: context.source.id,
        ingestRunId: context.runId,
        capturedAt: context.requestedAt,
        sourceLastUpdatedAt: payload.stale ? "2020-01-01T00:00:00.000Z" : context.requestedAt,
        custodyScope: scope,
        recordCount: bookings.length,
        validEmptyResult: emptyResult.kind === "valid_empty",
        stale: payload.stale,
        expiresAt: null,
        bookings
      };
      const result = NormalizedCustodySnapshotSchema.safeParse(candidate);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : {
              ok: false,
              failure: failure(
                context,
                "normalize",
                "normalization",
                "SYNTHETIC_NORMALIZATION_FAILURE",
                "The synthetic fixture could not be normalized.",
                false
              )
            }
      );
    },

    healthCheck(context): Promise<SourceHealth> {
      if (scenario === "source-failure") {
        return Promise.resolve({
          status: "unavailable",
          checkedAt: context.requestedAt,
          latencyMs: 0,
          failure: failure(
            context,
            "health_check",
            "network",
            "SYNTHETIC_HEALTH_FAILURE",
            "The synthetic source health check failed.",
            true
          )
        });
      }
      return Promise.resolve({
        status: scenario === "stale-source" ? "stale" : "healthy",
        checkedAt: context.requestedAt,
        latencyMs: 0,
        failure: null
      });
    },

    classifyFailure(error, stage, context): FailureClassification {
      const diagnosticCode = error instanceof Error ? error.name.toUpperCase() : "UNKNOWN_ERROR";
      return failure(
        context,
        stage,
        "unknown",
        `SYNTHETIC_${diagnosticCode}`.slice(0, 100),
        "The synthetic adapter encountered an unexpected failure.",
        false
      );
    }
  };
}
