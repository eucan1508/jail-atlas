import { describe, expect, it } from "vitest";
import { countyGuideKeys, findCountyGuide } from "../../src/lib/county-guides";

const liveCountyKeys = [
  "iowa/dallas-county",
  "iowa/cedar-county",
  "iowa/black-hawk-county",
  "minnesota/mower-county",
  "minnesota/ramsey-county",
  "minnesota/stearns-county",
  "minnesota/anoka-county",
  "minnesota/wright-county",
  "minnesota/carlton-county",
  "minnesota/douglas-county",
  "minnesota/st-louis-county",
  "minnesota/steele-county",
  "minnesota/crow-wing-county",
  "minnesota/renville-county",
  "texas/milam-county",
  "texas/hutchinson-county",
  "texas/kendall-county",
  "texas/kleberg-county",
  "arkansas/jefferson-county",
  "arkansas/logan-county",
  "arkansas/greene-county",
  "arkansas/cleburne-county",
  "arkansas/faulkner-county",
  "arkansas/hot-spring-county",
  "arkansas/baxter-county",
  "arkansas/st-francis-county"
] as const;

describe("verified county guides", () => {
  it("provides complete local guidance for every live county adapter", () => {
    expect(countyGuideKeys.toSorted()).toEqual([...liveCountyKeys].toSorted());

    for (const key of liveCountyKeys) {
      const [state, county] = key.split("/") as [string, string];
      const profile = findCountyGuide(state, county);
      expect(profile, key).toBeDefined();
      expect(profile?.address, key).not.toHaveLength(0);
      expect(profile?.phone, key).not.toHaveLength(0);
      expect(profile?.operatedBy, key).not.toHaveLength(0);
      expect(profile?.sections, key).toHaveLength(4);
      for (const section of profile?.sections ?? []) {
        expect(section.sourceUrl, `${key}/${section.title}`).toMatch(/^https:\/\//);
      }

      const faq = profile?.faq ?? [];
      expect(faq.length, `${key} county FAQ`).toBeGreaterThanOrEqual(2);
      expect(new Set(faq.map((item) => item.question)).size, `${key} FAQ questions`).toBe(
        faq.length
      );
      for (const item of faq) {
        expect(item.question, key).toMatch(/\?$/);
        expect(item.answer, key).not.toHaveLength(0);
      }
    }
  });

  it("keeps web addresses out of reader-facing guide text", () => {
    for (const key of countyGuideKeys) {
      const [state, county] = key.split("/") as [string, string];
      const profile = findCountyGuide(state, county);
      const text = [
        profile?.overview,
        ...(profile?.sections ?? []).map((section) => section.body),
        ...(profile?.faq ?? []).flatMap((item) => [item.question, item.answer])
      ].join("\n");
      expect(text, key).not.toMatch(/https?:\/\/|www\./i);
    }
  });
});
