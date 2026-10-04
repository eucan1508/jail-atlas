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

export function robotsRules(blocked: boolean): MetadataRoute.Robots["rules"] {
  return blocked
    ? [{ userAgent: "*", disallow: "/" }]
    : [
        { userAgent: "*", allow: "/" },
        { userAgent: [...answerEngineCrawlers], allow: "/" }
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
