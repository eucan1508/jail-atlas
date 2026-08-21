import { randomUUID } from "node:crypto";

import { OfficialSourceSchema, type IngestOutcome, type OfficialSource } from "@jail-atlas/domain";
import {
  AdapterContextSchema,
  AdapterExecutionResultSchema,
  FailureClassificationSchema,
  SourceHealthSchema,
  createSourceAdapterRegistry,
  runSourceAdapter,
  type AdapterContext,
  type AdapterExecutionResult,
  type FailureClassification,
  type SourceHealth
} from "@jail-atlas/source-adapters";
import {
  assertSyntheticFixtureSafety,
  syntheticOfficialSource,
  syntheticScottCountyFixture
} from "@jail-atlas/test-fixtures";

import type { WorkerConfig } from "./config.ts";
import {
  assertPhaseOneSyntheticExecution,
  SYNTHETIC_SCOTT_ADAPTER_ID,
  type ExecutionRequest
} from "./execution-guard.ts";
import { createSyntheticScottCountyAdapter } from "./jobs/synthetic-scott-county.ts";
import type { StructuredLogger } from "./logger.ts";

const syntheticSourceFixture = {
  ...syntheticOfficialSource,
  verifiedAt: null,
  lastCheckedAt: null,
  lastSuccessAt: null,
  lastError: null,
  parserVersion: "1.0.0-synthetic",
  sourceStatus: "disabled",
  adapterKey: SYNTHETIC_SCOTT_ADAPTER_ID,
  publicationApproved: false
} as const;

export interface JobRunnerDependencies {
  readonly logger: StructuredLogger;
  readonly now?: () => Date;
  readonly createId?: () => string;
}

export interface SyntheticJobSummary {
  readonly ok: boolean;
  readonly dryRun: true;
  readonly sourceId: string;
  readonly adapterKey: string;
  readonly parserVersion: string;
  readonly health: SourceHealth["status"];
  readonly outcome: IngestOutcome;
  readonly recordCount: number | null;
  readonly validEmptyResult: boolean;
  readonly stale: boolean;
  readonly failure?: Readonly<{
    classification: FailureClassification["classification"];
    diagnosticCode: string;
    stage: FailureClassification["stage"];
  }>;
}

export interface SyntheticJobExecution {
  readonly source: OfficialSource;
  readonly health: SourceHealth;
  readonly adapterResult: AdapterExecutionResult;
  readonly summary: SyntheticJobSummary;
}

function outcomeForFailure(failure: FailureClassification): IngestOutcome {
  switch (failure.stage) {
    case "fetch":
    case "health_check":
      return "fetch_failed";
    case "validate":
    case "empty_interpretation":
      return "validation_failed";
    case "parse":
      return "parser_failed";
    case "normalize":
      return "normalization_failed";
  }
}

function safeHealthFailure(
  adapter: ReturnType<typeof createSyntheticScottCountyAdapter>,
  error: unknown,
  context: AdapterContext
): FailureClassification {
  return FailureClassificationSchema.parse(adapter.classifyFailure(error, "health_check", context));
}

async function checkHealth(
  adapter: ReturnType<typeof createSyntheticScottCountyAdapter>,
  context: AdapterContext
): Promise<SourceHealth> {
  try {
    return SourceHealthSchema.parse(await adapter.healthCheck(context));
  } catch (error) {
    return {
      status: "unavailable",
      checkedAt: context.requestedAt,
      latencyMs: null,
      failure: safeHealthFailure(adapter, error, context)
    };
  }
}

function toSummary(
  source: OfficialSource,
  health: SourceHealth,
  result: AdapterExecutionResult
): SyntheticJobSummary {
  if (result.ok) {
    return {
      ok: true,
      dryRun: true,
      sourceId: source.id,
      adapterKey: source.adapterKey,
      parserVersion: source.parserVersion,
      health: health.status,
      outcome: result.snapshot.recordCount === 0 ? "succeeded_empty" : "succeeded_with_records",
      recordCount: result.snapshot.recordCount,
      validEmptyResult: result.emptyResult.kind === "valid_empty",
      stale: result.snapshot.stale
    };
  }

  return {
    ok: false,
    dryRun: true,
    sourceId: source.id,
    adapterKey: source.adapterKey,
    parserVersion: source.parserVersion,
    health: health.status,
    outcome: outcomeForFailure(result.failure),
    recordCount: null,
    validEmptyResult: false,
    stale: health.status === "stale",
    failure: {
      classification: result.failure.classification,
      diagnosticCode: result.failure.diagnosticCode,
      stage: result.failure.stage
    }
  };
}

export async function executeSyntheticScottCountyDryRun(
  config: WorkerConfig,
  requestValue: unknown,
  dependencies: JobRunnerDependencies
): Promise<SyntheticJobExecution> {
  const request: ExecutionRequest = assertPhaseOneSyntheticExecution(config, requestValue);
  assertSyntheticFixtureSafety(syntheticScottCountyFixture);
  const source = OfficialSourceSchema.parse(syntheticSourceFixture);
  if (source.publicationApproved || source.sourceStatus !== "disabled") {
    throw new Error("Synthetic source fixtures must remain disabled and unpublished");
  }

  const now = dependencies.now ?? (() => new Date());
  const createId = dependencies.createId ?? randomUUID;
  const requestedAt = now().toISOString();
  const controller = new AbortController();
  const serializableContext = AdapterContextSchema.parse({
    runId: createId(),
    source,
    requestedAt,
    traceId: `synthetic-${createId()}`
  });
  const context: AdapterContext = {
    ...serializableContext,
    signal: controller.signal,
    logger: dependencies.logger
  };

  const registry = createSourceAdapterRegistry();
  const syntheticAdapter = createSyntheticScottCountyAdapter(request.scenario);
  registry.register(syntheticAdapter);
  const adapter = registry.get(request.adapterId);
  dependencies.logger.info("ingest.synthetic.started", {
    sourceId: source.id,
    adapterKey: adapter.key,
    parserVersion: adapter.parserVersion,
    scenario: request.scenario,
    dryRun: true,
    networkAccess: config.networkAccess,
    databaseWrites: config.databaseWrites
  });

  const health = await checkHealth(syntheticAdapter, context);
  const adapterResult = AdapterExecutionResultSchema.parse(
    await runSourceAdapter(adapter, context)
  );
  const summary = toSummary(source, health, adapterResult);

  dependencies.logger[summary.ok ? "info" : "warn"](
    summary.ok ? "ingest.synthetic.completed" : "ingest.synthetic.failed",
    { ...summary }
  );

  return Object.freeze({ source, health, adapterResult, summary });
}
