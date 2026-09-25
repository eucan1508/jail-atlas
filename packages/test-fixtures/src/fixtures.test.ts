import { describe, expect, it } from "vitest";

import {
  assertSyntheticDallasSourceFixtureSafety,
  assertSyntheticFixtureSafety,
  syntheticDallasSourceHtmlFixture,
  syntheticFetchFailure,
  syntheticParserFailure,
  syntheticScottCountyFixture,
  syntheticValidEmptyAvailability
} from "./index.js";

describe("synthetic fixture contract", () => {
  it("keeps Dallas source HTML fixtures fictional and publication-disabled", () => {
    expect(assertSyntheticDallasSourceFixtureSafety(syntheticDallasSourceHtmlFixture)).toBe(true);
    expect(syntheticDallasSourceHtmlFixture.publicationAllowed).toBe(false);
  });

  it("contains 52 clearly synthetic current-custody records", () => {
    expect(syntheticScottCountyFixture.currentCustody.bookings).toHaveLength(52);
    expect(assertSyntheticFixtureSafety(syntheticScottCountyFixture)).toBe(true);
  });

  it("exercises multiple charges and multiple independent bond entries", () => {
    const first = syntheticScottCountyFixture.currentCustody.bookings[0];
    expect(first?.charges).toHaveLength(2);
    expect(first?.bondEntries).toHaveLength(2);
    expect(first?.bondEntries.map((entry) => entry.state)).toEqual(["monetary", "no_bond"]);
  });

  it("keeps no bond distinct from source-missing bond information", () => {
    const states = syntheticScottCountyFixture.currentCustody.bookings.flatMap((booking) =>
      booking.bondEntries.map((entry) => entry.state)
    );
    expect(states).toContain("no_bond");
    expect(states).toContain("not_published");
    expect(states).toContain("unknown");
  });

  it("keeps current custody distinct from recent releases", () => {
    expect(
      syntheticScottCountyFixture.currentCustody.bookings.every(
        (booking) => booking.custodyScope === "current_custody"
      )
    ).toBe(true);
    expect(
      syntheticScottCountyFixture.recentRelease.bookings.every(
        (booking) => booking.custodyScope === "recent_release" && booking.releasedAt !== null
      )
    ).toBe(true);
  });

  it("keeps a valid empty result separate from fetch and parser failures", () => {
    expect(syntheticValidEmptyAvailability.state).toBe("valid_empty");
    expect(syntheticFetchFailure.state).toBe("fetch_failed");
    expect(syntheticParserFailure.state).toBe("parser_failed");
  });
});
