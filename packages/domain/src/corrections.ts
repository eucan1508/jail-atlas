import { z } from "zod";

import { EntityIdSchema, IsoDateTimeSchema, NonEmptyTextSchema } from "./primitives.js";

export const CorrectionRequestSchema = z.object({
  id: EntityIdSchema,
  countyId: EntityIdSchema.nullable(),
  category: z.enum([
    "stale_data",
    "incorrect_roster_display",
    "incorrect_contact",
    "incorrect_guidance",
    "privacy",
    "other"
  ]),
  description: NonEmptyTextSchema.min(20).max(5_000),
  contactEmail: z.string().email().max(320).nullable(),
  sourcePagePath: z.string().startsWith("/").max(500),
  status: z.enum(["received", "triaged", "resolved", "closed_no_change"]),
  submittedAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable(),
  spamRisk: z.number().min(0).max(1),
  submitterFingerprint: z.string().min(16).max(200)
});
export type CorrectionRequest = z.infer<typeof CorrectionRequestSchema>;

export const PublicCorrectionSubmissionSchema = CorrectionRequestSchema.pick({
  category: true,
  description: true,
  contactEmail: true,
  sourcePagePath: true
}).extend({
  website: z.string().max(0),
  formStartedAt: IsoDateTimeSchema,
  submissionToken: z.string().min(32).max(500)
});
export type PublicCorrectionSubmission = z.infer<typeof PublicCorrectionSubmissionSchema>;
