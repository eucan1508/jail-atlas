import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PRODUCTION_PORT ?? "3200");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/production",
  outputDir: "../../artifacts/playwright-production",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: `corepack pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
