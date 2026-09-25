import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Booking } from "@jail-atlas/domain";
import {
  syntheticCurrentCustodySnapshot,
  syntheticOfficialSource
} from "@jail-atlas/test-fixtures";
import { z } from "zod";
import { readEnvironment } from "./env";
import {
  maximumRosterPageSize,
  PublicRosterRecordSchema,
  RosterPageSchema,
  rosterPageSize,
  type PublicRosterRecord,
  type RosterPage
} from "./roster-contract";

export { maximumRosterPageSize, rosterPageSize } from "./roster-contract";

const CursorPayloadSchema = z.object({
  afterId: z.string(),
  afterSourceOrder: z.number().int().nonnegative(),
  sourceId: z.string(),
  version: z.literal(1)
});
type CursorPayload = z.infer<typeof CursorPayloadSchema>;

export class InvalidCursorError extends Error {
  constructor() {
    super("The roster cursor is invalid or expired.");
    this.name = "InvalidCursorError";
  }
}

function signCursor(encodedPayload: string): string {
  return createHmac("sha256", readEnvironment().CURSOR_SIGNING_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

export function encodeRosterCursor(payload: CursorPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signCursor(encodedPayload)}`;
}

export function decodeRosterCursor(cursor: string, expectedSourceId: string): CursorPayload {
  const [encodedPayload, suppliedSignature, ...remainder] = cursor.split(".");
  if (!encodedPayload || !suppliedSignature || remainder.length > 0) throw new InvalidCursorError();

  const expectedSignature = signCursor(encodedPayload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw new InvalidCursorError();
  }

  try {
    const payload = CursorPayloadSchema.parse(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"))
    );
    if (payload.sourceId !== expectedSourceId) throw new InvalidCursorError();
    return payload;
  } catch (error) {
    if (error instanceof InvalidCursorError) throw error;
    throw new InvalidCursorError();
  }
}

function bookingOrder(left: Booking, right: Booking): number {
  return left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id);
}

function toPublicRecord(booking: Booking): PublicRosterRecord {
  const { DEFAULT_LOCALE } = readEnvironment();
  const bookedAtLabel = booking.bookedAt
    ? new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Chicago"
      }).format(new Date(booking.bookedAt))
    : "Not published";

  return PublicRosterRecordSchema.parse({
    bookedAtLabel,
    bookingIdentifier: booking.bookingIdentifier?.sourceIdentifiesAsBookingIdentifier
      ? booking.bookingIdentifier.value
      : null,
    charges: booking.charges.map((charge) => ({
      description: charge.description,
      sourceLabel: charge.sourceLabel,
      statuteCode: charge.statuteCode
    })),
    displayName: booking.person.displayName,
    recordKey: booking.id,
    sourceOrder: booking.sourceOrder
  });
}

export function syntheticRosterSourceId(): string {
  return syntheticOfficialSource.id;
}

export function getSyntheticRosterPage({
  cursor,
  limit = rosterPageSize
}: {
  cursor?: string;
  limit?: number;
}): RosterPage {
  if (!Number.isInteger(limit) || limit < 1 || limit > maximumRosterPageSize) {
    throw new RangeError("Roster page size is outside the allowed range.");
  }

  const sourceId = syntheticRosterSourceId();
  const ordered = syntheticCurrentCustodySnapshot.bookings
    .filter((booking) => booking.custodyScope === "current_custody")
    .slice()
    .sort(bookingOrder);
  const after = cursor ? decodeRosterCursor(cursor, sourceId) : null;
  const startIndex = after
    ? ordered.findIndex(
        (booking) =>
          booking.sourceOrder > after.afterSourceOrder ||
          (booking.sourceOrder === after.afterSourceOrder && booking.id > after.afterId)
      )
    : 0;

  if (after && startIndex < 0) throw new InvalidCursorError();
  const pageBookings = ordered.slice(startIndex, startIndex + limit);
  const last = pageBookings.at(-1);
  const endOfResults = startIndex + pageBookings.length >= ordered.length;
  const nextCursor =
    last && !endOfResults
      ? encodeRosterCursor({
          version: 1,
          sourceId,
          afterSourceOrder: last.sourceOrder,
          afterId: last.id
        })
      : null;

  return RosterPageSchema.parse({
    endOfResults,
    nextCursor,
    records: pageBookings.map(toPublicRecord),
    total: ordered.length
  });
}
