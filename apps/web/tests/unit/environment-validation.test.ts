import { afterEach, describe, expect, it, vi } from "vitest";
import { readEnvironment } from "@/lib/env";

const productionBase: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  APP_ENV: "production",
  BRAND_NAME: "Production Test Utility",
  DATA_MODE: "official",
  DEFAULT_LOCALE: "en-US",
  PRODUCTION_DOMAIN: "https://production-smoke.invalid",
  VERCEL_ENV: "production"
};

const safeSecrets = {
  CORRECTION_FORM_HMAC_SECRET: "4cf4424efc39431c880c862c6fa13acb47a5ec7bba8f402a9dc9715284665559",
  CURSOR_SIGNING_SECRET: "fb00f3e9ab034b11b75dbaf84691bb7c090081a7c5014d289185986c19d02bf3"
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("production secret validation", () => {
  it("keeps local development defaults available", () => {
    const environment = readEnvironment({ APP_ENV: "development", NODE_ENV: "development" });

    expect(environment.CURSOR_SIGNING_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(environment.CORRECTION_FORM_HMAC_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it.each(["CURSOR_SIGNING_SECRET", "CORRECTION_FORM_HMAC_SECRET"] as const)(
    "rejects production startup when %s is missing",
    (secretKey) => {
      const environment = { ...productionBase, ...safeSecrets };
      delete environment[secretKey];

      expect(() => readEnvironment(environment)).toThrowError(
        new RegExp(`${secretKey} must be explicitly supplied in production`)
      );
    }
  );

  it.each(["CURSOR_SIGNING_SECRET", "CORRECTION_FORM_HMAC_SECRET"] as const)(
    "rejects default and placeholder values for %s",
    (secretKey) => {
      for (const placeholder of [
        "default-production-secret-000000000000000000000000",
        "placeholder-production-secret-00000000000000000000",
        "phase-one-production-secret-000000000000000000000",
        "example-production-secret-00000000000000000000000",
        "replace-with-a-random-production-secret-0000000000"
      ]) {
        expect(() =>
          readEnvironment({
            ...productionBase,
            ...safeSecrets,
            [secretKey]: placeholder
          })
        ).toThrowError(/cannot use a default, placeholder, phase-one, or example value/i);
      }
    }
  );

  it("accepts explicitly supplied non-placeholder production secrets", () => {
    const environment = readEnvironment({ ...productionBase, ...safeSecrets });

    expect(environment.CURSOR_SIGNING_SECRET).toBe(safeSecrets.CURSOR_SIGNING_SECRET);
    expect(environment.CORRECTION_FORM_HMAC_SECRET).toBe(safeSecrets.CORRECTION_FORM_HMAC_SECRET);
  });
});

describe("Next server startup registration", () => {
  it("fails registration before readiness when a production secret is absent", async () => {
    for (const [name, value] of Object.entries({ ...productionBase, ...safeSecrets })) {
      if (value !== undefined) vi.stubEnv(name, value);
    }
    vi.stubEnv("CORRECTION_FORM_HMAC_SECRET", undefined);
    vi.resetModules();

    const { register } = await import("@/instrumentation");

    expect(() => register()).toThrowError(
      /CORRECTION_FORM_HMAC_SECRET must be explicitly supplied in production/
    );
  });

  it("fails registration before readiness when a production secret is a placeholder", async () => {
    for (const [name, value] of Object.entries({ ...productionBase, ...safeSecrets })) {
      if (value !== undefined) vi.stubEnv(name, value);
    }
    vi.stubEnv("CORRECTION_FORM_HMAC_SECRET", "example-correction-production-secret-000000000000");
    vi.resetModules();

    const { register } = await import("@/instrumentation");

    expect(() => register()).toThrowError(
      /CORRECTION_FORM_HMAC_SECRET cannot use a default, placeholder, phase-one, or example value/
    );
  });
});
