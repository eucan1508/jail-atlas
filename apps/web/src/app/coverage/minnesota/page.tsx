import { Alert } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CountyCoverageCard } from "@/components/county-coverage-card";
import { CountyFinder } from "@/components/county-finder";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { countiesForState } from "@/lib/coverage-catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/site";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const published = await getPublishedCountyCoverage("minnesota");
  return createPageMetadata({
    path: "/coverage/minnesota/",
    title: "Minnesota County Jail Rosters",
    description:
      "Find Minnesota county jail rosters by county or city. Search available detention records, review source-listed charges, and check when data was captured.",
    index: published.length > 0
  });
}

export default async function MinnesotaCoveragePage() {
  const counties = countiesForState("minnesota");
  const published = await getPublishedCountyCoverage("minnesota");
  const publishedSlugs = new Set(published.map(({ entry }) => entry.slug));
  const pending = counties.filter((county) => !publishedSlugs.has(county.slug));
  return (
    <main id="main-content" className="page-main site-shell">
      <Breadcrumbs
        currentPath="/coverage/minnesota/"
        items={[
          { href: "/", label: "Home" },
          { href: "/coverage/", label: "Coverage" },
          { label: "Minnesota" }
        ]}
      />
      <PageIntro
        eyebrow="Minnesota"
        title="Minnesota county jail rosters"
        summary={
          <p>
            Browse Minnesota county jail and adult detention rosters. Open a published county page
            to search names, review available booking details, and check the latest capture time.
          </p>
        }
      />

      <Alert
        heading={published.length > 0 ? "Active Minnesota coverage" : "Source audit in progress"}
        tone={published.length > 0 ? "info" : "warning"}
      >
        {published.length > 0
          ? `${published.length} Minnesota county page${published.length === 1 ? " is" : "s are"} currently public. Each page carries its capture time and review status.`
          : "No Minnesota roster is published from this page yet."}
      </Alert>

      <section className="content-section state-search-section" aria-label="State county finder">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Find a county</p>
            <h2 id="state-search-heading">Search Minnesota county jails</h2>
            <p className="section-lede">
              Search by county or city to open a published Minnesota custody page.
            </p>
          </div>
        </div>
        <CountyFinder
          counties={published.map(({ entry }) => entry)}
          label="Search Minnesota county jails"
          placeholder="Enter a Minnesota county or city"
        />
      </section>

      <section className="content-section" aria-labelledby="county-list-heading">
        <h2 id="county-list-heading">Published counties</h2>
        <div className="coverage-grid coverage-grid--counties">
          {published.map(({ entry, path }) => (
            <CountyCoverageCard
              actionLabel="View custody page"
              entry={entry}
              href={path}
              key={entry.slug}
              published
            />
          ))}
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="content-section" aria-labelledby="pending-heading">
          <h2 id="pending-heading">Additional sources under review</h2>
          <div className="coverage-grid coverage-grid--counties">
            {pending.map((county) => (
              <CountyCoverageCard
                entry={county}
                href={`/${county.state}/${county.slug}/custody/`}
                key={county.slug}
              />
            ))}
          </div>
        </section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": absoluteUrl("/coverage/minnesota/#page"),
          url: absoluteUrl("/coverage/minnesota/"),
          name: "Minnesota County Jail Rosters",
          description:
            "Published Minnesota county jail rosters with official source context and update times.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
