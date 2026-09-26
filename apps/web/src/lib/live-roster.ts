import "server-only";

import {
  createDatabase,
  parseDatabaseEnvironment,
  sql,
  type Database,
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
import { countyCoverageCatalog, type CountyCoverageBrief } from "./coverage-catalog";

const liveAdapterKeys: Record<string, string> = {
  "dallas-county": "dallas-newworld-inmate-inquiry",
  "cedar-county": "cedar-county-iowa-current-roster",
  "black-hawk-county": "black-hawk-county-iowa-current-roster",
  "ramsey-county": "ramsey-county-mn-current-roster",
  "stearns-county": "stearns-county-mn-current-roster"
};

// One daily refresh, with six hours of allowance for runner/source delays.
const maximumSnapshotAgeMs = 30 * 60 * 60 * 1_000;
const SourceRowSchema = z.object({
  source_id: z.string().uuid(),
  state_code: z.string().length(2),
  source_url: z.string().url(),
  adapter_key: z.string(),
  snapshot_id: z.string().uuid(),
  captured_at: z.coerce.date(),
  record_count: z.coerce.number().int().nonnegative(),
  valid_empty_result: z.boolean(),
  stale: z.boolean(),
  expires_at: z.coerce.date().nullable()
});
export type LiveSource = {
  sourceId: string;
  sourceUrl: string;
  snapshotId: string;
  capturedAt: Date;
  recordCount: number;
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
  }>;
};

export class RosterUnavailableError extends Error {}
let databaseHandle: DatabaseHandle | undefined;

function getDatabase() {
  databaseHandle ??= createDatabase(
    parseDatabaseEnvironment({
      DATABASE_URL: readEnvironment().DATABASE_URL,
      DATABASE_POOL_MAX: "2"
    })
  );
  return databaseHandle.db;
}

async function readSource(
  db: Pick<Database, "execute">,
  selector: { sourceId: string } | { adapterKey: string }
): Promise<LiveSource | null> {
  const result = await db.execute(sql`
    SELECT os.id AS source_id, st.code AS state_code, os.source_url, os.adapter_key,
      latest.id AS snapshot_id, latest.captured_at, latest.record_count,
      latest.valid_empty_result, latest.stale, latest.expires_at
    FROM official_sources os
    JOIN official_institutions oi ON oi.id = os.official_institution_id
    JOIN counties co ON co.id = oi.county_id
    JOIN states st ON st.id = co.state_id
    JOIN LATERAL (
      SELECT cs.*
      FROM custody_snapshots cs
      JOIN ingest_runs ir ON ir.id = cs.ingest_run_id
      WHERE cs.source_id = os.id AND cs.custody_scope = 'current_custody'
        AND ir.outcome IN ('succeeded_with_records', 'succeeded_empty')
      ORDER BY cs.captured_at DESC, cs.id DESC
      LIMIT 1
    ) latest ON true
    WHERE ${"sourceId" in selector ? sql`os.id = ${selector.sourceId}` : sql`os.adapter_key = ${selector.adapterKey}`}
      AND os.source_status IN ('healthy', 'valid_empty')
      AND os.publication_approved = true
      AND oi.active = true
      AND co.publication_status = 'published'
      AND st.publication_status = 'published' AND st.code IN ('IA', 'MN')
      AND EXISTS (
        SELECT 1 FROM source_adapters sa
        WHERE sa.source_id = os.id AND sa.adapter_key = os.adapter_key
          AND sa.parser_version = os.parser_version AND sa.enabled = true
      )
    LIMIT 1
  `);
  if (!result.rows[0]) return null;
  const row = SourceRowSchema.parse(result.rows[0]);
  const stateByCode = { IA: "iowa", MN: "minnesota" } as const;
  const expectedState = stateByCode[row.state_code as keyof typeof stateByCode];
  const entry = countyCoverageCatalog.find(
    (county) => county.state === expectedState && liveAdapterKeys[county.slug] === row.adapter_key
  );
  const age = Date.now() - row.captured_at.getTime();
  if (
    !entry ||
    entry.officialSourceUrl !== row.source_url ||
    row.stale ||
    age < 0 ||
    age > maximumSnapshotAgeMs ||
    (row.expires_at !== null && row.expires_at.getTime() <= Date.now()) ||
    (row.record_count === 0) !== row.valid_empty_result
  )
    return null;
  return {
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    snapshotId: row.snapshot_id,
    capturedAt: row.captured_at,
    recordCount: row.record_count
  };
}

