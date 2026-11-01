import { describe, expect, it } from "vitest";

import type { OfficialSource } from "@jail-atlas/domain";

import type { WorkerConfig } from "./config.ts";
import type { CountyIngestResult } from "./county-sequence.ts";
import { createLiveSourceAdapter, type LiveJobExecution } from "./live-job-runner.ts";
import { liveStateSources, liveStateSucceeded } from "./live-state-runner.ts";

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

describe("live state sources", () => {
  it("names an adapter the live job runner can build for every county", () => {
    const states = ["IA", "MN", "TX", "AR", "OK", "MO"] as const;
    for (const state of states) {
      for (const source of liveStateSources(state)) {
        const adapter = createLiveSourceAdapter(
          {
            id: "00000000-0000-4000-8000-000000000001",
            officialInstitutionId: "00000000-0000-4000-8000-000000000002",
            sourceUrl: `https://${source.sourceHost}/`,
            adapterKey: source.adapterKey
          } as OfficialSource,
          "00000000-0000-4000-8000-000000000003",
          { sourceHostAllowlist: [source.sourceHost] } as unknown as WorkerConfig,
          () => "00000000-0000-4000-8000-000000000004"
        );
        expect(adapter.key, `${state}/${source.countySlug}`).toBe(source.adapterKey);
      }
    }
  });
});
