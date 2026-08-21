import { describe, expect, it, vi } from "vitest";

import { readWorkerConfig } from "./config.ts";
import {
  SYNTHETIC_SCOTT_ADAPTER_ID,
  SYNTHETIC_SCOTT_SOURCE_ID,
  type SyntheticScenario
} from "./execution-guard.ts";
import { executeSyntheticScottCountyDryRun } from "./job-runner.ts";
import { createStructuredLogger } from "./logger.ts";

const fixedNow = () => new Date("2026-01-04T12:00:00.000Z");
const fixedIds = [
  "50000000-0000-4000-8000-000000000001",
  "50000000-0000-4000-8000-000000000002"
] as const;

function request(scenario: SyntheticScenario) {
  return {
    adapterId: SYNTHETIC_SCOTT_ADAPTER_ID,
    sourceId: SYNTHETIC_SCOTT_SOURCE_ID,
    scenario,
    dryRun: true
  } as const;
}

async function run(scenario: SyntheticScenario) {
  let idIndex = 0;
  return executeSyntheticScottCountyDryRun(
    readWorkerConfig({ NODE_ENV: "test" }),
    request(scenario),
    {
      now: fixedNow,
      createId: () => fixedIds[idIndex++] ?? fixedIds[1],
      logger: createStructuredLogger({ minimumLevel: "error", write: () => undefined })
    }
  );
}

describe("executeSyntheticScottCountyDryRun", () => {
  it("normalizes current custody through the shared adapter runner without persistence", async () => {
    const execution = await run("current-custody");

    expect(execution.summary).toMatchObject({
      ok: true,
      dryRun: true,
      outcome: "succeeded_with_records",
      recordCount: 1,
      validEmptyResult: false,
      stale: false
    });
    expect(execution.source.publicationApproved).toBe(false);
    expect(execution.source.sourceStatus).toBe("disabled");
  });

  it("does not make a network request", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network access must remain disabled"));
    try {
      const execution = await run("current-custody");
      expect(execution.summary.ok).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("keeps a valid empty roster distinct from failure", async () => {
    const execution = await run("valid-empty");

    expect(execution.summary).toMatchObject({
      ok: true,
      outcome: "succeeded_empty",
      recordCount: 0,
      validEmptyResult: true
    });
    expect(execution.adapterResult.ok && execution.adapterResult.emptyResult.kind).toBe(
      "valid_empty"
    );
  });

  it("keeps fetch and parser failures distinct", async () => {
    const [fetchFailure, parserFailure] = await Promise.all([
      run("source-failure"),
      run("parser-failure")
    ]);

    expect(fetchFailure.summary).toMatchObject({ ok: false, outcome: "fetch_failed" });
    expect(parserFailure.summary).toMatchObject({ ok: false, outcome: "parser_failed" });
  });

  it("keeps recent release separate from current custody", async () => {
    const execution = await run("recent-release");
    expect(execution.adapterResult.ok).toBe(true);
    if (!execution.adapterResult.ok) return;

    expect(execution.adapterResult.snapshot.custodyScope).toBe("recent_release");
    expect(execution.adapterResult.snapshot.bookings[0]?.releasedAt).not.toBeNull();
  });

  it("retains multiple charges on their booking", async () => {
    const execution = await run("multiple-charges");
    if (!execution.adapterResult.ok) throw new Error("Expected successful synthetic execution");
    const booking = execution.adapterResult.snapshot.bookings[0];

    expect(booking?.charges).toHaveLength(2);
    expect(booking?.charges.every((charge) => charge.bookingId === booking.id)).toBe(true);
  });

  it("retains multiple bond entries and preserves each explicit bond state", async () => {
    const [multiple, states] = await Promise.all([run("multiple-bonds"), run("bond-states")]);
    if (!multiple.adapterResult.ok || !states.adapterResult.ok) {
      throw new Error("Expected successful synthetic executions");
    }

    expect(multiple.adapterResult.snapshot.bookings[0]?.bondEntries).toHaveLength(2);
    expect(
      states.adapterResult.snapshot.bookings.map((booking) => booking.bondEntries[0]?.state)
    ).toEqual(["monetary", "no_bond", "not_published", "unknown", "not_applicable"]);
  });

  it("marks stale source results without converting them to failure", async () => {
    const execution = await run("stale-source");
    expect(execution.summary).toMatchObject({ ok: true, health: "stale", stale: true });
  });
});
