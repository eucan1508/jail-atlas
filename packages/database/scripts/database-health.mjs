// Read-only health check for the production database. Prints sizes and counts only: no connection
// string, host name, or row values. The one write test runs inside a transaction that is rolled
// back, so nothing is changed.
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const show = (label, value) => console.log(`${label}: ${value}`);

try {
  await client.connect();
  show("connected", "yes");
  const settings = await client.query(
    "SELECT current_setting('default_transaction_read_only') AS read_only, pg_is_in_recovery() AS recovery, pg_size_pretty(pg_database_size(current_database())) AS size"
  );
  show("default_transaction_read_only", settings.rows[0].read_only);
  show("in_recovery", settings.rows[0].recovery);
  show("database_size", settings.rows[0].size);

  const tables = await client.query(`
    SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relid)) AS size, n_live_tup AS rows
    FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10`);
  console.log("largest tables:");
  for (const row of tables.rows) console.log(`  ${row.table}: ${row.size} (${row.rows} rows)`);

  const snapshots = await client.query(`
    SELECT count(*) AS snapshots, count(DISTINCT source_id) AS sources,
           min(captured_at) AS oldest, max(captured_at) AS newest
    FROM custody_snapshots`);
  const s = snapshots.rows[0];
  show(
    "custody_snapshots",
    `${s.snapshots} for ${s.sources} sources, oldest ${s.oldest?.toISOString?.() ?? s.oldest}, newest ${s.newest?.toISOString?.() ?? s.newest}`
  );

  const migrations = await client
    .query("SELECT count(*) AS applied, max(created_at) AS last FROM drizzle.__drizzle_migrations")
    .catch((error) => ({ rows: [{ applied: `unavailable (${error.message})`, last: "" }] }));
  show(
    "drizzle migrations applied",
    `${migrations.rows[0].applied}, last ${migrations.rows[0].last}`
  );

  try {
    await client.query("BEGIN");
    await client.query("CREATE TEMP TABLE health_probe (x int)");
    await client.query("UPDATE states SET name = name WHERE code = 'IA'");
    show("write_test", "ok (rolled back)");
  } catch (error) {
    show("write_test", `FAILED: ${error.code ?? ""} ${error.message}`);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
  }
} catch (error) {
  show("health_check_error", `${error.code ?? ""} ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
