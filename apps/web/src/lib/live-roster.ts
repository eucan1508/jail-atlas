import "server-only";

import {
  createDatabase,
  parseDatabaseEnvironment,
  sql,
  type DatabaseHandle
} from "@jail-atlas/database";
import { z } from "zod";
import { readEnvironment } from "./env";
import {
  decodeRosterCursor,
  encodeRosterCursor,
  InvalidCursorError,
  maximumRosterPageSize
} from "./roster";
import { PublicRosterRecordSchema, RosterPageSchema, type RosterPage } from "./roster-contract";
import type { CountyCoverageBrief } from "./coverage-catalog";

const liveAdapterKeys: Record<string, string> = {
  "dallas-county": "dallas-newworld-inmate-inquiry",
  "cedar-county": "cedar-county-iowa-current-roster",
  "black-hawk-county": "black-hawk-county-iowa-current-roster"
};

const LiveSourceSchema = z.object({
  sourceId: z.string().uuid(),
  sourceUrl: z.string().url(),
  lastSuccessAt: z.coerce.date().nullable(),
  capturedAt: z.coerce.date().nullable(),
  recordCount: z.coerce.number().int().nonnegative().nullable()
});
export type LiveSource = z.infer<typeof LiveSourceSchema>;

type SourceRow = {
  source_id: string;
  source_url: string;
  last_success_at: Date | string | null;
  captured_at: Date | string | null;
  record_count: number | null;
};

type BookingRow = {
  record_key: string;
  display_name: string;
  booking_identifier_value: string | null;
  source_identifies_as_booking_identifier: boolean;
  booked_at: Date | string | null;
  source_order: number;
  charges: Array<{
    description: string;
    sourceLabel: string | null;
    statuteCode: string | null;
  }> | null;
  total: number;
};

let databaseHandle: DatabaseHandle | undefined;

function getDatabase() {
  if (!databaseHandle) {
    const environment = readEnvironment();
    const databaseEnvironment = parseDatabaseEnvironment({
      DATABASE_URL: environment.DATABASE_URL
    });
    databaseHandle = createDatabase(databaseEnvironment);
  }
  return databaseHandle.db;
}

function adapterKeyForCounty(entry: CountyCoverageBrief): string | null {
  return liveAdapterKeys[entry.slug] ?? null;
}

async function sourceByAdapterKey(adapterKey: string): Promise<LiveSource | null> {
  const result = await getDatabase().execute<SourceRow>(sql`
    SELECT
      os.id AS source_id,
      os.source_url,
      os.last_success_at,
      latest.captured_at,
      latest.record_count
    FROM official_sources os
    JOIN official_institutions oi ON oi.id = os.official_institution_id
    JOIN counties co ON co.id = oi.county_id
    JOIN states st ON st.id = co.state_id
    LEFT JOIN LATERAL (
      SELECT cs.captured_at, cs.record_count
      FROM custody_snapshots cs
      WHERE cs.source_id = os.id
      ORDER BY cs.captured_at DESC
      LIMIT 1
    ) latest ON true
    WHERE os.adapter_key = ${adapterKey}
      AND os.source_status = 'healthy'
      AND os.publication_approved = true
      AND co.publication_status = 'published'
      AND st.publication_status = 'published'
    LIMIT 1
  `);
  const row = result.rows[0];
  return row ? LiveSourceSchema.parse(row) : null;
}

export async function getLiveCountySource(entry: CountyCoverageBrief): Promise<LiveSource | null> {
  const adapterKey = adapterKeyForCounty(entry);
  return adapterKey ? sourceByAdapterKey(adapterKey) : null;
}

