import { describe, expect, it } from "vitest";
import { findCountyCoverage } from "../../src/lib/coverage-catalog";
import { countyGuideKeys, findCountyGuide } from "../../src/lib/county-guides";
import {
  countyAnswerSummary,
  guidanceQuestion,
  reviewedDateIso
} from "../../src/lib/county-summary";

describe("county answer-first summary", () => {
  it("answers where the jail is, who runs it, how many people it holds, and how to reach it", () => {
    const entry = findCountyCoverage("minnesota", "wright-county");
    const profile = findCountyGuide("minnesota", "wright-county");
    if (!entry || !profile) throw new Error("Wright County fixture missing");

    const summary = countyAnswerSummary({
      entry,
      profile,
      recordCount: 184,
      capturedAt: new Date("2026-10-03T13:10:27Z")
    });

    expect(summary).toBe(
      "Wright County Jail is the county jail for Wright County, Minnesota, run by the Wright County Sheriff's Office in Buffalo. As of October 3, 2026, the official roster lists 184 people in custody. The jail is at 3800 Braddock Ave. NE, Buffalo, MN 55313; call 763-684-2381 to confirm visits, deposits, mail, and bail before you go."
    );
  });

  it("stays short enough to quote and omits the count when no roster is published", () => {
    for (const key of countyGuideKeys) {
      const [state, county] = key.split("/") as [string, string];
      const entry = findCountyCoverage(state, county);
      const profile = findCountyGuide(state, county);
      if (!entry || !profile) throw new Error(`Missing catalog entry for ${key}`);

      const live = countyAnswerSummary({
        entry,
        profile,
        recordCount: 1,
        capturedAt: new Date("2026-10-03T12:00:00Z")
      });
      expect(live.split(/\s+/).length, key).toBeLessThanOrEqual(80);
      expect(live, key).toContain("1 person in custody");

      const pending = countyAnswerSummary({ entry, profile, recordCount: null, capturedAt: null });
      expect(pending, key).not.toContain("in custody");
      expect(reviewedDateIso(profile.reviewedAt), key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("turns every guidance card title into a question", () => {
    for (const key of countyGuideKeys) {
      const [state, county] = key.split("/") as [string, string];
      const profile = findCountyGuide(state, county);
      for (const section of profile?.sections ?? []) {
        expect(guidanceQuestion(section.title, profile?.facilityName ?? ""), key).toMatch(/\?$/);
      }
    }
  });
});
