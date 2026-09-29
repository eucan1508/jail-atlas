import { readMigrationFiles } from "drizzle-orm/migrator";
import pg from "pg";

const EXPECTED_STATES = ["IA", "MN"] as const;
const EXPECTED_ADAPTERS = [
  "dallas-newworld-inmate-inquiry",
  "cedar-county-iowa-current-roster",
  "black-hawk-county-iowa-current-roster",
  "ramsey-county-mn-current-roster",
  "stearns-county-mn-current-roster",
  "anoka-county-mn-current-roster"
] as const;

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = new pg.Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(1819219831)");

  const history = await client.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations"
  );
  if (history.rows[0]?.count !== "0") {
    console.log(JSON.stringify({ baselineApplied: false, reason: "history-present" }));
    await client.query("COMMIT");
  } else {
    const objects = await client.query<{ tables_present: boolean; type_present: boolean }>(`
      SELECT
        to_regclass('public.states') IS NOT NULL
          AND to_regclass('public.counties') IS NOT NULL
          AND to_regclass('public.official_sources') IS NOT NULL
          AND to_regclass('public.source_adapters') IS NOT NULL AS tables_present,
        to_regtype('public.publication_status') IS NOT NULL AS type_present
    `);
    if (!objects.rows[0]?.tables_present || !objects.rows[0]?.type_present) {
      throw new Error("Production schema is not eligible for migration baselining");
    }

    const states = await client.query<{ code: string }>(
      "SELECT code FROM states WHERE code = ANY($1::text[]) ORDER BY code",
      [EXPECTED_STATES]
    );
    if (states.rows.map(({ code }) => code).join(",") !== EXPECTED_STATES.join(",")) {
      throw new Error("Expected pre-Texas state records are missing");
    }

    const adapters = await client.query<{ adapter_key: string }>(
      "SELECT adapter_key FROM official_sources WHERE adapter_key = ANY($1::text[]) ORDER BY adapter_key",
      [EXPECTED_ADAPTERS]
    );
    const actualAdapters = new Set(adapters.rows.map(({ adapter_key }) => adapter_key));
    if (EXPECTED_ADAPTERS.some((adapterKey) => !actualAdapters.has(adapterKey))) {
      throw new Error("Expected pre-Texas source records are missing");
    }

    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" }).slice(0, 6);
    if (migrations.length !== 6) throw new Error("Unexpected baseline migration count");
    for (const migration of migrations) {
      await client.query(
        "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
        [migration.hash, migration.folderMillis]
      );
    }

    await client.query("COMMIT");
    console.log(JSON.stringify({ baselineApplied: true, migrationCount: migrations.length }));
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
