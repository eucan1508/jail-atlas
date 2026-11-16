import type { Metadata } from "next";
import { readEnvironment, shouldNoIndex } from "./env";

export const publicPaths = [
  "/",
  "/coverage/",
  "/coverage/iowa/",
  "/coverage/minnesota/",
  "/coverage/texas/",
  "/coverage/arkansas/",
  "/coverage/oklahoma/",
  "/coverage/missouri/",
  "/coverage/kansas/",
  "/coverage/alabama/",
  "/coverage/florida/",
  "/iowa/scott-county/custody/",
  "/about/",
  "/contact/",
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
  "/contact/",
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
  follow,
  path,
  title
}: {
  description: string;
  index?: boolean;
  /** Let crawlers follow links on a page kept out of the index; defaults to the index value. */
  follow?: boolean;
  path: string;
  title: string;
}): Metadata {
  const environment = readEnvironment();
  const allowIndex = index && !shouldNoIndex(environment);
  const allowFollow = (follow ?? index) && !shouldNoIndex(environment);

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: environment.BRAND_NAME
    },
    twitter: {
      card: "summary",
      title,
      description
    },
    robots: {
      index: allowIndex,
      follow: allowFollow,
      googleBot: {
        index: allowIndex,
        follow: allowFollow,
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
      logo: absoluteUrl("/icon.svg"),
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
