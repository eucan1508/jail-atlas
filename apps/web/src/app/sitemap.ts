import type { MetadataRoute } from "next";
import { hasPublishedIowaCoverage, hasPublishedScottCounty } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, trustPaths } from "@/lib/site";

export function indexableSitemapPaths(): string[] {
  const paths = ["/", "/coverage/", ...trustPaths];

  if (hasPublishedIowaCoverage()) paths.push("/coverage/iowa/");
  if (hasPublishedScottCounty()) paths.push("/iowa/scott-county/custody/");

  return Array.from(new Set(paths));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await getPublishedCountyCoverage();
  const paths = new Set(indexableSitemapPaths());
  for (const county of published) paths.add(county.path);
  if (published.some(({ entry }) => entry.state === "iowa")) paths.add("/coverage/iowa/");
  return Array.from(paths).map((path) => ({ url: absoluteUrl(path) }));
}
