import { describe, expect, it } from "vitest";

import type { CountyIngestResult } from "./county-sequence.ts";
import type { LiveJobExecution } from "./live-job-runner.ts";
import { liveStateSucceeded } from "./live-state-runner.ts";

function result(ok: boolean, adapterOk: boolean): CountyIngestResult<LiveJobExecution> {
  return {
    ok,
    ...(ok
      ? {
          value: { result: { ok: adapterOk } }
        }
      : { error: new Error("failed") })
  } as unknown as CountyIngestResult<LiveJobExecution>;
}

describe("liveStateSucceeded", () => {
  it("requires every county task and adapter result to succeed", () => {
    expect(liveStateSucceeded([result(true, true), result(true, true)])).toBe(true);
    expect(liveStateSucceeded([result(true, true), result(true, false)])).toBe(false);
    expect(liveStateSucceeded([result(false, false)])).toBe(false);
    expect(liveStateSucceeded([])).toBe(false);
  });
});
