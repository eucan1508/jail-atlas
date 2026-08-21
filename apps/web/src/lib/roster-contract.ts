import { z } from "zod";

export const rosterPageSize = 25;
export const maximumRosterPageSize = 25;

export const PublicChargeSchema = z.object({
  description: z.string().min(1).max(1_000),
  sourceLabel: z.string().max(150).nullable(),
  statuteCode: z.string().max(100).nullable()
});

export const PublicBondSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("monetary"), label: z.string(), note: z.string().nullable() }),
  z.object({ state: z.literal("no_bond"), label: z.string(), note: z.string().nullable() }),
  z.object({ state: z.literal("not_published"), label: z.string(), note: z.string().nullable() }),
  z.object({ state: z.literal("unknown"), label: z.string(), note: z.string().nullable() }),
  z.object({ state: z.literal("not_applicable"), label: z.string(), note: z.string().nullable() })
]);

export const PublicRosterRecordSchema = z.object({
  bookedAtLabel: z.string(),
  bookingIdentifier: z.string().nullable(),
  bonds: z.array(PublicBondSchema),
  charges: z.array(PublicChargeSchema),
  displayName: z.string().min(1).max(250),
  recordKey: z.string(),
  sourceOrder: z.number().int().nonnegative()
});
export type PublicRosterRecord = z.infer<typeof PublicRosterRecordSchema>;

export const RosterPageSchema = z.object({
  endOfResults: z.boolean(),
  nextCursor: z.string().nullable(),
  records: z.array(PublicRosterRecordSchema).max(maximumRosterPageSize),
  total: z.number().int().nonnegative()
});
export type RosterPage = z.infer<typeof RosterPageSchema>;
