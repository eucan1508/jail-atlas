import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, LinkButton, StatusPill } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import {
  findCountyCoverage,
  coveragePreviewAllowed,
  countyCoveragePath
} from "@/lib/coverage-catalog";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

type CountyPageParams = { state: string; county: string };

export async function generateMetadata({
  params
}: {
  params: Promise<CountyPageParams>;
}): Promise<Metadata> {
  const { state, county } = await params;
  const entry = findCountyCoverage(state, county);
  if (!entry) return { title: "County custody information" };
  return createPageMetadata({
    path: countyCoveragePath(entry),
    title: entry.title,
    description: entry.description,
    index: false
  });
}

export default async function CountyCustodyBriefPage({
  params
}: {
  params: Promise<CountyPageParams>;
}) {
  const { state, county } = await params;
  const entry = findCountyCoverage(state, county);
  if (!entry || !coveragePreviewAllowed()) notFound();

  const path = countyCoveragePath(entry);
  return (
    <main id="main-content" className="page-main site-shell">
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
        This preview contains the approved editorial brief and source link only. It does not show
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
          flow, and structured data. It will not infer charges, bond, release, or court outcomes.
        </p>
      </section>

      <section className="content-section" aria-labelledby="source-heading">
        <h2 id="source-heading">Official source</h2>
        <p>
          <a href={entry.officialSourceUrl} rel="noreferrer" target="_blank">
            {entry.officialSourceLabel}
          </a>
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
