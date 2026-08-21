import { describe, expect, it } from "vitest";
import { readEnvironment } from "@/lib/env";
import { canRenderIowaCoverage, hasPublishedIowaCoverage } from "@/lib/publication";

const productionEnvironment = readEnvironment({
  NODE_ENV: "production",
  APP_ENV: "production",
  BRAND_NAME: "Production Test Utility",
  CORRECTION_FORM_HMAC_SECRET: "4cf4424efc39431c880c862c6fa13acb47a5ec7bba8f402a9dc9715284665559",
  CURSOR_SIGNING_SECRET: "fb00f3e9ab034b11b75dbaf84691bb7c090081a7c5014d289185986c19d02bf3",
  DATA_MODE: "official",
  DEFAULT_LOCALE: "en-US",
  PRODUCTION_DOMAIN: "https://production-smoke.invalid",
  VERCEL_ENV: "production"
});

describe("inactive Iowa publication boundary", () => {
  it("does not expose Iowa coverage in production without a published county", () => {
    expect(hasPublishedIowaCoverage()).toBe(false);
    expect(canRenderIowaCoverage(productionEnvironment)).toBe(false);
  });

  it("keeps the inactive Iowa prototype available in local development only", () => {
    const developmentEnvironment = readEnvironment({
      APP_ENV: "development",
      NODE_ENV: "development"
    });

    expect(canRenderIowaCoverage(developmentEnvironment)).toBe(true);
  });
});
