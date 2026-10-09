import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CountyCoverageCard } from "@/components/county-coverage-card";
import { CountyFinder } from "@/components/county-finder";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { StateFaq } from "@/components/state-faq";
import {
  countiesForState,
  countyCoveragePath,
  coveragePreviewAllowed
} from "@/lib/coverage-catalog";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const published = await getPublishedCountyCoverage("oklahoma");
  return createPageMetadata({
    path: "/coverage/oklahoma/",
    title: "Oklahoma County Jail Rosters",
    description:
      "Find Oklahoma county jail rosters by county or city with official source context and visible data limits.",
    index: published.length > 0
  });
}

export default async function OklahomaCoveragePage() {
  const published = await getPublishedCountyCoverage("oklahoma");
  const preview = coveragePreviewAllowed();
  if (published.length === 0 && !preview) notFound();
  const counties =
    published.length > 0
      ? published
      : countiesForState("oklahoma").map((entry) => ({
          entry,
          path: countyCoveragePath(entry)
        }));

  return (
    <main
      id="main-content"
      className="page-main site-shell state-coverage-page state-coverage-page--oklahoma"
    >
      <Breadcrumbs
        currentPath="/coverage/oklahoma/"
        items={[
          { href: "/", label: "Home" },
          { href: "/coverage/", label: "Coverage" },
          { label: "Oklahoma" }
        ]}
      />
      <PageIntro
        eyebrow="Oklahoma"
        title="Oklahoma county jail rosters"
        summary={
          <p>
            Browse reviewed Oklahoma county sources. Candidate pages stay out of production until
            the official source, parser, freshness rules, and publication decision pass review.
          </p>
        }
      />

      <section className="content-section state-search-section" aria-label="State county finder">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Find a county</p>
            <h2 id="state-search-heading">Search Oklahoma county jails</h2>
            <p className="section-lede">Search by county or city to open the available page.</p>
          </div>
        </div>
        <CountyFinder
          counties={counties.map(({ entry }) => entry)}
          label="Search Oklahoma county jails"
          placeholder="Enter an Oklahoma county or city"
        />
      </section>

      <section className="content-section" aria-labelledby="county-list-heading">
        <h2 id="county-list-heading">
          {published.length > 0 ? "Published counties" : "Counties under review"}
        </h2>
        <div className="coverage-grid coverage-grid--counties">
          {counties.map(({ entry, path }) => (
            <CountyCoverageCard
              actionLabel={published.length > 0 ? "View custody page" : "View preview"}
              entry={entry}
              href={path}
              key={entry.slug}
              published={published.length > 0}
            />
          ))}
        </div>
      </section>

      <StateFaq state="oklahoma" />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": absoluteUrl("/coverage/oklahoma/#page"),
          url: absoluteUrl("/coverage/oklahoma/"),
          name: "Oklahoma County Jail Rosters",
          description: "Oklahoma county jail roster coverage with official source context.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
