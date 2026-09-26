import "server-only";

import { getLiveCountySource } from "./live-roster";
import {
  countyCoverageCatalog,
  countyCoveragePath,
  type CountyCoverageBrief,
  type CoverageState
} from "./coverage-catalog";

export type PublishedCountyCoverage = Readonly<{
  entry: CountyCoverageBrief;
  path: string;
}>;

/**
 * Reads the same publication gate used by county roster pages. A database outage must not turn
 * public navigation into a 500; it simply makes the affected county temporarily unavailable.
 */
export async function getPublishedCountyCoverage(
  state?: CoverageState
): Promise<readonly PublishedCountyCoverage[]> {
  const candidates = state
    ? countyCoverageCatalog.filter((entry) => entry.state === state)
    : countyCoverageCatalog;

  const results = await Promise.all(
    candidates.map(async (entry) => {
      try {
        const source = await getLiveCountySource(entry);
        return source ? { entry, path: countyCoveragePath(entry) } : null;
      } catch {
        return null;
      }
    })
  );

  return results.filter((result): result is PublishedCountyCoverage => result !== null);
}
