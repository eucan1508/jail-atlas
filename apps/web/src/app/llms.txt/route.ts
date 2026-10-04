import { readEnvironment, shouldNoIndex } from "@/lib/env";
import { findCountyGuide } from "@/lib/county-guides";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, trustPaths } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * A plain-text site map for AI crawlers (https://llmstxt.org). It lists only county pages that
 * pass the same publication gate as the sitemap.
 */
export async function GET(): Promise<Response> {
  const environment = readEnvironment();
  if (shouldNoIndex(environment)) {
    return new Response("Not found\n", { status: 404 });
  }

  const published = await getPublishedCountyCoverage();
  const counties = published.map(({ entry, liveSource, path }) => {
    const facility = findCountyGuide(entry.state, entry.slug)?.facilityName ?? entry.county;
    return `- [${entry.h1}](${absoluteUrl(path)}): ${facility}, ${entry.seatCity}, ${entry.stateName}. ${liveSource.recordCount} people on the official roster at the last capture.`;
  });

  const body = [
    `# ${environment.BRAND_NAME}`,
    "",
    "> County jail rosters and facility guides built from official sheriff and county sources. Each county page shows who is currently in custody with source-listed charges, the time of the last successful capture, and verified instructions for visits, deposits, mail, and bail.",
    "",
    "Rosters refresh daily. A jail roster is a custody record, not a court record or proof of guilt.",
    "",
    "## County jail pages",
    "",
    ...counties,
    "",
    "## How the data is handled",
    "",
    ...trustPaths.map((path) => `- ${absoluteUrl(path)}`),
    ""
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
