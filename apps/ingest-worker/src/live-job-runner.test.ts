import { describe, expect, it } from "vitest";

import type { AdapterExecutionResult } from "@jail-atlas/source-adapters";

import { rejectSuddenDrop } from "./live-job-runner.ts";

const REQUESTED_AT = "2000-01-01T12:00:00.000Z";

function run(recordCount: number): AdapterExecutionResult {
  return {
    ok: true,
    snapshot: { recordCount } as never,
    emptyResult:
      recordCount === 0
        ? { kind: "valid_empty", recordCount: 0, evidence: "Synthetic empty roster." }
        : { kind: "not_empty", recordCount }
  } as AdapterExecutionResult;
}

describe("rejectSuddenDrop", () => {
  it("refuses a roster that suddenly lists nobody or a small fraction of the last count", () => {
    for (const [current, previous] of [
      [0, 81],
      [1, 111],
      [24, 100]
    ] as const) {
      const result = rejectSuddenDrop(run(current), previous, REQUESTED_AT);
      expect(result.ok, `${current} after ${previous}`).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe("ROSTER_SUDDENLY_SHRANK");
    }
  });

  it("keeps ordinary changes and rosters for jails that were already empty or nearly so", () => {
    for (const [current, previous] of [
      [0, null],
      [0, 0],
      [0, 4],
      [25, 100],
      [79, 81],
      [130, 120]
    ] as const) {
      expect(rejectSuddenDrop(run(current), previous, REQUESTED_AT).ok).toBe(true);
    }
  });
});
