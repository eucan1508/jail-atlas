import { z } from "zod";

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  LocaleSchema,
  NonEmptyTextSchema,
  PublicationStatusSchema,
  SlugSchema
} from "./primitives.js";

export const StateSchema = z.object({
  id: EntityIdSchema,
  code: z.string().regex(/^[A-Z]{2}$/),
  name: NonEmptyTextSchema.max(100),
  slug: SlugSchema,
  defaultLocale: LocaleSchema,
  publicationStatus: PublicationStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type State = z.infer<typeof StateSchema>;

export const CountySchema = z
  .object({
    id: EntityIdSchema,
    stateId: EntityIdSchema,
    name: NonEmptyTextSchema.max(150),
    slug: SlugSchema,
    seatCity: NonEmptyTextSchema.max(150).nullable(),
    canonicalPath: z.string().regex(/^\/[a-z0-9/-]+\/$/),
    publicationStatus: PublicationStatusSchema,
    publishedAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema
  })
  .superRefine((county, context) => {
    if (county.publicationStatus === "published" && county.publishedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "A published county requires a real publication timestamp"
      });
    }
  });
export type County = z.infer<typeof CountySchema>;

export const FacilitySchema = z.object({
  id: EntityIdSchema,
  countyId: EntityIdSchema,
  officialInstitutionId: EntityIdSchema,
  name: NonEmptyTextSchema.max(200),
  jurisdictionLabel: NonEmptyTextSchema.max(200),
  city: NonEmptyTextSchema.max(150).nullable(),
  timezone: NonEmptyTextSchema.max(100),
  active: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema
});
export type Facility = z.infer<typeof FacilitySchema>;

export const ContactKindSchema = z.enum([
  "main_phone",
  "records_phone",
  "email",
  "postal_address",
  "physical_address",
  "official_webpage"
]);
export type ContactKind = z.infer<typeof ContactKindSchema>;

export const ContactSchema = z.object({
  id: EntityIdSchema,
  facilityId: EntityIdSchema.nullable(),
  officialInstitutionId: EntityIdSchema,
  kind: ContactKindSchema,
  label: NonEmptyTextSchema.max(150),
  value: NonEmptyTextSchema.max(500),
  evidenceId: EntityIdSchema,
  verifiedAt: IsoDateTimeSchema,
  displayOrder: z.number().int().nonnegative(),
  active: z.boolean()
});
export type Contact = z.infer<typeof ContactSchema>;

export const OperationKindSchema = z.enum([
  "custody_lookup",
  "visitation",
  "mail",
  "property",
  "payments",
  "release_information",
  "accessibility",
  "other"
]);
export type OperationKind = z.infer<typeof OperationKindSchema>;

export const OperationSchema = z.object({
  id: EntityIdSchema,
  facilityId: EntityIdSchema,
  kind: OperationKindSchema,
  title: NonEmptyTextSchema.max(200),
  guidance: NonEmptyTextSchema.max(5_000),
  evidenceIds: z.array(EntityIdSchema).min(1),
  verifiedAt: IsoDateTimeSchema,
  displayOrder: z.number().int().nonnegative(),
  active: z.boolean()
});
export type Operation = z.infer<typeof OperationSchema>;
