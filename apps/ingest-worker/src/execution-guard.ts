import { z } from "zod";

import type { WorkerConfig } from "./config.ts";

export const SYNTHETIC_SCOTT_ADAPTER_ID = "synthetic-scott-county-v1";
// A stable fixture UUID, deliberately unrelated to any live source identifier.
export const SYNTHETIC_SCOTT_SOURCE_ID = "00000000-0000-4000-8000-000000000005";

export const SyntheticScenarioSchema = z.enum([
  "current-custody",
  "recent-release",
  "multiple-charges",
  "multiple-bonds",
  "bond-states",
  "valid-empty",
  "stale-source",
  "source-failure",
  "parser-failure"
]);

export type SyntheticScenario = z.infer<typeof SyntheticScenarioSchema>;

export const ExecutionRequestSchema = z
  .object({
    adapterId: z.literal(SYNTHETIC_SCOTT_ADAPTER_ID),
    sourceId: z.literal(SYNTHETIC_SCOTT_SOURCE_ID),
    scenario: SyntheticScenarioSchema,
    dryRun: z.literal(true)
  })
  .strict();

export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

export class PhaseOneGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhaseOneGuardError";
  }
}

export function assertPhaseOneSyntheticExecution(
  config: WorkerConfig,
  value: unknown
): ExecutionRequest {
  if (
    config.ingestMode !== "synthetic" ||
    config.networkAccess !== "disabled" ||
    config.databaseWrites !== "disabled" ||
    config.allowLiveSourceFetches ||
    config.scottCountyLiveSourceEnabled
  ) {
    throw new PhaseOneGuardError(
      "Phase 1 permits synthetic, network-disabled, database-write-disabled execution only"
    );
  }

  const result = ExecutionRequestSchema.safeParse(value);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join(".") || "request"))
    ];
    throw new PhaseOneGuardError(
      `Rejected non-synthetic or non-dry-run execution request fields: ${fields.join(", ")}`
    );
  }

  return result.data;
}
