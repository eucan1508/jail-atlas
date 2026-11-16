import "server-only";

import { getCountyRosterStatus, getLiveCountySource } from "./live-roster";
import { isIndexableRosterStatus } from "./roster-indexing";
import {
  countyCoverageCatalog,
  countyCoveragePath,
  type CountyCoverageBrief,
  type CoverageState
} from "./coverage-catalog";

export type PublishedCountyCoverage = Readonly<{
  entry: CountyCoverageBrief;
  liveSource: NonNullable<Awaited<ReturnType<typeof getLiveCountySource>>>;
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
        return source ? { entry, liveSource: source, path: countyCoveragePath(entry) } : null;
      } catch {
        return null;
      }
    })
  );

  return results.filter((result): result is PublishedCountyCoverage => result !== null);
}

/**
 * Counties listed in the sitemap: only those showing a current roster with at least one person.
 * Paused counties (no recent refresh) and empty lists stay reachable but are left out until the
 * next successful refresh.
 */
export async function getIndexedCountyCoverage(): Promise<readonly CountyCoverageBrief[]> {
  const results = await Promise.all(
    countyCoverageCatalog.map(async (entry) => {
      try {
        return isIndexableRosterStatus(await getCountyRosterStatus(entry)) ? entry : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((entry): entry is CountyCoverageBrief => entry !== null);
}
