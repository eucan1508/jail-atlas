import { spawnSync } from "node:child_process";

const productionEnvironment = {
  ...process.env,
  APP_ENV: "production",
  BRAND_NAME: "Production Smoke Custody Utility",
  CORRECTION_FORM_HMAC_SECRET: "4cf4424efc39431c880c862c6fa13acb47a5ec7bba8f402a9dc9715284665559",
  CURSOR_SIGNING_SECRET: "fb00f3e9ab034b11b75dbaf84691bb7c090081a7c5014d289185986c19d02bf3",
  DATA_MODE: "official",
  DEFAULT_LOCALE: "en-US",
  NODE_ENV: "production",
  PLAYWRIGHT_PRODUCTION_PORT: process.env.PLAYWRIGHT_PRODUCTION_PORT ?? "3200",
  PRODUCTION_DOMAIN: "https://production-smoke.invalid",
  VERCEL_ENV: "production"
};

function runCorepack(arguments_) {
  const windows = process.platform === "win32";
  const command = windows ? (process.env.ComSpec ?? "cmd.exe") : "corepack";
  const commandArguments = windows
    ? ["/d", "/s", "/c", `corepack ${arguments_.join(" ")}`]
    : arguments_;
  const result = spawnSync(command, commandArguments, {
    cwd: process.cwd(),
    env: productionEnvironment,
    stdio: "inherit"
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runCorepack(["pnpm", "--workspace-root", "build:packages"]);
runCorepack(["pnpm", "exec", "next", "build"]);
runCorepack(["pnpm", "exec", "playwright", "test", "--config=playwright.production.config.ts"]);
