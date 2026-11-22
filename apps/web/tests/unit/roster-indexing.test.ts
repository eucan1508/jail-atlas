import { describe, expect, it } from "vitest";
import { isIndexableRosterStatus } from "@/lib/roster-indexing";

const capturedAt = new Date("2026-11-16T12:00:00Z");
const live = (recordCount: number) =>
  ({
    kind: "live",
    source: {
      sourceId: "10000000-0000-4000-8000-000000000001",
      state: "oklahoma",
      sourceUrl: "https://example.test/roster",
      snapshotId: "20000000-0000-4000-8000-000000000001",
      capturedAt,
      recordCount
    }
  }) as const;

describe("county page indexing", () => {
  it("indexes a county only while it shows a current roster with people on it", () => {
    expect(isIndexableRosterStatus(live(118))).toBe(true);
  });

  it("drops a paused county, an empty roster, and a missing source from the index", () => {
    expect(isIndexableRosterStatus({ kind: "paused", lastCapturedAt: capturedAt })).toBe(false);
    expect(isIndexableRosterStatus(live(0))).toBe(false);
    expect(isIndexableRosterStatus(null)).toBe(false);
  });

  it("keeps a county indexed while the database cannot be reached", () => {
    expect(isIndexableRosterStatus({ kind: "unavailable" })).toBe(true);
  });
});
