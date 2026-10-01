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
  "texas/milam-county",
  "texas/hutchinson-county",
  "texas/kendall-county"
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
    }
  });
});
