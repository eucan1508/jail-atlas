import { z } from "zod";

const hostnamePattern =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const capabilityFlag = z.enum(["disabled", "enabled"]).default("disabled");
const booleanFlag = z
  .enum(["false", "true"])
  .default("false")
  .transform((value) => value === "true");

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
    INGEST_MODE: z.enum(["synthetic", "live"]).default("synthetic"),
    INGEST_NETWORK_ACCESS: capabilityFlag,
    INGEST_DATABASE_WRITES: capabilityFlag,
    ALLOW_LIVE_SOURCE_FETCHES: booleanFlag,
    SCOTT_COUNTY_LIVE_SOURCE_ENABLED: booleanFlag,
    SOURCE_HOST_ALLOWLIST: hostAllowlist,
    DATABASE_URL: optionalDatabaseUrl,
    GITHUB_RUN_ID: z.string().trim().min(1).max(128).optional(),
    LIVE_SOURCE_ADAPTER_KEY: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/)
      .optional()
  })
  .superRefine((value, context) => {
    if (value.INGEST_MODE === "synthetic") {
      if (value.INGEST_NETWORK_ACCESS !== "disabled") {
        context.addIssue({
          path: ["INGEST_NETWORK_ACCESS"],
          code: "custom",
          message: "synthetic mode requires disabled network access"
        });
      }
      if (value.INGEST_DATABASE_WRITES !== "disabled") {
        context.addIssue({
          path: ["INGEST_DATABASE_WRITES"],
          code: "custom",
          message: "synthetic mode requires disabled database writes"
        });
      }
      if (value.ALLOW_LIVE_SOURCE_FETCHES) {
        context.addIssue({
          path: ["ALLOW_LIVE_SOURCE_FETCHES"],
          code: "custom",
          message: "synthetic mode cannot allow live source fetches"
        });
      }
      if (value.SCOTT_COUNTY_LIVE_SOURCE_ENABLED) {
        context.addIssue({
          path: ["SCOTT_COUNTY_LIVE_SOURCE_ENABLED"],
          code: "custom",
          message: "the synthetic Scott County fixture has no live adapter"
        });
      }
    }
    if (value.SCOTT_COUNTY_LIVE_SOURCE_ENABLED) {
      context.addIssue({
        path: ["SCOTT_COUNTY_LIVE_SOURCE_ENABLED"],
        code: "custom",
        message: "the Scott County live adapter is not approved"
      });
    }
    if (value.INGEST_MODE === "live") {
      if (value.INGEST_NETWORK_ACCESS !== "enabled") {
        context.addIssue({
          path: ["INGEST_NETWORK_ACCESS"],
          code: "custom",
          message: "live mode requires enabled network access"
        });
      }
      if (!value.ALLOW_LIVE_SOURCE_FETCHES) {
        context.addIssue({
          path: ["ALLOW_LIVE_SOURCE_FETCHES"],
          code: "custom",
          message: "live mode requires live source fetches"
        });
      }
      if (value.SOURCE_HOST_ALLOWLIST.length === 0) {
        context.addIssue({
          path: ["SOURCE_HOST_ALLOWLIST"],
          code: "custom",
          message: "live mode requires an exact source host allowlist"
        });
      }
      if (value.LIVE_SOURCE_ADAPTER_KEY === undefined) {
        context.addIssue({
          path: ["LIVE_SOURCE_ADAPTER_KEY"],
          code: "custom",
          message: "live mode requires a source adapter key"
        });
      }
      if (value.DATABASE_URL === undefined) {
        context.addIssue({
          path: ["DATABASE_URL"],
          code: "custom",
          message: "live mode requires DATABASE_URL to read approved source metadata"
        });
      }
    }
    if (value.INGEST_DATABASE_WRITES === "enabled" && value.DATABASE_URL === undefined) {
      context.addIssue({
        path: ["DATABASE_URL"],
        code: "custom",
        message: "database writes require DATABASE_URL"
      });
    }
  })
  .strip();

export interface WorkerConfig {
  readonly nodeEnv: "development" | "test" | "production";
  readonly logLevel: "debug" | "info" | "warn" | "error";
  readonly ingestMode: "synthetic" | "live";
  readonly networkAccess: "disabled" | "enabled";
  readonly databaseWrites: "disabled" | "enabled";
  readonly allowLiveSourceFetches: boolean;
  readonly scottCountyLiveSourceEnabled: boolean;
  readonly sourceHostAllowlist: readonly string[];
  readonly databaseUrl?: string;
  readonly runId?: string;
  readonly liveSourceAdapterKey?: string;
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
    allowLiveSourceFetches: result.data.ALLOW_LIVE_SOURCE_FETCHES,
    scottCountyLiveSourceEnabled: result.data.SCOTT_COUNTY_LIVE_SOURCE_ENABLED,
    sourceHostAllowlist: Object.freeze([...result.data.SOURCE_HOST_ALLOWLIST]),
    ...(result.data.DATABASE_URL === undefined ? {} : { databaseUrl: result.data.DATABASE_URL }),
    ...(result.data.GITHUB_RUN_ID === undefined ? {} : { runId: result.data.GITHUB_RUN_ID }),
    ...(result.data.LIVE_SOURCE_ADAPTER_KEY === undefined
      ? {}
      : { liveSourceAdapterKey: result.data.LIVE_SOURCE_ADAPTER_KEY })
  };

  return Object.freeze(config);
}
