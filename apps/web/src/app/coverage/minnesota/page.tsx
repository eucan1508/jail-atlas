import Link from "next/link";
import { Alert } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
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
    title: "Minnesota custody source coverage",
    description: "Review active Minnesota county custody coverage and official source health.",
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
        items={[{ href: "/", label: "Home" }, { href: "/coverage/", label: "Coverage" }, { label: "Minnesota" }]}
      />
      <PageIntro
        eyebrow="Minnesota"
        title="Minnesota custody source coverage"
        summary={
          <p>
            Published counties appear only after their official relationship, parser, freshness,
            retention, and human review gates pass.
          </p>
        }
      />

      <Alert
        heading={published.length > 0 ? "Active Minnesota coverage" : "Source audit in progress"}
        tone={published.length > 0 ? "info" : "warning"}
      >
        {published.length > 0
          ? `${published.length} Minnesota county source${published.length === 1 ? " is" : "s are"} currently published. Verify time-sensitive information at the official source.`
          : "No Minnesota roster is published from this page yet."}
      </Alert>

      <section className="content-section" aria-labelledby="county-list-heading">
        <h2 id="county-list-heading">Published counties</h2>
        <div className="coverage-grid">
          {published.map(({ entry, path }) => (
            <article className="surface-card coverage-state-row" key={entry.slug}>
              <div>
                <p className="eyebrow">{entry.seatCity}</p>
                <h3>{entry.county}</h3>
                <p>{entry.description}</p>
              </div>
              <div className="button-row">
                <Link href={path}>View custody page</Link>
                <a href={entry.officialSourceUrl} rel="noreferrer" target="_blank">Official source</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="content-section" aria-labelledby="pending-heading">
          <h2 id="pending-heading">Additional sources under review</h2>
          <div className="coverage-grid">
            {pending.map((county) => (
              <article className="surface-card coverage-state-row" key={county.slug}>
                <div>
                  <p className="eyebrow">{county.seatCity}</p>
                  <h3>{county.county}</h3>
                  <p>{county.article}</p>
                </div>
                <a href={county.officialSourceUrl} rel="noreferrer" target="_blank">Official source</a>
              </article>
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
          name: "Minnesota custody source coverage",
          description: "Active Minnesota county custody coverage and official source health.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
