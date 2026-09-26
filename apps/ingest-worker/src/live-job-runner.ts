import { randomUUID } from "node:crypto";

import {
  createDatabase,
  facilities,
  officialSources,
  parseDatabaseEnvironment,
  sourceAdapters,
  persistIngestFailure,
  persistNormalizedSnapshot
} from "@jail-atlas/database";
import { OfficialSourceSchema, type OfficialSource } from "@jail-atlas/domain";
import {
  BLACK_HAWK_COUNTY_ADAPTER_KEY,
  CEDAR_COUNTY_ADAPTER_KEY,
  DALLAS_COUNTY_ADAPTER_KEY,
  createDallasCountySourceAdapter,
  createIowaCurrentRosterAdapter,
  RAMSEY_COUNTY_ADAPTER_KEY,
  createRamseyCountySourceAdapter,
  runSourceAdapter,
  type AdapterContext,
  type AdapterExecutionResult,
  type AnySourceAdapter,
  type SourceHealth
} from "@jail-atlas/source-adapters";
import { and, eq } from "drizzle-orm";

import type { WorkerConfig } from "./config.ts";
import { createConnectionBoundSourceFetch } from "./secure-source-fetch.ts";
import type { StructuredLogger } from "./logger.ts";

export interface LiveJobDependencies {
  readonly logger: StructuredLogger;
  readonly now?: () => Date;
  readonly createId?: () => string;
  readonly dryRun?: boolean;
}

export interface LiveJobExecution {
  readonly source: OfficialSource;
  readonly adapterKey: string;
  readonly health: SourceHealth;
  readonly result: AdapterExecutionResult;
  readonly persisted: boolean;
}

function sourceFromRow(row: typeof officialSources.$inferSelect): OfficialSource {
  return OfficialSourceSchema.parse({
    id: row.id,
    officialInstitutionId: row.officialInstitutionId,
    sourceUrl: row.sourceUrl,
    sourceType: row.sourceType,
    officialInstitutionUrl: row.officialInstitutionUrl,
    relationshipEvidenceUrl: row.relationshipEvidenceUrl,
    evidenceDescription: row.evidenceDescription,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    lastError: row.lastError,
    parserVersion: row.parserVersion,
    sourceStatus: row.sourceStatus,
    custodyDataScope: row.custodyDataScope,
    retentionScope: row.retentionScope,
    adapterKey: row.adapterKey,
    publicationApproved: row.publicationApproved
  });
}

export function createLiveSourceAdapter(
  source: OfficialSource,
  facilityId: string,
  config: WorkerConfig,
  createId: () => string
): AnySourceAdapter {
  const sourceUrl = new URL(source.sourceUrl);
  // The transport already enforces path-segment boundaries. Keep the exact list
  // path so sources without a trailing slash can fetch their list and details.
  const allowedPathPrefixes =
    source.adapterKey === RAMSEY_COUNTY_ADAPTER_KEY ? ["/resource"] : [sourceUrl.pathname];
  // Adapter ID factories receive record kind/key arguments; randomUUID accepts
  // an options object instead. Do not forward adapter arguments to this factory.
  const createAdapterId = () => createId();
  const fetch = createConnectionBoundSourceFetch({
    allowlist: config.sourceHostAllowlist,
    allowedPathPrefixes,
    userAgent: "JailAtlas/1.0 (+official-source-ingest)"
  });

  if (source.adapterKey === DALLAS_COUNTY_ADAPTER_KEY) {
    return createDallasCountySourceAdapter({
      fetch,
      facilityId,
      createId: createAdapterId,
      currency: "USD"
    });
  }
  if (
    source.adapterKey === CEDAR_COUNTY_ADAPTER_KEY ||
    source.adapterKey === BLACK_HAWK_COUNTY_ADAPTER_KEY
  ) {
    return createIowaCurrentRosterAdapter({
      source: source.adapterKey === CEDAR_COUNTY_ADAPTER_KEY ? "cedar" : "black_hawk",
      fetch,
      facilityId,
      createId: createAdapterId
    });
  }
  if (source.adapterKey === RAMSEY_COUNTY_ADAPTER_KEY) {
    return createRamseyCountySourceAdapter({
      fetch,
      facilityId,
      createId: () => createId()
    });
  }
  throw new Error(`Live adapter is not approved: ${source.adapterKey}`);
}

