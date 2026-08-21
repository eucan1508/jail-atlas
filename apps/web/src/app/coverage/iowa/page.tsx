import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, StatusPill } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CountyFinder } from "@/components/county-finder";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import {
  canRenderIowaCoverage,
  canRenderSyntheticScottCounty,
  hasPublishedIowaCoverage
} from "@/lib/publication";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/coverage/iowa/",
  title: "Iowa custody source coverage",
  description: "Review active Iowa county custody coverage, source health, and verification status.",
  index: hasPublishedIowaCoverage()
});

export default function IowaCoveragePage() {
  if (!canRenderIowaCoverage()) notFound();

  const prototypeAvailable = canRenderSyntheticScottCounty();
  const countyPublished = hasPublishedIowaCoverage();

  return (
    <main id="main-content" className="page-main site-shell">
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
        title="Iowa custody source coverage"
        summary={
          <p>
            Coverage is limited to counties with a working current-custody source, documented official
            relationship, source-specific tests, verified contacts, and completed human review.
          </p>
        }
      />

      {prototypeAvailable ? (
        <Alert heading="Development checkpoint only" tone="warning">
          No Iowa county is published. The Scott County link below opens synthetic, fictional records
          for Phase 1 review and is excluded from indexing.
        </Alert>
      ) : null}

      <section className="content-section" aria-labelledby="health-heading">
        <h2 id="health-heading">Source health summary</h2>
        <div className="stat-grid">
          <div className="stat">
            <strong className="stat__value">{countyPublished ? "1" : "0"}</strong>
            <span className="stat__label">published counties</span>
          </div>
          <div className="stat">
            <strong className="stat__value">{countyPublished ? "1" : "0"}</strong>
            <span className="stat__label">successful live sources</span>
          </div>
          <div className="stat">
            <strong className="stat__value">Not recorded</strong>
            <span className="stat__label">last official verification</span>
          </div>
        </div>
      </section>

      {prototypeAvailable ? (
        <section className="content-section" aria-labelledby="prototype-heading">
          <div className="section-heading-row">
            <div>
              <StatusPill tone="stale">Synthetic · not verified</StatusPill>
              <h2 id="prototype-heading">Scott County interaction prototype</h2>
              <p className="prose">
                A source relationship, live fetch, verified contact, and publication review have not
                been recorded. It must not be treated as custody information.
              </p>
            </div>
            <Link href="/iowa/scott-county/custody/">Review the prototype</Link>
          </div>
          <CountyFinder compact />
        </section>
      ) : null}

      <section className="content-section prose" aria-labelledby="meaning-heading">
        <h2 id="meaning-heading">How to read this page</h2>
        <p>
          “Published” is a publication decision. “Healthy” describes the most recent source check.
          “Fresh” compares the last successful source result with the source-specific freshness
          threshold. Those labels are deliberately separate so a valid empty roster cannot be mistaken
          for a failed request.
        </p>
        <p>
          <Link href="/methodology/">See how source health and freshness are calculated</Link>.
        </p>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": absoluteUrl("/coverage/iowa/#page"),
          url: absoluteUrl("/coverage/iowa/"),
          name: "Iowa custody source coverage",
          description: "Active Iowa custody source coverage and verification status.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
