import { z } from "zod";

export const DatabaseEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "postgres:" || protocol === "postgresql:";
    }, "DATABASE_URL must use the PostgreSQL protocol"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(30).default(10),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000)
});
export type DatabaseEnvironment = z.infer<typeof DatabaseEnvironmentSchema>;

export function parseDatabaseEnvironment(
  environment: Readonly<Record<string, string | undefined>>
): DatabaseEnvironment {
  return DatabaseEnvironmentSchema.parse(environment);
}
