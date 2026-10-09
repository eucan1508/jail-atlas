import type { MetadataRoute } from "next";
import { hasPublishedScottCounty } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, trustPaths } from "@/lib/site";

export const dynamic = "force-dynamic";

export function indexableSitemapPaths(): string[] {
  const paths = ["/", "/coverage/", ...trustPaths];

  if (hasPublishedScottCounty()) paths.push("/iowa/scott-county/custody/");

  return Array.from(new Set(paths));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await getPublishedCountyCoverage();
  const paths = new Set(indexableSitemapPaths());
  for (const county of published) paths.add(county.path);
  const publishedStates = new Set(published.map(({ entry }) => entry.state));
  if (publishedStates.has("iowa")) paths.add("/coverage/iowa/");
  if (publishedStates.has("minnesota")) paths.add("/coverage/minnesota/");
  if (publishedStates.has("texas")) paths.add("/coverage/texas/");
  if (publishedStates.has("arkansas")) paths.add("/coverage/arkansas/");
  if (publishedStates.has("oklahoma")) paths.add("/coverage/oklahoma/");
  return Array.from(paths).map((path) => ({ url: absoluteUrl(path) }));
}
