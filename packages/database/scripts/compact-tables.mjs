// Gives back the space that pruning freed. Deleted rows leave their space inside the table files,
// and the database counts file size against its limit, so the roster tables are rewritten with
// VACUUM FULL. When the database is too full for even that, the charges primary key index is set
// aside first (it is the largest index nothing else depends on) and rebuilt right after. No row is
// deleted or changed. Only sizes are printed.
//
//   node scripts/compact-tables.mjs [--set-aside-charges-key]
import pg from "pg";

const TABLES = [
  "charges",
  "bond_entries",
  "bookings",
  "person_display_records",
  "custody_snapshots"
];
const setAside = process.argv.includes("--set-aside-charges-key");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function report(label) {
  const size = await client.query(
    "SELECT pg_size_pretty(pg_database_size(current_database())) AS size"
  );
  const tables = await client.query(
    `SELECT relname AS table, pg_size_pretty(pg_relation_size(relid)) AS heap,
            pg_size_pretty(pg_indexes_size(relid)) AS indexes, n_live_tup AS rows
     FROM pg_stat_user_tables WHERE relname = ANY($1) ORDER BY pg_total_relation_size(relid) DESC`,
    [TABLES]
  );
  console.log(`${label}: database ${size.rows[0].size}`);
  for (const row of tables.rows) {
    console.log(`  ${row.table}: heap ${row.heap}, indexes ${row.indexes}, ~${row.rows} rows`);
  }
}

try {
  await client.connect();
  await report("before");
  for (const table of ["charges", "bond_entries", "bookings"]) {
    await client.query(`VACUUM (ANALYZE) ${table}`);
  }
  console.log("vacuum: done");

  if (setAside) {
    const pk = await client.query(
      `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint WHERE conrelid = 'charges'::regclass AND contype = 'p'`
    );
    const key = pk.rows[0];
    const referenced = await client.query(
      "SELECT count(*)::int AS n FROM pg_constraint WHERE confrelid = 'charges'::regclass"
    );
    if (!key || referenced.rows[0].n > 0) throw new Error("charges key missing or referenced");
    await client.query(`ALTER TABLE charges DROP CONSTRAINT "${key.conname}"`);
    console.log(`set aside: ${key.conname}`);
    try {
      await client.query("VACUUM FULL charges");
      console.log("vacuum full: charges");
    } finally {
      await client.query(`ALTER TABLE charges ADD CONSTRAINT "${key.conname}" ${key.definition}`);
      console.log(`restored: ${key.conname}`);
    }
  }

  for (const table of TABLES) {
    if (setAside && table === "charges") continue;
    await client.query(`VACUUM FULL ${table}`);
    console.log(`vacuum full: ${table}`);
  }
  try {
    await client.query(
      'CREATE INDEX IF NOT EXISTS "bookings_person_display_record_idx" ON "bookings" ("person_display_record_id")'
    );
    console.log("index: bookings_person_display_record_idx ready");
  } catch (error) {
    console.log(`index: not built yet (${error.code ?? ""} ${error.message})`);
  }
  await report("after");
} catch (error) {
  console.error(`compact_error: ${error.code ?? ""} ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
