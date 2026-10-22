import { describe, expect, it } from "vitest";

import type { AdapterExecutionResult } from "@jail-atlas/source-adapters";

import { rejectSuddenEmpty } from "./live-job-runner.ts";

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

describe("rejectSuddenEmpty", () => {
  it("refuses an empty roster right after one that listed people", () => {
    const result = rejectSuddenEmpty(run(0), 81, REQUESTED_AT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ROSTER_SUDDENLY_EMPTY");
  });

  it("keeps an empty roster for a jail that was already empty or nearly so", () => {
    for (const previous of [null, 0, 4]) {
      expect(rejectSuddenEmpty(run(0), previous, REQUESTED_AT).ok).toBe(true);
    }
  });

  it("leaves rosters that list people alone", () => {
    const listed = run(12);
    expect(rejectSuddenEmpty(listed, 81, REQUESTED_AT)).toBe(listed);
  });
});
