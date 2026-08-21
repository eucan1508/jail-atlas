import { z } from "zod";

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
  PublicUrlSchema
} from "./primitives.js";

export const EditorialEvidenceSchema = z.object({
  id: EntityIdSchema,
  countyId: EntityIdSchema,
  officialInstitutionId: EntityIdSchema,
  url: PublicUrlSchema,
  pageTitle: NonEmptyTextSchema.max(300),
  sourcePurpose: NonEmptyTextSchema.max(1_000),
  evidenceDescription: NonEmptyTextSchema.max(2_000),
  vendorInvolved: z.boolean(),
  relationshipEvidenceUrl: PublicUrlSchema.nullable(),
  verifiedAt: IsoDateTimeSchema,
  lastCheckedAt: IsoDateTimeSchema
});
export type EditorialEvidence = z.infer<typeof EditorialEvidenceSchema>;

export const EditorialFactSchema = z.object({
  id: EntityIdSchema,
  statement: NonEmptyTextSchema.max(2_000),
  evidenceIds: z.array(EntityIdSchema).min(1),
  asOf: IsoDateTimeSchema.nullable()
});
export type EditorialFact = z.infer<typeof EditorialFactSchema>;

export const EditorialBlockSchema = z
  .object({
    id: EntityIdSchema,
    countyId: EntityIdSchema,
    blockKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    heading: NonEmptyTextSchema.max(200),
    summary: NonEmptyTextSchema.max(5_000),
    facts: z.array(EditorialFactSchema).min(1),
    status: z.enum(["draft", "in_review", "approved", "retired"]),
    reviewedAt: IsoDateTimeSchema.nullable(),
    reviewerReference: NonEmptyTextSchema.max(200).nullable(),
    displayOrder: z.number().int().nonnegative()
  })
  .superRefine((block, context) => {
    if (block.status === "approved") {
      if (block.reviewedAt === null) {
        context.addIssue({
          code: "custom",
          path: ["reviewedAt"],
          message: "Approved editorial content requires a real review timestamp"
        });
      }
      if (block.reviewerReference === null) {
        context.addIssue({
          code: "custom",
          path: ["reviewerReference"],
          message: "Approved editorial content requires an internal reviewer reference"
        });
      }
    }
  });
export type EditorialBlock = z.infer<typeof EditorialBlockSchema>;

export const PublicationChecklistSchema = z.object({
  currentCustodyRosterWorking: z.boolean(),
  sourceIsOfficialOrOfficiallyLinked: z.boolean(),
  relationshipEvidenceRecorded: z.boolean(),
  liveFetchSucceeded: z.boolean(),
  sourceSpecificParserTestsPassing: z.boolean(),
  emptyAndFailureStatesDistinguishable: z.boolean(),
  fieldProvenanceKnown: z.boolean(),
  officialContactVerified: z.boolean(),
  humanReviewRecorded: z.boolean(),
  usefulCountySpecificContentEvidenced: z.boolean()
});
export type PublicationChecklist = z.infer<typeof PublicationChecklistSchema>;

export const PublicationReviewSchema = z
  .object({
    id: EntityIdSchema,
    countyId: EntityIdSchema,
    outcome: z.enum(["approved", "changes_required", "rejected"]),
    checklist: PublicationChecklistSchema,
    reviewerReference: NonEmptyTextSchema.max(200),
    reviewedAt: IsoDateTimeSchema,
    notes: NonEmptyTextSchema.max(5_000).nullable()
  })
  .superRefine((review, context) => {
    if (review.outcome === "approved" && Object.values(review.checklist).some((value) => !value)) {
      context.addIssue({
        code: "custom",
        path: ["checklist"],
        message: "Publication cannot be approved until every requirement is true"
      });
    }
  });
export type PublicationReview = z.infer<typeof PublicationReviewSchema>;
