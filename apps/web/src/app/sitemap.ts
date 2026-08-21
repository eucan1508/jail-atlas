import type { MetadataRoute } from "next";
import { hasPublishedIowaCoverage, hasPublishedScottCounty } from "@/lib/publication";
import { absoluteUrl, trustPaths } from "@/lib/site";

export function indexableSitemapPaths(): string[] {
  const paths = ["/", "/coverage/", ...trustPaths];

  if (hasPublishedIowaCoverage()) paths.push("/coverage/iowa/");
  if (hasPublishedScottCounty()) paths.push("/iowa/scott-county/custody/");

  return Array.from(new Set(paths));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableSitemapPaths().map((path) => ({ url: absoluteUrl(path) }));
}
