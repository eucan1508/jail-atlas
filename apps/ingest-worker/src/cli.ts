import { pathToFileURL } from "node:url";

import { parseCliArguments } from "./cli-arguments.ts";
import { readWorkerConfig } from "./config.ts";
import { executeSyntheticScottCountyDryRun } from "./job-runner.ts";
import { createStructuredLogger } from "./logger.ts";

export async function main(
  arguments_: readonly string[] = process.argv.slice(2),
  environment: Record<string, string | undefined> = process.env
): Promise<number> {
  let logger = createStructuredLogger({ minimumLevel: "info" });

  try {
    const config = readWorkerConfig(environment);
    logger = createStructuredLogger({ minimumLevel: config.logLevel });
    const request = parseCliArguments(arguments_);
    const execution = await executeSyntheticScottCountyDryRun(config, request, { logger });
    return execution.summary.ok ? 0 : 1;
  } catch (error) {
    logger.error("ingest.worker.rejected", { error });
    return 1;
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
