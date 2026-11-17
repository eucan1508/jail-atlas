// Deletes superseded custody snapshots. For each source it keeps the newest KEEP snapshots from
// successful runs (the page shows the newest one) and anything newer than them; older snapshots
// are deleted, and their people, bookings, charges, and bonds go with them (ON DELETE CASCADE).
// Only aggregate counts are printed, never values.
//
//   node scripts/prune-snapshots.mjs --dry-run          report what would be deleted
//   node scripts/prune-snapshots.mjs --apply [--vacuum] delete, then optionally VACUUM ANALYZE
import pg from "pg";

const POLICY_VERSION = "current-custody-keep-2-v1";
const KEEP = 2;
const BATCH = 20;
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const vacuum = args.has("--vacuum");
if (apply === args.has("--dry-run")) {
  console.error("Pass exactly one of --dry-run or --apply.");
  process.exit(2);
}

const SUPERSEDED = `
  WITH succeeded AS (
    SELECT cs.id, cs.source_id, cs.captured_at,
      row_number() OVER (PARTITION BY cs.source_id ORDER BY cs.captured_at DESC, cs.id DESC) AS rank
    FROM custody_snapshots cs
    JOIN ingest_runs ir ON ir.id = cs.ingest_run_id
    WHERE cs.custody_scope = 'current_custody'
      AND ir.outcome IN ('succeeded_with_records', 'succeeded_empty')
  ),
  cutoff AS (SELECT source_id, captured_at, id FROM succeeded WHERE rank = $1)
  SELECT cs.id
  FROM custody_snapshots cs
  JOIN cutoff c ON c.source_id = cs.source_id
  WHERE cs.custody_scope = 'current_custody'
    AND (cs.captured_at, cs.id) < (c.captured_at, c.id)`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const started = new Date();
try {
  await client.connect();
  const before = await client.query(
    "SELECT pg_size_pretty(pg_database_size(current_database())) AS size, (SELECT count(*) FROM custody_snapshots) AS snapshots"
  );
  console.log(
    `policy: ${POLICY_VERSION}; mode: ${apply ? "apply" : "dry-run"}; started: ${started.toISOString()}`
  );
  console.log(`before: ${before.rows[0].snapshots} snapshots, database ${before.rows[0].size}`);

  if (apply) {
    // Same index as migration 0130. Deleting a person record cascades to bookings by this column;
    // without the index every cascade scans the whole bookings table.
    await client.query(
      'CREATE INDEX IF NOT EXISTS "bookings_person_display_record_idx" ON "bookings" ("person_display_record_id")'
    );
    console.log("index: bookings_person_display_record_idx ready");
  }
  const ids = (await client.query(SUPERSEDED, [KEEP])).rows.map((row) => row.id);
  const counts = await client.query(
    `SELECT
       (SELECT count(*) FROM bookings WHERE snapshot_id = ANY($1::uuid[])) AS bookings,
       (SELECT count(*) FROM person_display_records WHERE snapshot_id = ANY($1::uuid[])) AS people,
       (SELECT count(*) FROM charges c JOIN bookings b ON b.id = c.booking_id WHERE b.snapshot_id = ANY($1::uuid[])) AS charges,
       (SELECT count(*) FROM bond_entries e JOIN bookings b ON b.id = e.booking_id WHERE b.snapshot_id = ANY($1::uuid[])) AS bonds,
       (SELECT count(DISTINCT source_id) FROM custody_snapshots WHERE id = ANY($1::uuid[])) AS sources`,
    [ids]
  );
  const c = counts.rows[0];
  console.log(
    `superseded: ${ids.length} snapshots from ${c.sources} sources; ${c.people} people, ${c.bookings} bookings, ${c.charges} charges, ${c.bonds} bond rows`
  );

  if (apply) {
    let deleted = 0;
    for (let index = 0; index < ids.length; index += BATCH) {
      const batch = ids.slice(index, index + BATCH);
      await client.query("BEGIN");
      try {
        const result = await client.query(
          "DELETE FROM custody_snapshots WHERE id = ANY($1::uuid[])",
          [batch]
        );
        await client.query("COMMIT");
        deleted += result.rowCount ?? 0;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
      if ((index / BATCH) % 25 === 0) console.log(`deleted ${deleted} of ${ids.length} snapshots`);
    }
    console.log(`deleted: ${deleted} snapshots`);
    if (vacuum) {
      for (const table of [
        "charges",
        "bond_entries",
        "bookings",
        "person_display_records",
        "custody_snapshots"
      ]) {
        await client.query(`VACUUM (ANALYZE) ${table}`);
      }
      console.log("vacuum: done");
    }
    const after = await client.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) AS size, (SELECT count(*) FROM custody_snapshots) AS snapshots"
    );
    console.log(`after: ${after.rows[0].snapshots} snapshots, database ${after.rows[0].size}`);
  }
  console.log(`finished: ${new Date().toISOString()}`);
} catch (error) {
  console.error(`prune_error: ${error.code ?? ""} ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
