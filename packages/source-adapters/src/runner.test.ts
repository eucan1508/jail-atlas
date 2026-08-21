import { describe, expect, it } from "vitest";

import type {
  AdapterContext,
  AdapterStage,
  EmptyResultInterpretation,
  FailureClassification,
  SourceAdapter
} from "./contracts.js";
import { runSourceAdapter } from "./runner.js";

const now = "2000-01-01T12:00:00.000Z";

function makeContext(): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    source: {
      id: "00000000-0000-4000-8000-000000000002",
      officialInstitutionId: "00000000-0000-4000-8000-000000000003",
      sourceUrl: "https://roster.example.test/current",
      sourceType: "officially_linked_vendor",
      officialInstitutionUrl: "https://official.example.test/",
      relationshipEvidenceUrl: "https://official.example.test/custody/",
      evidenceDescription: "Synthetic relationship evidence for contract tests.",
      verifiedAt: now,
      lastCheckedAt: now,
      lastSuccessAt: now,
      lastError: null,
      parserVersion: "synthetic-parser-1",
      sourceStatus: "healthy",
      custodyDataScope: ["current_custody"],
      retentionScope: {
        kind: "current_only",
        description: "Synthetic current-custody records only."
      },
      adapterKey: "synthetic.contract",
      publicationApproved: false
    },
    requestedAt: now,
    traceId: "synthetic-trace",
    signal: new AbortController().signal,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function makeAdapter(mode: "empty" | "fetch_error" | "parser_error") {
  const classify = (
    _error: unknown,
    stage: AdapterStage,
    context: AdapterContext
  ): FailureClassification => ({
    classification: stage === "parse" ? "parser" : "unknown",
    publicMessage: "A synthetic adapter stage failed.",
    retryable: false,
    occurredAt: context.requestedAt,
    diagnosticCode: `SYNTHETIC_${stage.toUpperCase()}_FAILURE`,
    stage
  });
  const adapter: SourceAdapter<string, string, readonly []> = {
    key: "synthetic.contract",
    adapterVersion: "1",
    parserVersion: "1",
    fetch: async (context) =>
      mode === "fetch_error"
        ? {
            ok: false,
            failure: {
              ...classify(null, "fetch", context),
              classification: "network"
            }
          }
        : { ok: true, value: "synthetic payload" },
    validate: async (payload) => ({ ok: true, value: payload }),
    parse: async (payload, context) =>
      mode === "parser_error"
        ? { ok: false, failure: classify(payload, "parse", context) }
        : { ok: true, value: [] as const },
    interpretEmptyResult: async (): Promise<EmptyResultInterpretation> => ({
      kind: "valid_empty",
      recordCount: 0,
      evidence: "The synthetic source explicitly marked its roster as empty."
    }),
    normalize: async (_parsed, interpretation, context) => ({
      ok: true,
      value: {
        id: "00000000-0000-4000-8000-000000000004",
        sourceId: context.source.id,
        ingestRunId: context.runId,
        capturedAt: context.requestedAt,
        sourceLastUpdatedAt: null,
        custodyScope: "current_custody",
        recordCount: 0,
        validEmptyResult: interpretation.kind === "valid_empty",
        stale: false,
        expiresAt: null,
        bookings: []
      }
    }),
    healthCheck: async () => ({
      status: "healthy",
      checkedAt: now,
      latencyMs: 1,
      failure: null
    }),
    classifyFailure: classify
  };
  return adapter;
}

describe("source adapter pipeline", () => {
  it("preserves an explicitly valid empty result", async () => {
    const result = await runSourceAdapter(makeAdapter("empty"), makeContext());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.emptyResult.kind).toBe("valid_empty");
  });

  it("distinguishes fetch failure from parser failure", async () => {
    const fetchFailure = await runSourceAdapter(makeAdapter("fetch_error"), makeContext());
    const parserFailure = await runSourceAdapter(makeAdapter("parser_error"), makeContext());
    expect(fetchFailure.ok).toBe(false);
    expect(parserFailure.ok).toBe(false);
    if (!fetchFailure.ok && !parserFailure.ok) {
      expect(fetchFailure.failure.stage).toBe("fetch");
      expect(parserFailure.failure.stage).toBe("parse");
      expect(fetchFailure.failure.classification).toBe("network");
      expect(parserFailure.failure.classification).toBe("parser");
    }
  });
});
