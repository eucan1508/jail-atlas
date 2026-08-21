import {
  IsoDateTimeSchema,
  NormalizedCustodySnapshotSchema,
  OfficialSourceSchema,
  RedactedFailureSchema,
  type NormalizedCustodySnapshot,
  type OfficialSource
} from "@jail-atlas/domain";
import { z } from "zod";

export const AdapterStageSchema = z.enum([
  "health_check",
  "fetch",
  "validate",
  "parse",
  "empty_interpretation",
  "normalize"
]);
export type AdapterStage = z.infer<typeof AdapterStageSchema>;

export const FailureClassificationSchema = RedactedFailureSchema.extend({
  stage: AdapterStageSchema
});
export type FailureClassification = z.infer<typeof FailureClassificationSchema>;

export type AdapterSuccess<T> = Readonly<{ ok: true; value: T }>;
export type AdapterFailure = Readonly<{
  ok: false;
  failure: FailureClassification;
}>;
export type AdapterResult<T> = AdapterSuccess<T> | AdapterFailure;

export type FetchResult<TFetched> = AdapterResult<TFetched>;
export type ValidationResult<TValidated> = AdapterResult<TValidated>;
export type ParseResult<TParsed> = AdapterResult<TParsed>;
export type NormalizationResult = AdapterResult<NormalizedCustodySnapshot>;

export const SourceHealthSchema = z.object({
  status: z.enum(["healthy", "degraded", "unavailable", "stale"]),
  checkedAt: IsoDateTimeSchema,
  latencyMs: z.number().int().nonnegative().nullable(),
  failure: FailureClassificationSchema.nullable()
});
export type SourceHealth = z.infer<typeof SourceHealthSchema>;

export const EmptyResultInterpretationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("not_empty"),
    recordCount: z.number().int().positive()
  }),
  z.object({
    kind: z.literal("valid_empty"),
    recordCount: z.literal(0),
    evidence: z.string().trim().min(1).max(1_000)
  }),
  z.object({
    kind: z.literal("unexpected_empty"),
    recordCount: z.literal(0),
    reason: z.string().trim().min(1).max(1_000)
  })
]);
export type EmptyResultInterpretation = z.infer<typeof EmptyResultInterpretationSchema>;

export const AdapterContextSchema = z.object({
  runId: z.string().uuid(),
  source: OfficialSourceSchema,
  requestedAt: IsoDateTimeSchema,
  traceId: z.string().min(8).max(100)
});

export interface AdapterLogger {
  debug(event: string, fields?: Readonly<Record<string, unknown>>): void;
  info(event: string, fields?: Readonly<Record<string, unknown>>): void;
  warn(event: string, fields?: Readonly<Record<string, unknown>>): void;
  error(event: string, fields?: Readonly<Record<string, unknown>>): void;
}

export interface AdapterContext {
  readonly runId: string;
  readonly source: OfficialSource;
  readonly requestedAt: string;
  readonly traceId: string;
  readonly signal: AbortSignal;
  readonly logger: AdapterLogger;
}

export interface SourceAdapter<TFetched, TValidated, TParsed> {
  readonly key: string;
  readonly adapterVersion: string;
  readonly parserVersion: string;
  fetch(context: AdapterContext): Promise<FetchResult<TFetched>>;
  validate(payload: TFetched, context: AdapterContext): Promise<ValidationResult<TValidated>>;
  parse(payload: TValidated, context: AdapterContext): Promise<ParseResult<TParsed>>;
  normalize(
    parsed: TParsed,
    emptyResult: EmptyResultInterpretation,
    context: AdapterContext
  ): Promise<NormalizationResult>;
  healthCheck(context: AdapterContext): Promise<SourceHealth>;
  interpretEmptyResult(
    parsed: TParsed,
    context: AdapterContext
  ): Promise<EmptyResultInterpretation>;
  classifyFailure(
    error: unknown,
    stage: AdapterStage,
    context: AdapterContext
  ): FailureClassification;
}

export const AdapterExecutionSuccessSchema = z.object({
  ok: z.literal(true),
  snapshot: NormalizedCustodySnapshotSchema,
  emptyResult: EmptyResultInterpretationSchema
});

export const AdapterExecutionFailureSchema = z.object({
  ok: z.literal(false),
  failure: FailureClassificationSchema
});

export const AdapterExecutionResultSchema = z.discriminatedUnion("ok", [
  AdapterExecutionSuccessSchema,
  AdapterExecutionFailureSchema
]);
export type AdapterExecutionResult = z.infer<typeof AdapterExecutionResultSchema>;
