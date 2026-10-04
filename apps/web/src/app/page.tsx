import Link from "next/link";
import { Alert, LinkButton } from "@jail-atlas/ui";
import { CountyFinder } from "@/components/county-finder";
import { FaqList, type FaqItem } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { canRenderSyntheticScottCounty } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, createPageMetadata } from "@/lib/site";
import { coveragePreviewAllowed } from "@/lib/coverage-catalog";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  path: "/",
  title: "County Jail Rosters by State",
  description:
    "Search county jail rosters by state. Find custody records, available booking details, source-listed charges, and the latest capture time."
});

const homeFaqItems: readonly FaqItem[] = [
  {
    question: "How do I find someone in a county jail?",
    answer:
      "Search by county, city, or jail name, open the published county page, and search the current custody snapshot by name. Confirm urgent information with the responsible jail."
  },
  {
    question: "Does JailAtlas include every U.S. county?",
    answer:
      "No. JailAtlas publishes only county pages whose official source, parser behavior, freshness rules, and public display have passed review."
  },
  {
    question: "What is the difference between a current jail roster and recent bookings?",
    answer:
      "A current jail roster describes people listed in current local custody. Recent bookings describe intake activity during a period and may include people who are no longer in custody."
  },
  {
    question: "How current is the custody information?",
    answer:
      "Every county page shows its latest successful capture time. Custody changes continuously, so time-sensitive details should be confirmed with the jail or court."
  }
];

export default async function HomePage() {
  const prototypeAvailable = canRenderSyntheticScottCounty();
  const published = await getPublishedCountyCoverage();
  const stateDirectory = [
    { code: "IA", name: "Iowa", slug: "iowa" },
    {
      code: "MN",
      name: "Minnesota",
      slug: "minnesota"
    },
    { code: "TX", name: "Texas", slug: "texas" },
    { code: "AR", name: "Arkansas", slug: "arkansas" }
  ]
    .map((state) => ({
      ...state,
      published: published.filter(({ entry }) => entry.state === state.slug).length
    }))
    .filter(
      (state) =>
        (state.slug !== "texas" && state.slug !== "arkansas") ||
        state.published > 0 ||
        coveragePreviewAllowed()
    );
  const recentlyAdded = [...published]
    .sort((left, right) => right.entry.publishedAt.localeCompare(left.entry.publishedAt))
    .slice(0, 9);

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
          <span className="section-note">
            {stateDirectory.length} states · {published.length} public pages
          </span>
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

      {recentlyAdded.length > 0 ? (
        <section className="home-section site-shell" aria-labelledby="recently-added-heading">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">New in the directory</p>
              <h2 id="recently-added-heading">Recently added county pages</h2>
              <p className="section-lede">
                Explore the newest reviewed county pages. These dates show when a page joined the
                directory, not routine roster updates.
              </p>
            </div>
          </div>
          <div className="recent-county-grid">
            {recentlyAdded.map(({ entry, liveSource, path }) => (
              <Link href={path} key={entry.slug}>
                <strong>{entry.county} jail roster</strong>
                <span>
                  {entry.stateName} · Added{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "long",
                    timeZone: "UTC"
                  }).format(new Date(`${entry.publishedAt}T00:00:00Z`))}
                </span>
                <small>
                  {liveSource.recordCount} visible{" "}
                  {liveSource.recordCount === 1 ? "record" : "records"}
                </small>
              </Link>
            ))}
          </div>
          <Link className="section-text-link" href="/coverage/">
            Browse all counties A–Z <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : null}

      <section className="home-section home-section--tinted">
        <div className="site-shell">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">County page coverage</p>
              <h2>What you’ll find on county pages</h2>
              <p className="section-lede">
                County pages combine available custody records with verified local context.
              </p>
            </div>
          </div>
          <div className="feature-definition-grid">
            <article>
              <h3>Custody records</h3>
              <p>Search the latest approved current-custody snapshot from the official source.</p>
            </article>
            <article>
              <h3>Verified local guidance</h3>
              <p>
                Review source-backed contact, visitation, money, communication, and court guidance
                when it has been published officially.
              </p>
            </article>
            <article>
              <h3>Clear coverage and status</h3>
              <p>
                See whether a page is live, when it was captured, and how many records are visible.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section site-shell" aria-labelledby="terminology-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Roster terminology</p>
            <h2 id="terminology-heading">Understanding jail roster results</h2>
            <p className="section-lede">
              Labels and available information vary by county system. These terms describe different
              kinds of custody information.
            </p>
          </div>
        </div>
        <dl className="terminology-grid">
          <div>
            <dt>Current jail roster</dt>
            <dd>People listed in current local custody in the latest available source data.</dd>
          </div>
          <div>
            <dt>Recent bookings</dt>
            <dd>Recent intake activity that may not represent everyone currently in custody.</dd>
          </div>
          <div>
            <dt>Inmate search</dt>
            <dd>A lookup interface whose search fields and record details vary by county.</dd>
          </div>
          <div>
            <dt>State corrections search</dt>
            <dd>State correctional custody or supervision; it is not a county jail roster.</dd>
          </div>
        </dl>
      </section>

      <section className="home-section site-shell home-important">
        <Alert heading="Important" tone="warning">
          A jail roster is a custody record, not a court docket. Custody status, charges, bond
          information, and release details can change; confirm time-sensitive information with the
          appropriate jail or court.
        </Alert>
      </section>

      <section className="home-section site-shell faq-section" aria-labelledby="home-faq-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Common questions</p>
            <h2 id="home-faq-heading">County jail directory FAQ</h2>
          </div>
        </div>
        <FaqList items={homeFaqItems} />
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
            "Search county jail rosters with booking details, source-listed charges, and capture times.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": absoluteUrl("/#faq"),
          mainEntity: homeFaqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer }
          }))
        }}
      />
    </main>
  );
}
