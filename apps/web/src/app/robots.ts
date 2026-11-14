import type { MetadataRoute } from "next";
import { readEnvironment, shouldNoIndex } from "@/lib/env";
import { absoluteUrl } from "@/lib/site";

// Search and answer-engine crawlers are named explicitly so the policy is unambiguous to each.
export const answerEngineCrawlers = [
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot"
] as const;

// Data collectors that send no visitors: AI dataset and API crawlers and SEO tools. Each request
// renders a page on the server, so they are asked not to crawl. Bytespider does not follow
// robots.txt and is also refused in proxy.ts.
export const blockedCrawlers = [
  "ShapBot",
  "ExaSearchBot",
  "ElevenlabsCrawler",
  "Bytespider",
  "PetalBot",
  "Amazonbot",
  "AhrefsBot",
  "SemrushBot"
] as const;

export function robotsRules(blocked: boolean): MetadataRoute.Robots["rules"] {
  return blocked
    ? [{ userAgent: "*", disallow: "/" }]
    : [
        { userAgent: "*", allow: "/" },
        { userAgent: [...answerEngineCrawlers], allow: "/" },
        { userAgent: [...blockedCrawlers], disallow: "/" }
      ];
}

export default function robots(): MetadataRoute.Robots {
  const environment = readEnvironment();
  const blocked = shouldNoIndex(environment);

  return {
    // robots.txt is only a crawl hint. Non-public routes are protected by route absence, metadata,
    // or X-Robots-Tag even when a crawler ignores this file.
    rules: robotsRules(blocked),
    sitemap: absoluteUrl("/sitemap.xml")
  };
}
