import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const port = Number(process.env.PLAYWRIGHT_PORT ?? "3100");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: path.resolve(import.meta.dirname, "../../artifacts/playwright"),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "../../artifacts/playwright-report", open: "never" }]]
    : "line",
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL,
    colorScheme: "light",
    contextOptions: { reducedMotion: "reduce" },
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: "**/*.mobile.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1024 }
      }
    },
    {
      name: "mobile-chromium",
      testMatch: "**/*.mobile.spec.ts",
      use: {
        ...devices["Pixel 7"]
      }
    }
  ],
  webServer: {
    command: `corepack pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      APP_ENV: "test",
      BRAND_NAME: "Test Custody Utility",
      CORRECTION_FORM_HMAC_SECRET: "test-correction-secret-at-least-32-characters",
      CURSOR_SIGNING_SECRET: "test-cursor-secret-that-is-at-least-32-chars",
      DATA_MODE: "synthetic",
      DEFAULT_LOCALE: "en-US",
      PRODUCTION_DOMAIN: "https://example.test"
    }
  }
});
