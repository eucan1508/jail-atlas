import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { robotsRules } from "@/app/robots";
import { readEnvironment, shouldNoIndex } from "@/lib/env";

const reservedProductionOrigin = "https://custody.example.test";

function productionEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    APP_ENV: "production",
    BRAND_NAME: "Test Custody Utility",
    CORRECTION_FORM_HMAC_SECRET: "test-correction-secret-at-least-32-characters",
    CURSOR_SIGNING_SECRET: "test-cursor-secret-that-is-at-least-32-chars",
    DATA_MODE: "official",
    DEFAULT_LOCALE: "en-US",
    PRODUCTION_DOMAIN: reservedProductionOrigin,
    VERCEL_ENV: "production"
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("robots environment policy", () => {
  it("uses robots.txt as a crawl hint instead of route-level noindex enforcement", () => {
    expect(robotsRules(false)).toEqual([{ userAgent: "*", allow: "/" }]);
    expect(robotsRules(true)).toEqual([{ userAgent: "*", disallow: "/" }]);
  });

  it.each([
    { APP_ENV: "development", DATA_MODE: "synthetic", VERCEL_ENV: undefined },
    { APP_ENV: "test", DATA_MODE: "synthetic", VERCEL_ENV: undefined },
    { APP_ENV: "staging", DATA_MODE: "synthetic", VERCEL_ENV: undefined },
    { APP_ENV: "production", DATA_MODE: "official", VERCEL_ENV: "preview" }
  ] as const)("keeps $APP_ENV/$VERCEL_ENV deployments noindex", (overrides) => {
    const environment = readEnvironment({
      ...productionEnvironment(),
      ...overrides
    });

    expect(shouldNoIndex(environment)).toBe(true);
  });

  it("allows indexing only for official-data production", () => {
    const environment = readEnvironment(productionEnvironment());

    expect(shouldNoIndex(environment)).toBe(false);
  });

  it("does not emit a site-wide noindex header in official-data production", async () => {
    for (const [name, value] of Object.entries(productionEnvironment())) {
      if (value !== undefined) {
        vi.stubEnv(name, value);
      }
    }
    const { proxy } = await import("@/proxy");

    const response = proxy(new NextRequest(`${reservedProductionOrigin}/methodology/`));
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });

  it("emits noindex and nofollow on preview responses", async () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("DATA_MODE", "synthetic");
    vi.stubEnv("VERCEL_ENV", "preview");
    const { proxy } = await import("@/proxy");

    const response = proxy(new NextRequest("https://example.test/methodology/"));
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, nosnippet");
  });

  it("generates indexable metadata in official-data production", async () => {
    for (const [name, value] of Object.entries(productionEnvironment())) {
      if (value !== undefined) {
        vi.stubEnv(name, value);
      }
    }
    const { createPageMetadata } = await import("@/lib/site");
    const metadata = createPageMetadata({
      path: "/methodology/",
      title: "Methodology",
      description: "How official sources and freshness are verified."
    });

    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates).toMatchObject({
      canonical: `${reservedProductionOrigin}/methodology/`
    });
  });
});
