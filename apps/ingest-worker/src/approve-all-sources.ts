import { pathToFileURL } from "node:url";

import { approveSource } from "./approve-source.ts";
import { liveStateSources, type LiveState } from "./live-state-runner.ts";

const STATES: readonly LiveState[] = ["IA", "MN", "TX", "AR", "OK", "MO", "KS", "AL", "FL"];

/**
 * Approves every county in the live state lists, the same way the "Approve live source" workflow
 * approves one. Used to bring a freshly provisioned database up to the set of sources that were
 * already approved and live. Requires --confirm=APPROVE_ALL.
 */
export async function approveAllSources(
  arguments_: readonly string[] = process.argv.slice(2),
  environment: Record<string, string | undefined> = process.env
): Promise<number> {
  if (!arguments_.includes("--confirm=APPROVE_ALL")) {
    throw new Error("Pass --confirm=APPROVE_ALL to approve every live source");
  }
  let approved = 0;
  const failed: string[] = [];
  for (const state of STATES) {
    for (const source of liveStateSources(state)) {
      try {
        await approveSource(
          [
            `--adapter=${source.adapterKey}`,
            `--county=${source.countySlug}`,
            `--state=${state}`,
            "--confirm=APPROVE"
          ],
          environment
        );
        approved += 1;
      } catch (error) {
        failed.push(
          `${state}/${source.countySlug}: ${error instanceof Error ? error.message : "error"}`
        );
      }
    }
  }
  console.log(JSON.stringify({ approved, failed: failed.length }));
  for (const line of failed) console.log(`failed ${line}`);
  return failed.length === 0 ? 0 : 1;
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void approveAllSources().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
