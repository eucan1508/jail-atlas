import "server-only";

import { getCountyRosterStatus, hasLiveAdapter, type LiveSource } from "./live-roster";
import { isIndexableRosterStatus } from "./roster-indexing";
import {
  countyCoverageCatalog,
  countyCoveragePath,
  type CountyCoverageBrief,
  type CoverageState
} from "./coverage-catalog";

export type PublishedCountyCoverage = Readonly<{
  entry: CountyCoverageBrief;
  /** Null only while the database cannot be reached; see getPublishedCountyCoverage. */
  liveSource: LiveSource | null;
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

  const statuses = await Promise.all(candidates.map((entry) => getCountyRosterStatus(entry)));
  // When the database cannot be reached, every approved county stays listed (without counts) so
  // navigation keeps working; each county page then says its roster is temporarily unavailable.
  return candidates.flatMap((entry, index): PublishedCountyCoverage[] => {
    const status = statuses[index];
    if (status?.kind === "live") {
      return [{ entry, liveSource: status.source, path: countyCoveragePath(entry) }];
    }
    if (status?.kind === "unavailable" && hasLiveAdapter(entry)) {
      return [{ entry, liveSource: null, path: countyCoveragePath(entry) }];
    }
    return [];
  });
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
