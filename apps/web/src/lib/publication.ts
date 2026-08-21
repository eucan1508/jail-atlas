import { isProductionEnvironment, readEnvironment, type AppEnvironment } from "./env";

/**
 * Phase 1 deliberately has no publishable county. This boundary keeps the synthetic vertical slice
 * usable in local/test environments while making it impossible for production mode to render it.
 * Phase 2 must replace this with a database-backed publication-gate query after approval.
 */
export function canRenderSyntheticScottCounty(): boolean {
  return process.env.NODE_ENV !== "production" && readEnvironment().DATA_MODE === "synthetic";
}

export function hasPublishedScottCounty(): boolean {
  return false;
}

export function hasPublishedIowaCoverage(): boolean {
  return hasPublishedScottCounty();
}

/**
 * An inactive state prototype is inspectable locally, but the canonical route must not exist in a
 * production deployment until a county has passed every publication gate.
 */
export function canRenderIowaCoverage(environment: AppEnvironment = readEnvironment()): boolean {
  return !isProductionEnvironment(environment) || hasPublishedIowaCoverage();
}
