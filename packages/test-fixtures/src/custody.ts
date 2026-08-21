import {
  BookingSchema,
  CustodyAvailabilitySchema,
  CustodySnapshotSchema,
  type BondEntry,
  type Booking,
  type Charge
} from "@jail-atlas/domain";

import { SYNTHETIC_FIXTURE_TIME } from "./geography.js";
import { syntheticId, syntheticIds } from "./ids.js";

function currentBooking(index: number): Booking {
  const ordinal = index + 1;
  const base = 1_000 + index * 10;
  const bookingId = syntheticId(base);
  const chargeCount = index === 0 ? 2 : 1;
  const charges: Charge[] = Array.from({ length: chargeCount }, (_, chargeIndex) => ({
    id: syntheticId(base + 2 + chargeIndex),
    bookingId,
    sequence: chargeIndex,
    description:
      chargeIndex === 0
        ? `SYNTHETIC CHARGE ALPHA ${String(ordinal).padStart(3, "0")} — TEST ONLY`
        : `SYNTHETIC CHARGE BETA ${String(ordinal).padStart(3, "0")} — TEST ONLY`,
    sourceLabel: "Synthetic charge description",
    statuteCode: null,
    disposition: null
  }));

  const commonBond = {
    bookingId,
    sourceLabel: "Synthetic bond information",
    note: "TEST DATA ONLY"
  };
  let bondEntries: BondEntry[];
  if (index === 0) {
    bondEntries = [
      {
        ...commonBond,
        id: syntheticId(base + 5),
        sequence: 0,
        state: "monetary",
        amountMinor: 12_345,
        currency: "USD"
      },
      {
        ...commonBond,
        id: syntheticId(base + 6),
        sequence: 1,
        state: "no_bond"
      }
    ];
  } else {
    const state = ["not_published", "unknown", "not_applicable", "no_bond", "monetary"][
      index % 5
    ] as BondEntry["state"];
    bondEntries =
      state === "monetary"
        ? [
            {
              ...commonBond,
              id: syntheticId(base + 5),
              sequence: 0,
              state,
              amountMinor: 10_000 + index,
              currency: "USD"
            }
          ]
        : [
            {
              ...commonBond,
              id: syntheticId(base + 5),
              sequence: 0,
              state
            }
          ];
  }

  return BookingSchema.parse({
    id: bookingId,
    snapshotId: syntheticIds.currentSnapshot,
    person: {
      id: syntheticId(base + 1),
      snapshotId: syntheticIds.currentSnapshot,
      displayName: `SYNTHETIC PERSON ${String(ordinal).padStart(3, "0")} — TEST ONLY`,
      sourceDisplayText: `SYNTHETIC PERSON ${String(ordinal).padStart(3, "0")} — TEST ONLY`
    },
    bookingIdentifier: {
      value: `SYNTHETIC-BOOKING-${String(ordinal).padStart(3, "0")}`,
      sourceLabel: "Synthetic booking identifier",
      sourceIdentifiesAsBookingIdentifier: true
    },
    custodyScope: "current_custody",
    bookedAt: `2000-01-${String((index % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
    releasedAt: null,
    facilityId: syntheticIds.facility,
    charges,
    bondEntries,
    sourceOrder: index
  });
}

export const syntheticCurrentCustodyBookings = Object.freeze(
  Array.from({ length: 52 }, (_, index) => currentBooking(index))
);

export const syntheticCurrentCustodySnapshot = CustodySnapshotSchema.parse({
  id: syntheticIds.currentSnapshot,
  sourceId: syntheticIds.source,
  ingestRunId: syntheticIds.currentRun,
  capturedAt: SYNTHETIC_FIXTURE_TIME,
  sourceLastUpdatedAt: "2000-01-01T11:59:00.000Z",
  custodyScope: "current_custody",
  recordCount: syntheticCurrentCustodyBookings.length,
  validEmptyResult: false,
  stale: false,
  expiresAt: "2000-01-01T12:15:00.000Z",
  bookings: syntheticCurrentCustodyBookings
});

function releasedBooking(index: number): Booking {
  const ordinal = index + 1;
  const base = 3_000 + index * 10;
  const bookingId = syntheticId(base);
  return BookingSchema.parse({
    id: bookingId,
    snapshotId: syntheticIds.releaseSnapshot,
    person: {
      id: syntheticId(base + 1),
      snapshotId: syntheticIds.releaseSnapshot,
      displayName: `SYNTHETIC RELEASE PERSON ${String(ordinal).padStart(3, "0")} — TEST ONLY`,
      sourceDisplayText: `SYNTHETIC RELEASE PERSON ${String(ordinal).padStart(3, "0")} — TEST ONLY`
    },
    bookingIdentifier: null,
    custodyScope: "recent_release",
    bookedAt: "1999-12-30T08:00:00.000Z",
    releasedAt: `2000-01-01T${String(10 + index).padStart(2, "0")}:00:00.000Z`,
    facilityId: syntheticIds.facility,
    charges: [
      {
        id: syntheticId(base + 2),
        bookingId,
        sequence: 0,
        description: `SYNTHETIC RELEASE CHARGE ${String(ordinal).padStart(3, "0")} — TEST ONLY`,
        sourceLabel: "Synthetic charge description",
        statuteCode: null,
        disposition: null
      }
    ],
    bondEntries: [
      {
        id: syntheticId(base + 3),
        bookingId,
        sequence: 0,
        state: "not_applicable",
        sourceLabel: "Synthetic released-record bond state",
        note: "TEST DATA ONLY"
      }
    ],
    sourceOrder: index
  });
}

export const syntheticRecentReleaseSnapshot = CustodySnapshotSchema.parse({
  id: syntheticIds.releaseSnapshot,
  sourceId: syntheticIds.source,
  ingestRunId: syntheticIds.releaseRun,
  capturedAt: SYNTHETIC_FIXTURE_TIME,
  sourceLastUpdatedAt: "2000-01-01T11:59:00.000Z",
  custodyScope: "recent_release",
  recordCount: 2,
  validEmptyResult: false,
  stale: false,
  expiresAt: "2000-01-03T12:00:00.000Z",
  bookings: [releasedBooking(0), releasedBooking(1)]
});

export const syntheticValidEmptySnapshot = CustodySnapshotSchema.parse({
  id: syntheticIds.emptySnapshot,
  sourceId: syntheticIds.source,
  ingestRunId: syntheticIds.emptyRun,
  capturedAt: SYNTHETIC_FIXTURE_TIME,
  sourceLastUpdatedAt: SYNTHETIC_FIXTURE_TIME,
  custodyScope: "current_custody",
  recordCount: 0,
  validEmptyResult: true,
  stale: false,
  expiresAt: "2000-01-01T12:15:00.000Z",
  bookings: []
});

export const syntheticStaleSnapshot = CustodySnapshotSchema.parse({
  ...syntheticCurrentCustodySnapshot,
  stale: true,
  expiresAt: "2000-01-01T11:00:00.000Z"
});

const baseFailure = {
  publicMessage: "The synthetic source could not be refreshed.",
  retryable: true,
  occurredAt: SYNTHETIC_FIXTURE_TIME
};

export const syntheticValidEmptyAvailability = CustodyAvailabilitySchema.parse({
  state: "valid_empty",
  snapshot: syntheticValidEmptySnapshot
});

export const syntheticFetchFailure = CustodyAvailabilitySchema.parse({
  state: "fetch_failed",
  lastSuccessfulSnapshot: syntheticStaleSnapshot,
  failure: {
    ...baseFailure,
    classification: "network",
    diagnosticCode: "SYNTHETIC_FETCH_FAILURE"
  }
});

export const syntheticParserFailure = CustodyAvailabilitySchema.parse({
  state: "parser_failed",
  lastSuccessfulSnapshot: syntheticStaleSnapshot,
  failure: {
    ...baseFailure,
    classification: "parser",
    retryable: false,
    diagnosticCode: "SYNTHETIC_PARSER_FAILURE"
  }
});
