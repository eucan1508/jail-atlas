import { z } from "zod";

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
  PublicUrlSchema,
  RedactedFailureSchema
} from "./primitives.js";

export const OfficialInstitutionKindSchema = z.enum([
  "county_government",
  "sheriff",
  "jail",
  "detention_center",
  "public_detention_authority"
]);
export type OfficialInstitutionKind = z.infer<typeof OfficialInstitutionKindSchema>;

export const OfficialInstitutionSchema = z.object({
  id: EntityIdSchema,
  countyId: EntityIdSchema,
  name: NonEmptyTextSchema.max(250),
  kind: OfficialInstitutionKindSchema,
  officialUrl: PublicUrlSchema,
  verifiedAt: IsoDateTimeSchema,
  active: z.boolean()
});
export type OfficialInstitution = z.infer<typeof OfficialInstitutionSchema>;

export const OfficialSourceTypeSchema = z.enum([
  "official_county",
  "official_sheriff",
  "official_jail",
  "official_detention_authority",
  "officially_linked_vendor"
]);
export type OfficialSourceType = z.infer<typeof OfficialSourceTypeSchema>;

export const CustodyDataScopeSchema = z.enum([
  "current_custody",
  "recent_release",
  "historical_booking",
  "arrest_report"
]);
export type CustodyDataScope = z.infer<typeof CustodyDataScopeSchema>;

export const SourceStatusSchema = z.enum([
  "proposed",
  "verification_pending",
  "healthy",
  "valid_empty",
  "stale",
  "fetch_error",
  "parser_error",
  "disabled"
]);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const RetentionScopeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("current_only"),
    description: NonEmptyTextSchema.max(1_000)
  }),
  z.object({
    kind: z.literal("source_defined_window"),
    durationDays: z.number().int().positive(),
    description: NonEmptyTextSchema.max(1_000)
  }),
  z.object({
    kind: z.literal("no_person_records"),
    description: NonEmptyTextSchema.max(1_000)
  })
]);
export type RetentionScope = z.infer<typeof RetentionScopeSchema>;

export const SourceRelationshipKindSchema = z.enum([
  "directly_operated",
  "official_link",
  "official_embed",
  "official_documentation"
]);

export const SourceEvidenceSchema = z.object({
  id: EntityIdSchema,
  sourceId: EntityIdSchema,
  url: PublicUrlSchema,
  pageTitle: NonEmptyTextSchema.max(300),
  description: NonEmptyTextSchema.max(2_000),
  relationshipKind: SourceRelationshipKindSchema,
  verifiedAt: IsoDateTimeSchema,
  lastCheckedAt: IsoDateTimeSchema
});
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;

export const OfficialSourceSchema = z.object({
  id: EntityIdSchema,
  officialInstitutionId: EntityIdSchema,
  sourceUrl: PublicUrlSchema,
  sourceType: OfficialSourceTypeSchema,
  officialInstitutionUrl: PublicUrlSchema,
  relationshipEvidenceUrl: PublicUrlSchema,
  evidenceDescription: NonEmptyTextSchema.max(2_000),
  verifiedAt: IsoDateTimeSchema.nullable(),
  lastCheckedAt: IsoDateTimeSchema.nullable(),
  lastSuccessAt: IsoDateTimeSchema.nullable(),
  lastError: RedactedFailureSchema.nullable(),
  parserVersion: NonEmptyTextSchema.max(100),
  sourceStatus: SourceStatusSchema,
  custodyDataScope: z.array(CustodyDataScopeSchema).min(1),
  retentionScope: RetentionScopeSchema,
  adapterKey: z.string().regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  publicationApproved: z.boolean()
});
export type OfficialSource = z.infer<typeof OfficialSourceSchema>;

export const SourceAdapterRecordSchema = z.object({
  id: EntityIdSchema,
  sourceId: EntityIdSchema,
  adapterKey: z.string().regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  adapterVersion: NonEmptyTextSchema.max(100),
  parserVersion: NonEmptyTextSchema.max(100),
  enabled: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type SourceAdapterRecord = z.infer<typeof SourceAdapterRecordSchema>;

export const IngestOutcomeSchema = z.enum([
  "succeeded_with_records",
  "succeeded_empty",
  "fetch_failed",
  "validation_failed",
  "parser_failed",
  "normalization_failed",
  "persistence_failed"
]);
export type IngestOutcome = z.infer<typeof IngestOutcomeSchema>;

export const IngestRunSchema = z
  .object({
    id: EntityIdSchema,
    sourceId: EntityIdSchema,
    adapterId: EntityIdSchema,
    startedAt: IsoDateTimeSchema,
    finishedAt: IsoDateTimeSchema.nullable(),
    outcome: IngestOutcomeSchema,
    recordCount: z.number().int().nonnegative().nullable(),
    validEmptyResult: z.boolean(),
    failure: RedactedFailureSchema.nullable(),
    parserVersion: NonEmptyTextSchema.max(100),
    traceId: z.string().min(8).max(100)
  })
  .superRefine((run, context) => {
    const success = run.outcome === "succeeded_with_records" || run.outcome === "succeeded_empty";
    if (success && run.failure !== null) {
      context.addIssue({
        code: "custom",
        path: ["failure"],
        message: "A successful ingest cannot contain a failure"
      });
    }
    if (!success && run.failure === null) {
      context.addIssue({
        code: "custom",
        path: ["failure"],
        message: "A failed ingest requires a redacted failure"
      });
    }
    if (run.outcome === "succeeded_empty" && !run.validEmptyResult) {
      context.addIssue({
        code: "custom",
        path: ["validEmptyResult"],
        message: "An empty success must be explicitly interpreted as valid"
      });
    }
  });
export type IngestRun = z.infer<typeof IngestRunSchema>;