export async function getLiveRosterPage({
  sourceId,
  cursor,
  limit = maximumRosterPageSize
}: {
  sourceId: string;
  cursor?: string;
  limit?: number;
}): Promise<RosterPage> {
  if (!z.string().uuid().safeParse(sourceId).success) throw new InvalidCursorError();
  if (!Number.isInteger(limit) || limit < 1 || limit > maximumRosterPageSize) {
    throw new RangeError("Roster page size is outside the allowed range.");
  }

  const source = await sourceById(sourceId);
  if (!source) throw new Error("Published roster source not found.");
  const after = cursor ? decodeRosterCursor(cursor, sourceId) : null;
  const result = await getDatabase().execute<BookingRow>(sql`
    SELECT
      b.id AS record_key,
      p.display_name,
      b.booking_identifier_value,
      b.source_identifies_as_booking_identifier,
      b.booked_at,
      b.source_order,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'description', ch.description,
            'sourceLabel', ch.source_label,
            'statuteCode', ch.statute_code
          ) ORDER BY ch.sequence
        ) FILTER (WHERE ch.id IS NOT NULL),
        '[]'::jsonb
      ) AS charges,
      COUNT(*) OVER ()::int AS total
    FROM bookings b
    JOIN person_display_records p ON p.id = b.person_display_record_id
    LEFT JOIN charges ch ON ch.booking_id = b.id
    WHERE b.snapshot_id = (
      SELECT cs.id
      FROM custody_snapshots cs
      WHERE cs.source_id = ${sourceId}
      ORDER BY cs.captured_at DESC
      LIMIT 1
    )
      AND (
        ${after ? sql`b.source_order > ${after.afterSourceOrder}` : sql`true`}
        OR (
          ${after ? sql`b.source_order = ${after.afterSourceOrder}` : sql`false`}
          AND ${after ? sql`b.id > ${after.afterId}` : sql`false`}
        )
      )
    GROUP BY b.id, p.display_name
    ORDER BY b.source_order ASC, b.id ASC
    LIMIT ${limit}
  `);

  const rows = result.rows;
  const records = rows.map((row) =>
    PublicRosterRecordSchema.parse({
      bookedAtLabel: row.booked_at
        ? new Intl.DateTimeFormat(readEnvironment().DEFAULT_LOCALE, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/Chicago"
          }).format(new Date(row.booked_at))
        : "Not published",
      bookingIdentifier: row.source_identifies_as_booking_identifier
        ? row.booking_identifier_value
        : null,
      charges: row.charges ?? [],
      displayName: row.display_name,
      recordKey: row.record_key,
      sourceOrder: row.source_order
    })
  );
  const last = rows.at(-1);
  const total = rows[0]?.total ?? 0;
  const endOfResults = rows.length === 0 || rows.length >= total || records.length < limit;
  const nextCursor =
    last && !endOfResults
      ? encodeRosterCursor({
          version: 1,
          sourceId,
          afterSourceOrder: last.source_order,
          afterId: last.record_key
        })
      : null;

  return RosterPageSchema.parse({ endOfResults, nextCursor, records, total });
}

async function sourceById(sourceId: string): Promise<LiveSource | null> {
  const result = await getDatabase().execute<SourceRow>(sql`
    SELECT
      os.id AS source_id,
      os.source_url,
      os.last_success_at,
      latest.captured_at,
      latest.record_count
    FROM official_sources os
    JOIN official_institutions oi ON oi.id = os.official_institution_id
    JOIN counties co ON co.id = oi.county_id
    JOIN states st ON st.id = co.state_id
    LEFT JOIN LATERAL (
      SELECT cs.captured_at, cs.record_count
      FROM custody_snapshots cs
      WHERE cs.source_id = os.id
      ORDER BY cs.captured_at DESC
      LIMIT 1
    ) latest ON true
    WHERE os.id = ${sourceId}
      AND os.source_status = 'healthy'
      AND os.publication_approved = true
      AND co.publication_status = 'published'
      AND st.publication_status = 'published'
    LIMIT 1
  `);
  const row = result.rows[0];
  return row ? LiveSourceSchema.parse(row) : null;
}
