import Link from "next/link";
import { Alert, LinkButton } from "@jail-atlas/ui";
import { CountyFinder } from "@/components/county-finder";
import { JsonLd } from "@/components/json-ld";
import { canRenderSyntheticScottCounty } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  path: "/",
  title: "County Jail Rosters by State",
  description:
    "Search county jail rosters in Iowa and Minnesota. Find custody records, available booking details, source-listed charges, and the latest capture time."
});

export default async function HomePage() {
  const prototypeAvailable = canRenderSyntheticScottCounty();
  const published = await getPublishedCountyCoverage();
  const stateDirectory = [
    { code: "IA", name: "Iowa", slug: "iowa" },
    {
      code: "MN",
      name: "Minnesota",
      slug: "minnesota"
    }
  ].map((state) => ({
    ...state,
    published: published.filter(({ entry }) => entry.state === state.slug).length
  }));

  return (
    <main id="main-content">
      <section className="home-hero site-shell">
        <div className="home-hero__copy">
          <p className="eyebrow">Evidence before coverage</p>
          <h1>County jail rosters, clearly sourced.</h1>
          <p>
            Find a county, search its custody records, and see when the information was captured.
            Our independent directory brings together public jail data from official sources.
          </p>
          <div className="hero-proof-row" aria-label="Service principles">
            <span>
              <i aria-hidden="true" /> Official sources only
            </span>
            <span>
              <i aria-hidden="true" /> Freshness shown
            </span>
          </div>
        </div>
        <div className="home-hero__finder">
          <h2>Find a county jail roster</h2>
          <CountyFinder counties={published.map(({ entry }) => entry)} />
        </div>
      </section>

      <section
        className="home-section home-directory site-shell"
        aria-labelledby="directory-heading"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Browse by state</p>
            <h2 id="directory-heading">Find a county by geography</h2>
          </div>
          <span className="section-note">Two states · {published.length} public pages</span>
        </div>
        <div className="state-directory-grid">
          {stateDirectory.map((state) => (
            <Link
              className="state-directory-card"
              href={`/coverage/${state.slug}/`}
              key={state.slug}
            >
              <span className="state-directory-card__code">{state.code}</span>
              <span className="state-directory-card__copy">
                <strong>{state.name}</strong>
                <small>
                  {state.published} live county {state.published === 1 ? "roster" : "rosters"}
                </small>
              </span>
              <span className="state-directory-card__arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
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
          name: "County Jail Rosters by State",
          description:
            "Search Iowa and Minnesota county jail rosters with booking details, source-listed charges, and capture times.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
