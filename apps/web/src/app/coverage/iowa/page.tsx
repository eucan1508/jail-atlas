import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CountyCoverageCard } from "@/components/county-coverage-card";
import { CountyFinder } from "@/components/county-finder";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { StateFaq } from "@/components/state-faq";
import { canRenderIowaCoverage } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const published = await getPublishedCountyCoverage("iowa");
  return createPageMetadata({
    path: "/coverage/iowa/",
    title: "Iowa County Jail Rosters",
    description:
      "Find Iowa county jail rosters by county or city. Search available custody records and review booking details, charges, and the last update time.",
    index: published.length > 0
  });
}

export default async function IowaCoveragePage() {
  const published = await getPublishedCountyCoverage("iowa");
  if (!canRenderIowaCoverage() && published.length === 0) notFound();

  return (
    <main id="main-content" className="page-main site-shell state-coverage-page state-coverage-page--iowa">
      <Breadcrumbs
        currentPath="/coverage/iowa/"
        items={[
          { href: "/", label: "Home" },
          { href: "/coverage/", label: "Coverage" },
          { label: "Iowa" }
        ]}
      />
      <PageIntro
        eyebrow="Iowa"
        title="Iowa county jail rosters"
        summary={
          <p>
            Find a county jail roster in Iowa. Published pages include searchable custody records,
            available booking details, source-listed charges, and a timestamp for the latest
            capture.
          </p>
        }
      />

      <section className="content-section state-search-section" aria-label="State county finder">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Find a county</p>
            <h2 id="state-search-heading">Search Iowa county jails</h2>
            <p className="section-lede">
              Search by county or city to open a published Iowa custody page.
            </p>
          </div>
        </div>
        <CountyFinder
          counties={published.map(({ entry }) => entry)}
          label="Search Iowa county jails"
          placeholder="Enter an Iowa county or city"
        />
      </section>

      <section className="content-section" aria-labelledby="planned-heading">
        <h2 id="planned-heading">Selected Iowa counties</h2>
        <div className="coverage-grid coverage-grid--counties">
          {published.map(({ entry: county, path }) => (
            <CountyCoverageCard
              entry={county}
              href={path}
              key={county.slug}
              published
            />
          ))}
        </div>
      </section>

      <section className="content-section prose" aria-labelledby="meaning-heading">
        <h2 id="meaning-heading">How to read this page</h2>
        <p>
          “Published” is a publication decision. “Healthy” describes the most recent source check.
          “Fresh” compares the last successful source result with the source-specific freshness
          threshold. Those labels are deliberately separate so a valid empty roster cannot be
          mistaken for a failed request.
        </p>
        <p>
          <Link href="/methodology/">See how source health and freshness are calculated</Link>.
        </p>
      </section>

      <StateFaq state="iowa" />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": absoluteUrl("/coverage/iowa/#page"),
          url: absoluteUrl("/coverage/iowa/"),
          name: "Iowa County Jail Rosters",
          description:
            "Published Iowa county jail rosters with official source context and update times.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
