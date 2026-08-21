import { z } from "zod";

const localSecretDefaults = {
  CORRECTION_FORM_HMAC_SECRET: "phase-one-correction-secret-000000000000",
  CURSOR_SIGNING_SECRET: "phase-one-cursor-secret-0000000000000000"
} as const;

const productionSecretKeys = ["CURSOR_SIGNING_SECRET", "CORRECTION_FORM_HMAC_SECRET"] as const;

const forbiddenProductionSecretFragments = [
  "default",
  "placeholder",
  "phase-one",
  "phase_one",
  "phase one",
  "example",
  "replace-with",
  "replace_with",
  "replace with",
  "change-me",
  "change_me",
  "change me"
] as const;

function isPlaceholderProductionSecret(secret: string): boolean {
  const normalized = secret.toLocaleLowerCase("en-US");
  return forbiddenProductionSecretFragments.some((fragment) => normalized.includes(fragment));
}

const environmentSchema = z
  .object({
    APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    BRAND_NAME: z.string().trim().min(2).max(80).default("County Custody Information"),
    CORRECTION_FORM_HMAC_SECRET: z.string().trim().min(32).optional(),
    CURSOR_SIGNING_SECRET: z.string().trim().min(32).optional(),
    DATA_MODE: z.enum(["synthetic", "official"]).default("synthetic"),
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://custody_app:custody_app@127.0.0.1:5432/custody_phase_one"),
    DEFAULT_LOCALE: z
      .string()
      .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)
      .default("en-US"),
    PRODUCTION_DOMAIN: z.string().url().default("https://example.test"),
    ROSTER_API_RATE_LIMIT: z.coerce.number().int().min(1).max(500).default(30),
    ROSTER_API_RATE_WINDOW_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional()
  })
  .superRefine((value, context) => {
    const isProduction = value.APP_ENV === "production" || value.VERCEL_ENV === "production";

    if (isProduction) {
      for (const secretKey of productionSecretKeys) {
        const secret = value[secretKey];

        if (!secret) {
          context.addIssue({
            code: "custom",
            message: `${secretKey} must be explicitly supplied in production.`,
            path: [secretKey]
          });
          continue;
        }

        if (isPlaceholderProductionSecret(secret)) {
          context.addIssue({
            code: "custom",
            message: `${secretKey} cannot use a default, placeholder, phase-one, or example value in production.`,
            path: [secretKey]
          });
        }
      }
    }

    if (isProduction && value.DATA_MODE === "synthetic") {
      context.addIssue({
        code: "custom",
        message: "Synthetic custody data is forbidden in production.",
        path: ["DATA_MODE"]
      });
    }

    if (isProduction && new URL(value.PRODUCTION_DOMAIN).hostname === "example.test") {
      context.addIssue({
        code: "custom",
        message: "A production origin must be configured before production use.",
        path: ["PRODUCTION_DOMAIN"]
      });
    }
  })
  .transform((value) => ({
    ...value,
    CORRECTION_FORM_HMAC_SECRET:
      value.CORRECTION_FORM_HMAC_SECRET ?? localSecretDefaults.CORRECTION_FORM_HMAC_SECRET,
    CURSOR_SIGNING_SECRET: value.CURSOR_SIGNING_SECRET ?? localSecretDefaults.CURSOR_SIGNING_SECRET
  }));

export type AppEnvironment = z.infer<typeof environmentSchema>;

let cachedEnvironment: AppEnvironment | undefined;

export function readEnvironment(input: NodeJS.ProcessEnv = process.env): AppEnvironment {
  if (input === process.env && cachedEnvironment) {
    return cachedEnvironment;
  }

  const parsed = environmentSchema.parse(input);
  const normalized = {
    ...parsed,
    PRODUCTION_DOMAIN: parsed.PRODUCTION_DOMAIN.replace(/\/$/, "")
  };

  if (input === process.env) {
    cachedEnvironment = normalized;
  }

  return normalized;
}

export function isProductionEnvironment(environment = readEnvironment()): boolean {
  return environment.APP_ENV === "production" || environment.VERCEL_ENV === "production";
}

export function shouldNoIndex(environment = readEnvironment()): boolean {
  return !isProductionEnvironment(environment) || environment.VERCEL_ENV === "preview";
}
