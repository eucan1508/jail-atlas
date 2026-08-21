import { describe, expect, it } from "vitest";

import {
  BondEntrySchema,
  BookingSchema,
  CustodyAvailabilitySchema,
  CustodySnapshotSchema
} from "./index.js";

const ids = {
  snapshot: "00000000-0000-4000-8000-000000000001",
  run: "00000000-0000-4000-8000-000000000002",
  source: "00000000-0000-4000-8000-000000000003",
  facility: "00000000-0000-4000-8000-000000000004",
  booking: "00000000-0000-4000-8000-000000000005",
  person: "00000000-0000-4000-8000-000000000006",
  chargeOne: "00000000-0000-4000-8000-000000000007",
  chargeTwo: "00000000-0000-4000-8000-000000000008",
  bondOne: "00000000-0000-4000-8000-000000000009",
  bondTwo: "00000000-0000-4000-8000-000000000010"
};

const currentBooking = {
  id: ids.booking,
  snapshotId: ids.snapshot,
  person: {
    id: ids.person,
    snapshotId: ids.snapshot,
    displayName: "SYNTHETIC PERSON 001",
    sourceDisplayText: "SYNTHETIC PERSON 001"
  },
  bookingIdentifier: {
    value: "SYNTHETIC-BOOKING-001",
    sourceLabel: "Synthetic booking identifier",
    sourceIdentifiesAsBookingIdentifier: true as const
  },
  custodyScope: "current_custody" as const,
  bookedAt: "2000-01-01T12:00:00.000Z",
  releasedAt: null,
  facilityId: ids.facility,
  charges: [
    {
      id: ids.chargeOne,
      bookingId: ids.booking,
      sequence: 0,
      description: "SYNTHETIC CHARGE ALPHA — TEST ONLY",
      sourceLabel: null,
      statuteCode: null,
      disposition: null
    },
    {
      id: ids.chargeTwo,
      bookingId: ids.booking,
      sequence: 1,
      description: "SYNTHETIC CHARGE BETA — TEST ONLY",
      sourceLabel: null,
      statuteCode: null,
      disposition: null
    }
  ],
  bondEntries: [
    {
      id: ids.bondOne,
      bookingId: ids.booking,
      sequence: 0,
      sourceLabel: "Synthetic monetary bond",
      note: null,
      state: "monetary" as const,
      amountMinor: 12_345,
      currency: "USD"
    },
    {
      id: ids.bondTwo,
      bookingId: ids.booking,
      sequence: 1,
      sourceLabel: "Synthetic no-bond statement",
      note: null,
      state: "no_bond" as const
    }
  ],
  sourceOrder: 0
};

describe("custody domain invariants", () => {
  it("keeps multiple charges and bond entries attached to their booking", () => {
    const parsed = BookingSchema.parse(currentBooking);
    expect(parsed.charges.map((charge) => charge.description)).toHaveLength(2);
    expect(parsed.bondEntries.map((bond) => bond.state)).toEqual(["monetary", "no_bond"]);
  });

  it("keeps an explicit no-bond state distinct from unpublished information", () => {
    const common = {
      id: ids.bondOne,
      bookingId: ids.booking,
      sequence: 0,
      sourceLabel: null,
      note: null
    };
    const noBond = BondEntrySchema.parse({ ...common, state: "no_bond" });
    const notPublished = BondEntrySchema.parse({
      ...common,
      state: "not_published"
    });
    expect(noBond.state).not.toBe(notPublished.state);
  });

  it("does not allow a missing bond value to become no bond", () => {
    expect(
      BondEntrySchema.safeParse({
        id: ids.bondOne,
        bookingId: ids.booking,
        sequence: 0,
        sourceLabel: null,
        note: null
      }).success
    ).toBe(false);
  });

  it("keeps current custody distinct from recent release", () => {
    expect(BookingSchema.safeParse(currentBooking).success).toBe(true);
    expect(
      BookingSchema.safeParse({
        ...currentBooking,
        custodyScope: "recent_release",
        releasedAt: null
      }).success
    ).toBe(false);
    expect(
      BookingSchema.safeParse({
        ...currentBooking,
        custodyScope: "recent_release",
        releasedAt: "2000-01-02T12:00:00.000Z"
      }).success
    ).toBe(true);
  });

  it("distinguishes a valid zero-result roster from fetch and parser failures", () => {
    const emptySnapshot = CustodySnapshotSchema.parse({
      id: ids.snapshot,
      sourceId: ids.source,
      ingestRunId: ids.run,
      capturedAt: "2000-01-01T12:00:00.000Z",
      sourceLastUpdatedAt: null,
      custodyScope: "current_custody",
      recordCount: 0,
      validEmptyResult: true,
      stale: false,
      expiresAt: null,
      bookings: []
    });
    const failure = {
      classification: "network" as const,
      publicMessage: "The synthetic source request failed.",
      retryable: true,
      occurredAt: "2000-01-01T12:00:00.000Z",
      diagnosticCode: "SYNTHETIC_FETCH_FAILURE"
    };
    expect(
      CustodyAvailabilitySchema.parse({
        state: "valid_empty",
        snapshot: emptySnapshot
      }).state
    ).toBe("valid_empty");
    expect(
      CustodyAvailabilitySchema.parse({
        state: "fetch_failed",
        lastSuccessfulSnapshot: null,
        failure
      }).state
    ).toBe("fetch_failed");
    expect(
      CustodyAvailabilitySchema.parse({
        state: "parser_failed",
        lastSuccessfulSnapshot: null,
        failure: {
          ...failure,
          classification: "parser",
          diagnosticCode: "SYNTHETIC_PARSER_FAILURE"
        }
      }).state
    ).toBe("parser_failed");
  });
});
