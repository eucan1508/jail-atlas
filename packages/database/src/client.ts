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
  // An idle connection can be closed by the server (Neon drops idle sockets). pg then emits
  // "error" on the pool and discards that client; without a listener Node treats the event as
  // unhandled and stops the whole process. The next query simply opens a new connection.
  pool.on("error", (error) => {
    console.warn(`database: idle connection closed (${error.message})`);
  });
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    close: async () => pool.end()
  };
}
