import { createDatabase, parseDatabaseEnvironment, sql } from "@jail-atlas/database";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const ArgumentsSchema = z.object({
  adapterKey: z.string().regex(/^[a-z0-9-]+$/),
  countySlug: z.string().regex(/^[a-z0-9-]+$/),
  state: z.enum(["IA", "MN"]),
  confirm: z.literal("APPROVE")
});

function parseArguments(arguments_: readonly string[]) {
  const values: Record<string, string> = {};
  for (const argument of arguments_) {
    if (!argument.startsWith("--") || !argument.includes("=")) {
      throw new Error("Expected --adapter=, --county=, --state=, and --confirm= flags");
    }
    const [key, ...rest] = argument.slice(2).split("=");
    if (!key || rest.length === 0) throw new Error(`Invalid argument: ${argument}`);
    values[key] = rest.join("=");
  }
  return ArgumentsSchema.parse({
    adapterKey: values["adapter"],
    countySlug: values["county"],
    state: values["state"]?.toUpperCase(),
    confirm: values["confirm"]
  });
}

export async function approveSource(
  arguments_: readonly string[] = process.argv.slice(2),
  environment: Record<string, string | undefined> = process.env
): Promise<number> {
  const request = parseArguments(arguments_);
  const databaseUrl = environment["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const handle = createDatabase(parseDatabaseEnvironment({ DATABASE_URL: databaseUrl }));
  try {
    const sourceResult = await handle.db.execute<{
      source_id: string;
      county_id: string;
    }>(sql`
      SELECT os.id AS source_id, co.id AS county_id
      FROM official_sources os
      JOIN official_institutions oi ON oi.id = os.official_institution_id
      JOIN counties co ON co.id = oi.county_id
      JOIN states st ON st.id = co.state_id
      WHERE os.adapter_key = ${request.adapterKey}
        AND co.slug = ${request.countySlug}
        AND st.code = ${request.state}
      LIMIT 1
    `);
    const source = sourceResult.rows[0];
    if (!source)
      throw new Error("Approved source was not found for the requested state and county");

    await handle.db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE official_sources
        SET source_status = 'healthy',
            publication_approved = true,
            verified_at = COALESCE(verified_at, now()),
            last_checked_at = now(),
            last_error = NULL
        WHERE id = ${source.source_id}
          AND adapter_key = ${request.adapterKey}
      `);
      await tx.execute(sql`
        UPDATE source_adapters
        SET enabled = true
        WHERE source_id = ${source.source_id}
          AND adapter_key = ${request.adapterKey}
      `);
      await tx.execute(sql`
        UPDATE counties
        SET publication_status = 'published',
            published_at = COALESCE(published_at, now())
        WHERE id = ${source.county_id}
      `);
    });
    console.log(
      JSON.stringify({
        adapterKey: request.adapterKey,
        county: request.countySlug,
        state: request.state,
        approved: true
      })
    );
    return 0;
  } finally {
    await handle.close();
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void approveSource().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
