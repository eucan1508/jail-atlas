import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, LinkButton, StatusPill } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CountyGuide } from "@/components/county-guide";
import { JsonLd } from "@/components/json-ld";
import { RosterExplorer } from "@/components/roster-explorer";
import {
  findCountyCoverage,
  coveragePreviewAllowed,
  countyCoveragePath
} from "@/lib/coverage-catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/site";
import { readEnvironment } from "@/lib/env";
import { getLiveCountySource, getLiveRosterPage } from "@/lib/live-roster";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";

type CountyPageParams = { state: string; county: string };

export async function generateMetadata({
  params
}: {
  params: Promise<CountyPageParams>;
}): Promise<Metadata> {
  const { state, county } = await params;
  const entry = findCountyCoverage(state, county);
  if (!entry) return { title: "County custody information" };
  const liveSource =
    readEnvironment().DATA_MODE === "official" ? await getLiveCountySource(entry) : null;
  const metadata = createPageMetadata({
    path: countyCoveragePath(entry),
    title: entry.title,
    description: entry.description,
    index: liveSource !== null
  });
  // County pages use a complete, search-focused title. Use an absolute title
  // here so the root layout's generic site-name suffix is not duplicated.
  return { ...metadata, title: { absolute: entry.title } };
}

export default async function CountyCustodyBriefPage({
  params
}: {
  params: Promise<CountyPageParams>;
}) {
  const { state, county } = await params;
  const entry = findCountyCoverage(state, county);
  if (!entry) notFound();

  const liveSource =
    readEnvironment().DATA_MODE === "official" ? await getLiveCountySource(entry) : null;
  if (!liveSource && !coveragePreviewAllowed()) notFound();

  const path = countyCoveragePath(entry);
  if (liveSource) {
    const [initialPage, stateCoverage] = await Promise.all([
      getLiveRosterPage({
        sourceId: liveSource.sourceId,
        snapshotId: liveSource.snapshotId
      }),
      getPublishedCountyCoverage(entry.state)
    ]);
    const capturedAt = liveSource.capturedAt;
    return (
      <main id="main-content" className="page-main site-shell county-page county-page--live">
        <Breadcrumbs
          currentPath={path}
          items={[
            { href: "/", label: "Home" },
            { href: "/coverage/", label: "Coverage" },
            { href: `/coverage/${entry.state}/`, label: entry.stateName },
            { label: entry.county }
          ]}
        />
        <header className="county-live-header">
          <div className="county-live-header__copy">
            <p className="eyebrow">
              {entry.stateName} · {entry.county}
            </p>
            <h1>{entry.h1}</h1>
            <p>{entry.description}</p>
          </div>
        </header>
        <section className="content-section roster-section" aria-labelledby="roster-heading">
          <div className="section-heading-row">
            <div>
              <h2 id="roster-heading">Current custody</h2>
              <p>
                Last successful fetch:{" "}
                {capturedAt.toLocaleString("en-US", {
                  timeZone: "America/Chicago",
                  timeZoneName: "short"
                })}
                .
              </p>
            </div>
          </div>
          <RosterExplorer
            official
            initialCursor={initialPage.nextCursor}
            initialRecords={initialPage.records}
            sourceId={liveSource.sourceId}
            snapshotId={liveSource.snapshotId}
            total={initialPage.total}
          />
        </section>
        <CountyGuide
          capturedAt={capturedAt}
          entry={entry}
          recordCount={initialPage.total}
          related={stateCoverage.filter(({ entry: county }) => county.slug !== entry.slug)}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": absoluteUrl(`${path}#page`),
            url: absoluteUrl(path),
            headline: entry.h1,
            description: entry.description,
            articleBody: entry.article,
            isPartOf: { "@id": absoluteUrl("/#website") }
          }}
        />
      </main>
    );
  }

  return (
    <main id="main-content" className="page-main site-shell county-page county-page--preview">
      <Breadcrumbs
        currentPath={path}
        items={[
          { href: "/", label: "Home" },
          { href: "/coverage/", label: "Coverage" },
          { href: `/coverage/${entry.state}/`, label: entry.stateName },
          { label: entry.county }
        ]}
      />

      <header className="page-intro">
        <p className="eyebrow">
          {entry.stateName} · {entry.county}
        </p>
        <h1>{entry.h1}</h1>
        <p>{entry.description}</p>
      </header>

      <Alert heading="County page brief — source audit pending" tone="warning">
        This preview contains the approved editorial brief and source record only. It does not show
        live custody records and is excluded from indexing until the source adapter and publication
        review are complete.
      </Alert>

      <section className="content-section prose" aria-labelledby="article-heading">
        <StatusPill tone="stale">Audit pending</StatusPill>
        <h2 id="article-heading">About this {entry.county} page</h2>
        <p>{entry.article}</p>
        <p>
          The finished page will include a visible H1, canonical title and description, current
          source timestamp, source-labeled fields, county-specific contact guidance, correction
          flow, and structured data. It will not infer charges, release, or court outcomes.
        </p>
      </section>

      <section className="content-section" aria-labelledby="source-heading">
        <h2 id="source-heading">Source record</h2>
        <p>
          {entry.officialSourceLabel} is the approved public source used for the records shown on
          this page. The source address is retained for verification and ingestion; this page keeps
          the public experience focused on the county information itself.
        </p>
        <dl className="definition-list source-definition-list">
          <div>
            <dt>County</dt>
            <dd>
              {entry.county}, {entry.stateName}
            </dd>
          </div>
          <div>
            <dt>Seat city</dt>
            <dd>{entry.seatCity}</dd>
          </div>
          <div>
            <dt>Source status</dt>
            <dd>Audit pending</dd>
          </div>
          <div>
            <dt>Roster publication</dt>
            <dd>Blocked until review</dd>
          </div>
        </dl>
      </section>

      <section className="content-section action-pair">
        <div>
          <h2>What happens next</h2>
          <p>
            We will verify the source relationship, exact fields, freshness threshold, retention
            rule, and parser behavior before this county can appear in the production sitemap.
          </p>
        </div>
        <div className="button-row">
          <LinkButton href={`/coverage/${entry.state}/`}>View state coverage</LinkButton>
          <LinkButton href="/corrections/" variant="secondary">
            Correction process
          </LinkButton>
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": absoluteUrl(`${path}#page`),
          url: absoluteUrl(path),
          headline: entry.h1,
          description: entry.description,
          articleBody: entry.article,
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