function requireLiveSource(source: OfficialSource, dryRun: boolean): void {
  if (!dryRun && !source.publicationApproved) {
    throw new Error("The source is not publication-approved for live ingestion");
  }
  const allowedStatuses = dryRun
    ? ["verification_pending", "healthy", "valid_empty"]
    : ["healthy", "valid_empty"];
  if (!allowedStatuses.includes(source.sourceStatus)) {
    throw new Error(`The source status is not live-enabled: ${source.sourceStatus}`);
  }
}

export async function executeLiveSource(
  config: WorkerConfig,
  dependencies: LiveJobDependencies
): Promise<LiveJobExecution> {
  if (config.ingestMode !== "live" || config.networkAccess !== "enabled") {
    throw new Error("Live ingestion requires INGEST_MODE=live and enabled network access");
  }
  if (!config.allowLiveSourceFetches || config.sourceHostAllowlist.length === 0) {
    throw new Error("Live ingestion requires an exact source host allowlist");
  }
  if (config.databaseUrl === undefined) throw new Error("Live ingestion requires DATABASE_URL");
  const adapterKey = config.liveSourceAdapterKey;
  if (adapterKey === undefined) throw new Error("Live ingestion requires LIVE_SOURCE_ADAPTER_KEY");

  const database = createDatabase(parseDatabaseEnvironment({ DATABASE_URL: config.databaseUrl }));
  const startedAt = (dependencies.now ?? (() => new Date()))();
  const createId = dependencies.createId ?? randomUUID;
  try {
    const [sourceRow] = await database.db
      .select()
      .from(officialSources)
      .where(eq(officialSources.adapterKey, adapterKey))
      .limit(1);
    if (!sourceRow) throw new Error(`No approved official source found for adapter: ${adapterKey}`);
    const source = sourceFromRow(sourceRow);
    requireLiveSource(source, dependencies.dryRun === true);

    const [adapterRow] = await database.db
      .select()
      .from(sourceAdapters)
      .where(and(eq(sourceAdapters.sourceId, source.id), eq(sourceAdapters.adapterKey, adapterKey)))
      .limit(1);
    if (
      !adapterRow ||
      (!dependencies.dryRun && !adapterRow.enabled) ||
      adapterRow.adapterKey !== adapterKey
    ) {
      throw new Error(`No enabled adapter record found for source: ${adapterKey}`);
    }
    const [facility] = await database.db
      .select()
      .from(facilities)
      .where(eq(facilities.officialInstitutionId, source.officialInstitutionId))
      .limit(1);
    if (!facility) throw new Error(`No active facility found for source: ${adapterKey}`);

    const runId = createId();
    const context: AdapterContext = {
      runId,
      source,
      requestedAt: startedAt.toISOString(),
      traceId: `live-${runId}`,
      signal: new AbortController().signal,
      logger: dependencies.logger
    };
    const adapter = createLiveSourceAdapter(source, facility.id, config, createId);
    dependencies.logger.info("ingest.live.started", { adapterKey, sourceId: source.id, runId });
    const health = await adapter.healthCheck(context);
    const result = await runSourceAdapter(adapter, context);
    const finishedAt = (dependencies.now ?? (() => new Date()))();
    let persisted = false;
    if (result.ok && config.databaseWrites === "enabled" && !dependencies.dryRun) {
      await persistNormalizedSnapshot(database.db, {
        adapterId: adapterRow.id,
        parserVersion: adapter.parserVersion,
        traceId: context.traceId,
        startedAt,
        finishedAt,
        snapshot: result.snapshot
      });
      persisted = true;
    } else if (!result.ok && config.databaseWrites === "enabled" && !dependencies.dryRun) {
      await persistIngestFailure(database.db, {
        runId,
        sourceId: source.id,
        adapterId: adapterRow.id,
        parserVersion: adapter.parserVersion,
        traceId: context.traceId,
        startedAt,
        finishedAt,
        failure: result.failure
      });
      persisted = true;
    }
    dependencies.logger[result.ok ? "info" : "warn"]("ingest.live.completed", {
      adapterKey,
      sourceId: source.id,
      runId,
      health: health.status,
      healthFailureStage: health.failure?.stage ?? null,
      healthFailureCode: health.failure?.diagnosticCode ?? null,
      ok: result.ok,
      resultFailureStage: result.ok ? null : result.failure.stage,
      resultFailureCode: result.ok ? null : result.failure.diagnosticCode,
      recordCount: result.ok ? result.snapshot.recordCount : null,
      persisted
    });
    return { source, adapterKey, health, result, persisted };
  } finally {
    await database.close();
  }
}
