import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { execute, transaction } = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn()
}));
vi.mock("server-only", () => ({}));
// The live module needs the real tagged SQL template while its pool is mocked.
vi.mock("@jail-atlas/database", async (importOriginal) => ({
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...(await importOriginal<typeof import("@jail-atlas/database")>()),
  createDatabase: () => ({ db: { execute, transaction } })
}));

const sourceId = "10000000-0000-4000-8000-000000000001";
const snapshotId = "20000000-0000-4000-8000-000000000001";
const now = new Date("2026-09-26T00:00:00Z");
function source(overrides = {}) {
  return {
    source_id: sourceId,
    source_url: "https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True",
    adapter_key: "dallas-newworld-inmate-inquiry",
    snapshot_id: snapshotId,
    captured_at: "2026-09-25T23:00:00Z",
    record_count: 84,
    valid_empty_result: false,
    stale: false,
    expires_at: null,
    ...overrides
  };
}
function booking(index: number) {
  return {
    record_key: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    display_name: "SYNTHETIC TEST RECORD",
    source_order: index,
    booking_identifier_value: null,
    source_identifies_as_booking_identifier: false,
    booked_at: null,
    charges: [{ description: "SYNTHETIC CHARGE", sourceLabel: "Charge", statuteCode: null }]
  };
}
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("DATA_MODE", "official");
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost/test");
  transaction.mockImplementation((callback) => callback({ execute }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("live roster publication", () => {
  it("maps PostgreSQL column names and dates into a usable county source", async () => {
    const { getLiveCountySource } = await import("@/lib/live-roster");
    const { findCountyCoverage } = await import("@/lib/coverage-catalog");
    execute.mockResolvedValueOnce({ rows: [source()] });
    const entry = findCountyCoverage("iowa", "dallas-county")!;
    expect(await getLiveCountySource(entry)).toEqual({
      sourceId,
      snapshotId,
      sourceUrl: source().source_url,
      capturedAt: new Date(source().captured_at),
      recordCount: 84
    });
  });

  it.each([
    { captured_at: "2026-09-24T00:00:00Z" },
    { captured_at: "2026-09-27T00:00:00Z" },
    { stale: true },
    { expires_at: "2026-09-25T23:59:59Z" },
    { record_count: 0, valid_empty_result: false },
    { source_url: "https://unapproved.example/roster" }
  ])("withholds unusable snapshots: %j", async (overrides) => {
    const { getLiveCountySource } = await import("@/lib/live-roster");
    const { findCountyCoverage } = await import("@/lib/coverage-catalog");
    execute.mockResolvedValueOnce({ rows: [source(overrides)] });
    expect(await getLiveCountySource(findCountyCoverage("iowa", "dallas-county")!)).toBeNull();
  });

  it("keeps the same total across four pages and binds cursors to the snapshot", async () => {
    const { getLiveRosterPage } = await import("@/lib/live-roster");
    const { decodeRosterCursor } = await import("@/lib/roster");
    let cursor: string | undefined;
    for (const start of [0, 25, 50, 75]) {
      execute.mockResolvedValueOnce({ rows: [source()] });
      execute.mockResolvedValueOnce({
        rows: Array.from({ length: Math.min(26, 84 - start) }, (_, index) => booking(start + index))
      });
      const page = await getLiveRosterPage({ sourceId, ...(cursor ? { cursor } : {}) });
      expect(page.total).toBe(84);
      expect(page.records).toHaveLength(Math.min(25, 84 - start));
      expect(page.endOfResults).toBe(start === 75);
      expect(page.records[0]).not.toHaveProperty("bonds");
      cursor = page.nextCursor ?? undefined;
      if (cursor) expect(decodeRosterCursor(cursor, sourceId).snapshotId).toBe(snapshotId);
    }
    expect(cursor).toBeUndefined();
  });

  it("rejects a continuation after a new snapshot replaces the old one", async () => {
    const { getLiveRosterPage } = await import("@/lib/live-roster");
    const { encodeRosterCursor, InvalidCursorError } = await import("@/lib/roster");
    const cursor = encodeRosterCursor({
      version: 1,
      sourceId,
      snapshotId,
      afterId: booking(24).record_key,
      afterSourceOrder: 24
    });
    execute.mockResolvedValueOnce({
      rows: [
        source({
          snapshot_id: "20000000-0000-4000-8000-000000000002"
        })
      ]
    });
    await expect(getLiveRosterPage({ sourceId, cursor })).rejects.toBeInstanceOf(
      InvalidCursorError
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a validated empty snapshot from missing data", async () => {
    const { getLiveRosterPage, RosterUnavailableError } = await import("@/lib/live-roster");
    execute.mockResolvedValueOnce({ rows: [] });
    await expect(getLiveRosterPage({ sourceId })).rejects.toBeInstanceOf(RosterUnavailableError);
    execute.mockResolvedValueOnce({
      rows: [source({ record_count: 0, valid_empty_result: true })]
    });
    execute.mockResolvedValueOnce({ rows: [] });
    expect(await getLiveRosterPage({ sourceId })).toEqual({
      records: [],
      total: 0,
      endOfResults: true,
      nextCursor: null
    });
  });
});
