import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"];
const isSchemaCheck = process.argv.includes("check");

if (!databaseUrl && !isSchemaCheck) {
  throw new Error("DATABASE_URL is required for database migration commands");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true,
  verbose: true
});
