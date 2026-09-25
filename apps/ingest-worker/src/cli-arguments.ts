import { z } from "zod";

import {
  SYNTHETIC_SCOTT_ADAPTER_ID,
  SYNTHETIC_SCOTT_SOURCE_ID,
  SyntheticScenarioSchema,
  type ExecutionRequest
} from "./execution-guard.ts";

const CliCommandSchema = z.literal("run");

export const LiveExecutionRequestSchema = z.object({
  dryRun: z.boolean()
});
export type LiveExecutionRequest = z.infer<typeof LiveExecutionRequestSchema>;

export class CliArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliArgumentError";
  }
}

export function parseCliArguments(arguments_: readonly string[]): ExecutionRequest {
  const [command, ...flags] = arguments_;
  const commandResult = CliCommandSchema.safeParse(command);
  if (!commandResult.success) {
    throw new CliArgumentError("Expected command: run");
  }

  let scenario: string | undefined;
  let dryRun = false;
  for (const flag of flags) {
    if (flag === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (flag.startsWith("--scenario=")) {
      if (scenario !== undefined)
        throw new CliArgumentError("--scenario may be provided only once");
      scenario = flag.slice("--scenario=".length);
      continue;
    }
    throw new CliArgumentError(`Unknown argument: ${flag}`);
  }

  if (!dryRun) throw new CliArgumentError("Phase 1 requires --dry-run");
  const scenarioResult = SyntheticScenarioSchema.safeParse(scenario);
  if (!scenarioResult.success) {
    throw new CliArgumentError("A supported synthetic --scenario value is required");
  }

  return {
    adapterId: SYNTHETIC_SCOTT_ADAPTER_ID,
    sourceId: SYNTHETIC_SCOTT_SOURCE_ID,
    scenario: scenarioResult.data,
    dryRun: true
  };
}

export function parseLiveCliArguments(arguments_: readonly string[]): LiveExecutionRequest {
  const [command, ...flags] = arguments_;
  if (!CliCommandSchema.safeParse(command).success) {
    throw new CliArgumentError("Expected command: run");
  }
  let dryRun = false;
  for (const flag of flags) {
    if (flag === "--dry-run") {
      if (dryRun) throw new CliArgumentError("--dry-run may be provided only once");
      dryRun = true;
      continue;
    }
    throw new CliArgumentError(`Unknown argument: ${flag}`);
  }
  return LiveExecutionRequestSchema.parse({ dryRun });
}
