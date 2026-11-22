import type { CountyRosterStatus } from "./live-roster";

/**
 * A county page is indexed and listed in the sitemap only while it shows a current roster with at
 * least one person. A paused source (no recent refresh) or an empty list makes the page noindex
 * and drops it from the sitemap; the next successful refresh brings it back on its own.
 * A database outage says nothing about the source, so those pages stay indexed meanwhile.
 */
export function isIndexableRosterStatus(status: CountyRosterStatus | null): boolean {
  if (status?.kind === "unavailable") return true;
  return status?.kind === "live" && status.source.recordCount > 0;
}
