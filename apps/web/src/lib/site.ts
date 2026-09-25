import type { Metadata } from "next";
import { readEnvironment, shouldNoIndex } from "./env";

export const publicPaths = [
  "/",
  "/coverage/",
  "/coverage/iowa/",
  "/coverage/minnesota/",
  "/iowa/scott-county/custody/",
  "/about/",
  "/methodology/",
  "/source-policy/",
  "/corrections/",
  "/privacy/",
  "/cookies/",
  "/terms/",
  "/disclaimer/"
] as const;

export const trustPaths = [
  "/about/",
  "/methodology/",
  "/source-policy/",
  "/corrections/",
  "/privacy/",
  "/cookies/",
  "/terms/",
  "/disclaimer/"
] as const;

export function absoluteUrl(path: string): string {
  const { PRODUCTION_DOMAIN } = readEnvironment();
  return new URL(path, `${PRODUCTION_DOMAIN}/`).toString();
}

export function createPageMetadata({
  description,
  index = true,
  path,
  title
}: {
  description: string;
  index?: boolean;
  path: string;
  title: string;
}): Metadata {
  const environment = readEnvironment();
  const allowIndex = index && !shouldNoIndex(environment);

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: {
      index: allowIndex,
      follow: allowIndex,
      googleBot: {
        index: allowIndex,
        follow: allowIndex,
        noimageindex: true,
        "max-image-preview": "none",
        "max-snippet": allowIndex ? -1 : 0
      }
    }
  };
}

export function publisherGraph() {
  const environment = readEnvironment();
  const publisherId = absoluteUrl("/#publisher");

  return [
    {
      "@type": "Organization",
      "@id": publisherId,
      name: environment.BRAND_NAME,
      url: absoluteUrl("/"),
      description:
        "An independent public-information publisher that verifies official custody sources.",
      sameAs: []
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: environment.BRAND_NAME,
      url: absoluteUrl("/"),
      publisher: { "@id": publisherId },
      inLanguage: environment.DEFAULT_LOCALE
    }
  ];
}
