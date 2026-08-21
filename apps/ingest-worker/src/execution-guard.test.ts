import { describe, expect, it } from "vitest";

import { readWorkerConfig } from "./config.ts";
import {
  assertPhaseOneSyntheticExecution,
  PhaseOneGuardError,
  SYNTHETIC_SCOTT_ADAPTER_ID,
  SYNTHETIC_SCOTT_SOURCE_ID
} from "./execution-guard.ts";

const validRequest = {
  adapterId: SYNTHETIC_SCOTT_ADAPTER_ID,
  sourceId: SYNTHETIC_SCOTT_SOURCE_ID,
  scenario: "current-custody",
  dryRun: true
} as const;

describe("assertPhaseOneSyntheticExecution", () => {
  it("permits the single synthetic Scott County dry run", () => {
    expect(assertPhaseOneSyntheticExecution(readWorkerConfig({}), validRequest)).toEqual(
      validRequest
    );
  });

  it.each([
    [{ ...validRequest, adapterId: "live-scott-county-v1" }, "adapterId"],
    [{ ...validRequest, sourceId: "official:ia:scott-county" }, "sourceId"],
    [{ ...validRequest, dryRun: false }, "dryRun"],
    [{ ...validRequest, scenario: "unapproved-state" }, "scenario"]
  ])("rejects an unsafe execution request", (request, field) => {
    expect(() => assertPhaseOneSyntheticExecution(readWorkerConfig({}), request)).toThrow(
      PhaseOneGuardError
    );
    expect(() => assertPhaseOneSyntheticExecution(readWorkerConfig({}), request)).toThrow(field);
  });
});
