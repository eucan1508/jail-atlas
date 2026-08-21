import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import type { DatabaseEnvironment } from "./environment.js";
import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseHandle {
  readonly db: Database;
  readonly pool: Pool;
  close(): Promise<void>;
}

export function createDatabase(environment: DatabaseEnvironment): DatabaseHandle {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: environment.DATABASE_POOL_MAX,
    idleTimeoutMillis: environment.DATABASE_IDLE_TIMEOUT_MS,
    application_name: "jail-atlas"
  });
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    close: async () => pool.end()
  };
}
