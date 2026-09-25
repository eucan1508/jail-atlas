import type { NormalizedCustodySnapshot } from "@jail-atlas/domain";
import type { Database } from "./client.js";
import {
  bondEntries,
  bookings,
  charges,
  custodySnapshots,
  ingestRuns,
  personDisplayRecords
} from "./schema.js";

export interface PersistedIngestInput {
  readonly adapterId: string;
  readonly parserVersion: string;
  readonly traceId: string;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly snapshot: NormalizedCustodySnapshot;
}

export interface PersistedIngestResult {
  readonly ingestRunId: string;
  readonly snapshotId: string;
  readonly recordCount: number;
  readonly outcome: "succeeded_with_records" | "succeeded_empty";
}

/**
 * Stores one normalized source result as a single transaction.
 *
 * Source, institution, facility, and adapter metadata are intentionally
 * provisioned separately. This function only writes a result for an already
 * approved source/adapter pair, so a parser cannot silently create a
 * publishable source by itself.
 */
export async function persistNormalizedSnapshot(
  db: Database,
  input: PersistedIngestInput
): Promise<PersistedIngestResult> {
  const { snapshot } = input;
  if (snapshot.ingestRunId.length === 0 || snapshot.recordCount !== snapshot.bookings.length) {
    throw new Error("Normalized snapshot is internally inconsistent");
  }

  const outcome = snapshot.recordCount === 0 ? "succeeded_empty" : "succeeded_with_records";

  await db.transaction(async (tx) => {
    await tx.insert(ingestRuns).values({
      id: snapshot.ingestRunId,
      sourceId: snapshot.sourceId,
      adapterId: input.adapterId,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      outcome,
      recordCount: snapshot.recordCount,
      validEmptyResult: snapshot.validEmptyResult,
      failure: null,
      parserVersion: input.parserVersion,
      traceId: input.traceId
    });

    await tx.insert(custodySnapshots).values({
      id: snapshot.id,
      sourceId: snapshot.sourceId,
      ingestRunId: snapshot.ingestRunId,
      capturedAt: new Date(snapshot.capturedAt),
      sourceLastUpdatedAt: snapshot.sourceLastUpdatedAt
        ? new Date(snapshot.sourceLastUpdatedAt)
        : null,
      custodyScope: snapshot.custodyScope,
      recordCount: snapshot.recordCount,
      validEmptyResult: snapshot.validEmptyResult,
      stale: snapshot.stale,
      expiresAt: snapshot.expiresAt ? new Date(snapshot.expiresAt) : null
    });

    if (snapshot.bookings.length === 0) return;

    await tx.insert(personDisplayRecords).values(
      snapshot.bookings.map((booking) => ({
        id: booking.person.id,
        snapshotId: snapshot.id,
        displayName: booking.person.displayName,
        sourceDisplayText: booking.person.sourceDisplayText
      }))
    );

    await tx.insert(bookings).values(
      snapshot.bookings.map((booking) => ({
        id: booking.id,
        snapshotId: snapshot.id,
        personDisplayRecordId: booking.person.id,
        bookingIdentifierValue: booking.bookingIdentifier?.value ?? null,
        bookingIdentifierSourceLabel: booking.bookingIdentifier?.sourceLabel ?? null,
        sourceIdentifiesAsBookingIdentifier:
          booking.bookingIdentifier?.sourceIdentifiesAsBookingIdentifier ?? false,
        custodyScope: booking.custodyScope,
        bookedAt: booking.bookedAt ? new Date(booking.bookedAt) : null,
        releasedAt: booking.releasedAt ? new Date(booking.releasedAt) : null,
        facilityId: booking.facilityId,
        sourceOrder: booking.sourceOrder
      }))
    );

    const chargeRows = snapshot.bookings.flatMap((booking) =>
      booking.charges.map((charge) => ({
        id: charge.id,
        bookingId: charge.bookingId,
        sequence: charge.sequence,
        description: charge.description,
        sourceLabel: charge.sourceLabel,
        statuteCode: charge.statuteCode,
        disposition: charge.disposition
      }))
    );
    if (chargeRows.length > 0) await tx.insert(charges).values(chargeRows);

    const bondRows = snapshot.bookings.flatMap((booking) =>
      booking.bondEntries.map((bond) => ({
        id: bond.id,
        bookingId: bond.bookingId,
        sequence: bond.sequence,
        state: bond.state,
        amountMinor: bond.state === "monetary" ? bond.amountMinor : null,
        currency: bond.state === "monetary" ? bond.currency : null,
        sourceLabel: bond.sourceLabel,
        note: bond.note
      }))
    );
    if (bondRows.length > 0) await tx.insert(bondEntries).values(bondRows);
  });

  return {
    ingestRunId: snapshot.ingestRunId,
    snapshotId: snapshot.id,
    recordCount: snapshot.recordCount,
    outcome
  };
}
