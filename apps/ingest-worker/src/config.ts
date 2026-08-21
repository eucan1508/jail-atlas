import { z } from "zod";

const hostnamePattern =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const disabledFlag = z.literal("disabled").default("disabled");
const falseFlag = z.literal("false").default("false");

const optionalDatabaseUrl = z
  .string()
  .url()
  .superRefine((value, context) => {
    const protocol = new URL(value).protocol;
    if (protocol !== "postgres:" && protocol !== "postgresql:") {
      context.addIssue({
        code: "custom",
        message: "must use the postgres or postgresql protocol"
      });
    }
  })
  .optional();

const hostAllowlist = z
  .string()
  .default("")
  .transform((value, context) => {
    const hosts = value
      .split(",")
      .map((entry) => entry.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean);

    const uniqueHosts = [...new Set(hosts)];
    for (const hostname of uniqueHosts) {
      if (!hostnamePattern.test(hostname)) {
        context.addIssue({
          code: "custom",
          message: `contains an invalid hostname: ${hostname}`
        });
      }
    }

    return uniqueHosts;
  });

const WorkerEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    INGEST_MODE: z.literal("synthetic").default("synthetic"),
    INGEST_NETWORK_ACCESS: disabledFlag,
    INGEST_DATABASE_WRITES: disabledFlag,
    ALLOW_LIVE_SOURCE_FETCHES: falseFlag,
    SCOTT_COUNTY_LIVE_SOURCE_ENABLED: falseFlag,
    SOURCE_HOST_ALLOWLIST: hostAllowlist,
    DATABASE_URL: optionalDatabaseUrl,
    GITHUB_RUN_ID: z.string().trim().min(1).max(128).optional()
  })
  .strip();

export interface WorkerConfig {
  readonly nodeEnv: "development" | "test" | "production";
  readonly logLevel: "debug" | "info" | "warn" | "error";
  readonly ingestMode: "synthetic";
  readonly networkAccess: "disabled";
  readonly databaseWrites: "disabled";
  readonly allowLiveSourceFetches: false;
  readonly scottCountyLiveSourceEnabled: false;
  readonly sourceHostAllowlist: readonly string[];
  readonly databaseUrl?: string;
  readonly runId?: string;
}

export class EnvironmentValidationError extends Error {
  readonly fields: readonly string[];

  constructor(fields: readonly string[]) {
    super(`Invalid ingest-worker environment fields: ${fields.join(", ")}`);
    this.name = "EnvironmentValidationError";
    this.fields = fields;
  }
}

export function readWorkerConfig(environment: Record<string, string | undefined>): WorkerConfig {
  const result = WorkerEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map((issue) =>
          issue.path.length > 0 ? issue.path.join(".") : "environment"
        )
      )
    ];
    throw new EnvironmentValidationError(fields);
  }

  const config: WorkerConfig = {
    nodeEnv: result.data.NODE_ENV,
    logLevel: result.data.LOG_LEVEL,
    ingestMode: result.data.INGEST_MODE,
    networkAccess: result.data.INGEST_NETWORK_ACCESS,
    databaseWrites: result.data.INGEST_DATABASE_WRITES,
    allowLiveSourceFetches: false,
    scottCountyLiveSourceEnabled: false,
    sourceHostAllowlist: Object.freeze([...result.data.SOURCE_HOST_ALLOWLIST]),
    ...(result.data.DATABASE_URL === undefined ? {} : { databaseUrl: result.data.DATABASE_URL }),
    ...(result.data.GITHUB_RUN_ID === undefined ? {} : { runId: result.data.GITHUB_RUN_ID })
  };

  return Object.freeze(config);
}
