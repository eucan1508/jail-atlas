import Link from "next/link";
import { Alert } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { countiesForState } from "@/lib/coverage-catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

const counties = countiesForState("minnesota");

export const metadata = createPageMetadata({
  path: "/coverage/minnesota/",
  title: "Minnesota custody source coverage",
  description:
    "Review the proposed Minnesota county custody sources, audit status, and publication gates.",
  index: false
});

export default function MinnesotaCoveragePage() {
  return (
    <main id="main-content" className="page-main site-shell">
      <Breadcrumbs
        currentPath="/coverage/minnesota/"
        items={[{ href: "/", label: "Home" }, { href: "/coverage/", label: "Coverage" }, { label: "Minnesota" }]}
      />
      <PageIntro
        eyebrow="Minnesota · proposed second state"
        title="Minnesota custody source coverage"
        summary={
          <p>
            Five county sources are selected for audit. Each county page remains private and
            non-indexed until its official relationship, parser, freshness, retention, and human
            review gates pass.
          </p>
        }
      />

      <Alert heading="Source audit in progress" tone="warning">
        No Minnesota roster is published from this page yet. The links below go to the official
        county sources that will be used for the source-specific adapter review.
      </Alert>

      <section className="content-section" aria-labelledby="county-list-heading">
        <h2 id="county-list-heading">Proposed counties</h2>
        <div className="coverage-grid">
          {counties.map((county) => (
            <article className="surface-card coverage-state-row" key={county.slug}>
              <div>
                <p className="eyebrow">{county.seatCity}</p>
                <h3>{county.county}</h3>
                <p>{county.article}</p>
              </div>
              <div className="button-row">
                <Link href={`/${county.state}/${county.slug}/custody/`}>Review page brief</Link>
                <a href={county.officialSourceUrl} rel="noreferrer" target="_blank">
                  Official source
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": absoluteUrl("/coverage/minnesota/#page"),
          url: absoluteUrl("/coverage/minnesota/"),
          name: "Minnesota custody source coverage",
          description: "Proposed Minnesota county custody coverage and source audit status.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
