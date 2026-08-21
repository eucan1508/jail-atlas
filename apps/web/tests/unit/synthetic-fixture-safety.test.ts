import { describe, expect, it } from "vitest";
import {
  assertSyntheticFixtureSafety,
  SYNTHETIC_FIXTURE_MARKER,
  syntheticScottCountyFixture
} from "@jail-atlas/test-fixtures";

describe("web synthetic-data boundary", () => {
  it("rejects publication and carries explicit fictional-data sentinels", () => {
    expect(assertSyntheticFixtureSafety(syntheticScottCountyFixture)).toBe(true);
    expect(syntheticScottCountyFixture.fixtureKind).toBe("synthetic");
    expect(syntheticScottCountyFixture.fixtureMarker).toBe(SYNTHETIC_FIXTURE_MARKER);
    expect(syntheticScottCountyFixture.publicationAllowed).toBe(false);
    expect(syntheticScottCountyFixture.source.publicationApproved).toBe(false);
  });

  it("contains no unmarked person display records or personal-data fields", () => {
    const bookings = [
      ...syntheticScottCountyFixture.currentCustody.bookings,
      ...syntheticScottCountyFixture.recentRelease.bookings
    ];

    for (const booking of bookings) {
      expect(booking.person.displayName).toMatch(/^SYNTHETIC .+TEST ONLY$/);
      if (booking.bookingIdentifier) {
        expect(booking.bookingIdentifier.value).toMatch(/^SYNTHETIC-BOOKING-/);
      }
    }

    const serialized = JSON.stringify(syntheticScottCountyFixture);
    for (const forbiddenField of [
      '"dateOfBirth"',
      '"birthDate"',
      '"homeAddress"',
      '"phoneNumber"',
      '"personalEmail"',
      '"mugshot"'
    ]) {
      expect(serialized).not.toContain(forbiddenField);
    }
  });
});
