import { describe, expect, it } from "vitest";

import { countyCoverageCatalog } from "../../src/lib/coverage-catalog";
import { findCountyGuide } from "../../src/lib/county-guides";
import { countySearchDescription, countySearchTitle } from "../../src/lib/county-search-snippet";

describe("county search snippets", () => {
  it("fits every county title and description within search result limits", () => {
    for (const entry of countyCoverageCatalog) {
      const profile = findCountyGuide(entry.state, entry.slug);
      expect(countySearchTitle(entry).length, entry.slug).toBeLessThanOrEqual(60);
      for (const recordCount of [null, 0, 1, 999]) {
        expect(
          countySearchDescription({ entry, profile, recordCount }).length,
          `${entry.slug} ${recordCount}`
        ).toBeLessThanOrEqual(160);
      }
    }
  });

  it("names the state, counts the roster, and adds the Texas jail log wording", () => {
    const milam = countyCoverageCatalog.find((entry) => entry.slug === "milam-county")!;
    expect(countySearchTitle(milam)).toBe(
      "Milam County Jail Roster (TX) – Current Inmates & Jail Log"
    );
    const douglas = countyCoverageCatalog.find(
      (entry) => entry.state === "minnesota" && entry.slug === "douglas-county"
    )!;
    expect(countySearchTitle(douglas)).toBe("Douglas County Jail Roster (MN) – Current Inmates");
    expect(
      countySearchDescription({
        entry: milam,
        profile: findCountyGuide(milam.state, milam.slug),
        recordCount: 1
      })
    ).toMatch(/^1 person in custody at .+, Cameron, TX\. Updated twice daily/);
  });
});
