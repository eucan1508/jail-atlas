import "server-only";

import { getCountyRosterStatus, getLiveCountySource } from "./live-roster";
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
 * Counties whose pages stay public: live ones and approved ones paused because their latest
 * snapshot is too old. A paused page keeps its guide and drops only the roster.
 */
export async function getIndexedCountyCoverage(): Promise<readonly CountyCoverageBrief[]> {
  const results = await Promise.all(
    countyCoverageCatalog.map(async (entry) => {
      try {
        return (await getCountyRosterStatus(entry)) ? entry : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((entry): entry is CountyCoverageBrief => entry !== null);
}
