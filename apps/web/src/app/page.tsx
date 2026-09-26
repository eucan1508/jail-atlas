import Link from "next/link";
import { Alert, LinkButton, StatusPill } from "@jail-atlas/ui";
import { CountyFinder } from "@/components/county-finder";
import { JsonLd } from "@/components/json-ld";
import { canRenderSyntheticScottCounty } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  path: "/",
  title: "Verify county custody information",
  description:
    "Find a county custody page and check its official source, data scope, freshness, and review status."
});

export default async function HomePage() {
  const prototypeAvailable = canRenderSyntheticScottCounty();
  const published = await getPublishedCountyCoverage();
  const showFinder = prototypeAvailable || published.length > 0;

  return (
    <main id="main-content">
      <section className="home-hero site-shell">
        <div className="home-hero__copy">
          <p className="eyebrow">Evidence before coverage</p>
          <h1>Check custody information with the source and timestamp in view.</h1>
          <p>
            This independent utility is designed to show what an official roster covers, when it
            last worked, and how each source was verified. It is not a government website.
          </p>
        </div>
        <div className="home-hero__finder">
          <h2>Find a county custody page</h2>
          {showFinder ? (
            <CountyFinder
              counties={published.length ? published.map(({ entry }) => entry) : undefined}
            />
          ) : (
            <Alert heading="No county is published yet" tone="info">
              Coverage appears only after every source, parser, contact, evidence, and human-review
              gate passes.
            </Alert>
          )}
        </div>
      </section>

      {prototypeAvailable ? (
        <section className="site-shell phase-banner" aria-labelledby="phase-banner-title">
          <Alert heading="Phase 1 demonstration — synthetic data only" tone="warning">
            <p id="phase-banner-title">
              The Scott County vertical slice uses fictional records and no live source. It is
              blocked from production, excluded from the sitemap, and is not current custody
              information.
            </p>
          </Alert>
        </section>
      ) : null}

      <section className="home-section site-shell" aria-labelledby="coverage-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Verified coverage</p>
            <h2 id="coverage-heading">Coverage stays deliberately small</h2>
          </div>
          <Link href="/coverage/">View coverage status</Link>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <strong className="stat__value">{published.length}</strong>
            <span className="stat__label">published counties</span>
          </div>
          <div className="stat">
            <strong className="stat__value">{published.length}</strong>
            <span className="stat__label">healthy official sources</span>
          </div>
          <div className="stat">
            <strong className="stat__value">Iowa only</strong>
            <span className="stat__label">approved geographic scope</span>
          </div>
        </div>
        {prototypeAvailable ? (
          <div className="prototype-row">
            <div>
              <StatusPill tone="stale">Not publishable</StatusPill>
              <h3>Scott County interaction prototype</h3>
              <p>Exercises roster pagination and evidence states without an official connection.</p>
            </div>
            <LinkButton href="/iowa/scott-county/custody/" variant="secondary">
              Open synthetic prototype
            </LinkButton>
          </div>
        ) : null}
      </section>

      <section className="home-section home-section--tinted">
        <div className="site-shell">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">How confidence is earned</p>
              <h2>Three checks remain visible</h2>
            </div>
          </div>
          <ol className="confidence-steps">
            <li>
              <span>01</span>
              <h3>Official relationship</h3>
              <p>
                Documentary evidence must connect the roster to a county, sheriff, jail, detention
                authority, or its explicitly linked vendor.
              </p>
            </li>
            <li>
              <span>02</span>
              <h3>Fetch and interpretation</h3>
              <p>
                A valid empty roster, a request failure, a parser failure, and stale data are never
                collapsed into the same message.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Human publication review</h3>
              <p>
                Contacts, scope, field provenance, local guidance, fixtures, and regression tests
                must be reviewed before a county can appear publicly.
              </p>
            </li>
          </ol>
        </div>
      </section>

      <section className="home-section site-shell action-pair" aria-labelledby="trust-heading">
        <div>
          <p className="eyebrow">Traceable by design</p>
          <h2 id="trust-heading">Inspect the method or flag a concern</h2>
          <p>
            Read the publication gates, freshness rules, automation boundaries, and correction
            process without opening a roster.
          </p>
        </div>
        <div className="button-row">
          <LinkButton href="/methodology/">Read the methodology</LinkButton>
          <LinkButton href="/corrections/" variant="secondary">
            Report a concern
          </LinkButton>
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": absoluteUrl("/#page"),
          url: absoluteUrl("/"),
          name: "Verify county custody information",
          description:
            "Find a county custody page and check its official source, scope, and freshness.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
