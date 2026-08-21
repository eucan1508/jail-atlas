import { z } from "zod";

export const EntityIdSchema = z.string().uuid();
export type EntityId = z.infer<typeof EntityIdSchema>;

export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

export const SlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase, hyphenated slug");

export const LocaleSchema = z.string().regex(/^[a-z]{2}-[A-Z]{2}$/);

export const PublicUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Public evidence URLs must use HTTPS"
  });

export const NonEmptyTextSchema = z.string().trim().min(1);

export const PublicationStatusSchema = z.enum(["draft", "in_review", "published", "retired"]);
export type PublicationStatus = z.infer<typeof PublicationStatusSchema>;

export const RedactedFailureSchema = z.object({
  classification: z.enum([
    "network",
    "timeout",
    "blocked_by_source",
    "http_status",
    "invalid_response",
    "validation",
    "parser",
    "normalization",
    "persistence",
    "configuration",
    "unknown"
  ]),
  publicMessage: z.string().trim().min(1).max(500),
  retryable: z.boolean(),
  occurredAt: IsoDateTimeSchema,
  diagnosticCode: z.string().trim().min(1).max(100)
});
export type RedactedFailure = z.infer<typeof RedactedFailureSchema>;