export async function getLiveCountySource(entry: CountyCoverageBrief): Promise<LiveSource | null> {
  if (readEnvironment().DATA_MODE !== "official" || !process.env.DATABASE_URL) return null;
  const adapterKey = liveAdapterKeys[entry.slug];
  return adapterKey ? readSource(getDatabase(), { adapterKey }) : null;
}

export async function getLiveRosterPage({
  sourceId,
  cursor,
  snapshotId,
  limit = maximumRosterPageSize
}: {
  sourceId: string;
  cursor?: string;
  snapshotId?: string;
  limit?: number;
}): Promise<RosterPage> {
  if (!z.string().uuid().safeParse(sourceId).success) throw new RosterUnavailableError();
  if (!Number.isInteger(limit) || limit < 1 || limit > maximumRosterPageSize) {
    throw new RangeError("Roster page size is outside the allowed range.");
  }
  const after = cursor ? decodeRosterCursor(cursor, sourceId) : null;
  return getDatabase().transaction(
    async (tx) => {
      const source = await readSource(tx, { sourceId });
      if (!source) throw new RosterUnavailableError();
      if (
        (after && after.snapshotId !== source.snapshotId) ||
        (snapshotId && snapshotId !== source.snapshotId)
      )
        throw new InvalidCursorError();
      const result = await tx.execute<BookingRow>(sql`
      SELECT b.id AS record_key, p.display_name, b.booking_identifier_value,
        b.source_identifies_as_booking_identifier, b.booked_at, b.source_order,
        COALESCE(
          jsonb_agg(jsonb_build_object(
            'description', ch.description, 'sourceLabel', ch.source_label,
            'statuteCode', ch.statute_code
          ) ORDER BY ch.sequence) FILTER (WHERE ch.id IS NOT NULL), '[]'::jsonb
        ) AS charges
      FROM bookings b
      JOIN person_display_records p
        ON p.id = b.person_display_record_id AND p.snapshot_id = b.snapshot_id
      LEFT JOIN charges ch ON ch.booking_id = b.id
      WHERE b.snapshot_id = ${source.snapshotId}
        AND b.custody_scope = 'current_custody' AND b.released_at IS NULL
        AND ${
          after
            ? sql`(b.source_order, b.id) > (${after.afterSourceOrder}, ${after.afterId}::uuid)`
            : sql`true`
        }
      GROUP BY b.id, p.display_name
      ORDER BY b.source_order ASC, b.id ASC
      LIMIT ${limit + 1}
    `);
      if (source.recordCount > 0 && result.rows.length === 0) {
        throw new RosterUnavailableError();
      }
      const endOfResults = result.rows.length <= limit;
      const rows = result.rows.slice(0, limit);
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
          charges: row.charges,
          displayName: row.display_name,
          recordKey: row.record_key,
          sourceOrder: row.source_order
        })
      );
      const last = rows.at(-1);
      return RosterPageSchema.parse({
        endOfResults,
        nextCursor:
          last && !endOfResults
            ? encodeRosterCursor({
                version: 1,
                sourceId,
                snapshotId: source.snapshotId,
                afterSourceOrder: last.source_order,
                afterId: last.record_key
              })
            : null,
        records,
        total: source.recordCount
      });
    },
    { isolationLevel: "repeatable read", accessMode: "read only" }
  );
}
