import { z } from "zod";

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  NonEmptyTextSchema,
  RedactedFailureSchema
} from "./primitives.js";
import { CustodyDataScopeSchema } from "./sources.js";

export const PersonDisplayRecordSchema = z.object({
  id: EntityIdSchema,
  snapshotId: EntityIdSchema,
  displayName: NonEmptyTextSchema.max(250),
  sourceDisplayText: NonEmptyTextSchema.max(500)
});
export type PersonDisplayRecord = z.infer<typeof PersonDisplayRecordSchema>;

export const BookingIdentifierSchema = z.object({
  value: NonEmptyTextSchema.max(200),
  sourceLabel: NonEmptyTextSchema.max(100),
  sourceIdentifiesAsBookingIdentifier: z.literal(true)
});
export type BookingIdentifier = z.infer<typeof BookingIdentifierSchema>;

export const ChargeSchema = z.object({
  id: EntityIdSchema,
  bookingId: EntityIdSchema,
  sequence: z.number().int().nonnegative(),
  description: NonEmptyTextSchema.max(1_000),
  sourceLabel: NonEmptyTextSchema.max(150).nullable(),
  statuteCode: NonEmptyTextSchema.max(100).nullable(),
  disposition: NonEmptyTextSchema.max(300).nullable()
});
export type Charge = z.infer<typeof ChargeSchema>;

const BondBaseSchema = z.object({
  id: EntityIdSchema,
  bookingId: EntityIdSchema,
  sequence: z.number().int().nonnegative(),
  sourceLabel: NonEmptyTextSchema.max(150).nullable(),
  note: NonEmptyTextSchema.max(500).nullable()
});

export const BondEntrySchema = z.discriminatedUnion("state", [
  BondBaseSchema.extend({
    state: z.literal("monetary"),
    amountMinor: z.number().int().nonnegative(),
    currency: z.string().regex(/^[A-Z]{3}$/)
  }),
  BondBaseSchema.extend({
    state: z.literal("no_bond")
  }),
  BondBaseSchema.extend({
    state: z.literal("not_published")
  }),
  BondBaseSchema.extend({
    state: z.literal("unknown")
  }),
  BondBaseSchema.extend({
    state: z.literal("not_applicable")
  })
]);
export type BondEntry = z.infer<typeof BondEntrySchema>;

export const BookingSchema = z
  .object({
    id: EntityIdSchema,
    snapshotId: EntityIdSchema,
    person: PersonDisplayRecordSchema,
    bookingIdentifier: BookingIdentifierSchema.nullable(),
    custodyScope: CustodyDataScopeSchema,
    bookedAt: IsoDateTimeSchema.nullable(),
    releasedAt: IsoDateTimeSchema.nullable(),
    facilityId: EntityIdSchema,
    charges: z.array(ChargeSchema),
    bondEntries: z.array(BondEntrySchema),
    sourceOrder: z.number().int().nonnegative()
  })
  .superRefine((booking, context) => {
    if (booking.custodyScope === "current_custody" && booking.releasedAt !== null) {
      context.addIssue({
        code: "custom",
        path: ["releasedAt"],
        message: "A current-custody record cannot have a release timestamp"
      });
    }
    if (booking.custodyScope === "recent_release" && booking.releasedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["releasedAt"],
        message: "A recent-release record requires a release timestamp"
      });
    }
    for (const charge of booking.charges) {
      if (charge.bookingId !== booking.id) {
        context.addIssue({
          code: "custom",
          path: ["charges"],
          message: "Every charge must remain attached to its booking"
        });
        break;
      }
    }
    for (const bond of booking.bondEntries) {
      if (bond.bookingId !== booking.id) {
        context.addIssue({
          code: "custom",
          path: ["bondEntries"],
          message: "Every bond entry must remain attached to its booking"
        });
        break;
      }
    }
  });
export type Booking = z.infer<typeof BookingSchema>;

export const CustodySnapshotSchema = z
  .object({
    id: EntityIdSchema,
    sourceId: EntityIdSchema,
    ingestRunId: EntityIdSchema,
    capturedAt: IsoDateTimeSchema,
    sourceLastUpdatedAt: IsoDateTimeSchema.nullable(),
    custodyScope: CustodyDataScopeSchema,
    recordCount: z.number().int().nonnegative(),
    validEmptyResult: z.boolean(),
    stale: z.boolean(),
    expiresAt: IsoDateTimeSchema.nullable(),
    bookings: z.array(BookingSchema)
  })
  .superRefine((snapshot, context) => {
    if (snapshot.recordCount !== snapshot.bookings.length) {
      context.addIssue({
        code: "custom",
        path: ["recordCount"],
        message: "Snapshot count must equal the number of bookings"
      });
    }
    if (snapshot.recordCount === 0 && !snapshot.validEmptyResult) {
      context.addIssue({
        code: "custom",
        path: ["validEmptyResult"],
        message: "A zero-result snapshot requires explicit empty-result validation"
      });
    }
    if (snapshot.recordCount > 0 && snapshot.validEmptyResult) {
      context.addIssue({
        code: "custom",
        path: ["validEmptyResult"],
        message: "A non-empty snapshot cannot be labeled as a valid empty result"
      });
    }
  });
export type CustodySnapshot = z.infer<typeof CustodySnapshotSchema>;

export const NormalizedCustodySnapshotSchema = CustodySnapshotSchema;
export type NormalizedCustodySnapshot = CustodySnapshot;

export const CustodyAvailabilitySchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("available"),
    snapshot: CustodySnapshotSchema.refine((snapshot) => snapshot.recordCount > 0)
  }),
  z.object({
    state: z.literal("valid_empty"),
    snapshot: CustodySnapshotSchema.refine(
      (snapshot) => snapshot.recordCount === 0 && snapshot.validEmptyResult
    )
  }),
  z.object({
    state: z.literal("fetch_failed"),
    lastSuccessfulSnapshot: CustodySnapshotSchema.nullable(),
    failure: RedactedFailureSchema
  }),
  z.object({
    state: z.literal("parser_failed"),
    lastSuccessfulSnapshot: CustodySnapshotSchema.nullable(),
    failure: RedactedFailureSchema
  })
]);
export type CustodyAvailability = z.infer<typeof CustodyAvailabilitySchema>;
