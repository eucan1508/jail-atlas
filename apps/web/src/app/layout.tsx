import "@jail-atlas/ui/styles.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { readEnvironment, shouldNoIndex } from "@/lib/env";
import { absoluteUrl, publisherGraph } from "@/lib/site";

export function generateMetadata(): Metadata {
  const environment = readEnvironment();
  const noIndex = shouldNoIndex(environment);

  return {
    metadataBase: new URL(environment.PRODUCTION_DOMAIN),
    applicationName: environment.BRAND_NAME,
    title: {
      default: `${environment.BRAND_NAME} — Verified county custody sources`,
      template: `%s | ${environment.BRAND_NAME}`
    },
    description: "Check the scope, source, and freshness of verified county custody information.",
    alternates: { canonical: absoluteUrl("/") },
    robots: {
      index: !noIndex,
      follow: !noIndex
    }
  };
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f5f5ef",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const environment = readEnvironment();

  return (
    <html lang={environment.DEFAULT_LOCALE}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader brandName={environment.BRAND_NAME} />
        {children}
        <SiteFooter brandName={environment.BRAND_NAME} />
        <JsonLd data={{ "@context": "https://schema.org", "@graph": publisherGraph() }} />
      </body>
    </html>
  );
}
