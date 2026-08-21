import {
  EmptyResultInterpretationSchema,
  FailureClassificationSchema,
  type AdapterContext,
  type AdapterExecutionResult,
  type AdapterFailure,
  type AdapterStage,
  type SourceAdapter
} from "./contracts.js";
import { NormalizedCustodySnapshotSchema } from "@jail-atlas/domain";

function classifiedFailure(
  adapter: SourceAdapter<unknown, unknown, unknown>,
  error: unknown,
  stage: AdapterStage,
  context: AdapterContext
): AdapterFailure {
  try {
    return {
      ok: false,
      failure: FailureClassificationSchema.parse(adapter.classifyFailure(error, stage, context))
    };
  } catch {
    return {
      ok: false,
      failure: {
        classification: "unknown",
        publicMessage: "The approved source could not be processed.",
        retryable: false,
        occurredAt: context.requestedAt,
        diagnosticCode: "INVALID_FAILURE_CLASSIFICATION",
        stage
      }
    };
  }
}

export async function runSourceAdapter<TFetched, TValidated, TParsed>(
  adapter: SourceAdapter<TFetched, TValidated, TParsed>,
  context: AdapterContext
): Promise<AdapterExecutionResult> {
  let fetched: Awaited<ReturnType<typeof adapter.fetch>>;
  try {
    fetched = await adapter.fetch(context);
  } catch (error) {
    return classifiedFailure(adapter, error, "fetch", context);
  }
  if (!fetched.ok) return fetched;

  let validated: Awaited<ReturnType<typeof adapter.validate>>;
  try {
    validated = await adapter.validate(fetched.value, context);
  } catch (error) {
    return classifiedFailure(adapter, error, "validate", context);
  }
  if (!validated.ok) return validated;

  let parsed: Awaited<ReturnType<typeof adapter.parse>>;
  try {
    parsed = await adapter.parse(validated.value, context);
  } catch (error) {
    return classifiedFailure(adapter, error, "parse", context);
  }
  if (!parsed.ok) return parsed;

  let emptyResult;
  try {
    emptyResult = EmptyResultInterpretationSchema.parse(
      await adapter.interpretEmptyResult(parsed.value, context)
    );
  } catch (error) {
    return classifiedFailure(adapter, error, "empty_interpretation", context);
  }

  if (emptyResult.kind === "unexpected_empty") {
    return {
      ok: false,
      failure: {
        classification: "validation",
        publicMessage: "The source returned an unexpected empty result.",
        retryable: true,
        occurredAt: context.requestedAt,
        diagnosticCode: "UNEXPECTED_EMPTY_RESULT",
        stage: "empty_interpretation"
      }
    };
  }

  let normalized: Awaited<ReturnType<typeof adapter.normalize>>;
  try {
    normalized = await adapter.normalize(parsed.value, emptyResult, context);
  } catch (error) {
    return classifiedFailure(adapter, error, "normalize", context);
  }
  if (!normalized.ok) return normalized;

  const snapshot = NormalizedCustodySnapshotSchema.safeParse(normalized.value);
  if (!snapshot.success) {
    return classifiedFailure(adapter, snapshot.error, "normalize", context);
  }

  if (
    (emptyResult.kind === "valid_empty" && snapshot.data.recordCount !== 0) ||
    (emptyResult.kind === "not_empty" && snapshot.data.recordCount === 0)
  ) {
    return {
      ok: false,
      failure: {
        classification: "normalization",
        publicMessage: "The normalized record count contradicted the source result.",
        retryable: false,
        occurredAt: context.requestedAt,
        diagnosticCode: "EMPTY_RESULT_COUNT_MISMATCH",
        stage: "normalize"
      }
    };
  }

  return { ok: true, snapshot: snapshot.data, emptyResult };
}
