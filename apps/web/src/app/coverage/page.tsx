import Link from "next/link";
import { StatusPill } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/coverage/",
  title: "County Jail Roster Coverage",
  description:
    "Browse live Jail Atlas coverage in Iowa and Minnesota. Choose a state to search published county jail rosters."
});

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const published = await getPublishedCountyCoverage();
  const publishedIowa = published.filter(({ entry }) => entry.state === "iowa");
  const publishedMinnesota = published.filter(({ entry }) => entry.state === "minnesota");
  const iowaPublished = publishedIowa.length > 0;

  return (
    <main id="main-content" className="page-main site-shell coverage-page">
      <Breadcrumbs
        currentPath="/coverage/"
        items={[{ href: "/", label: "Home" }, { label: "Coverage" }]}
      />
      <div className="coverage-hero">
        <PageIntro
          eyebrow="Browse by state"
          title="County jail roster coverage"
          summary={
            <p>
              Choose a state to find available county jail rosters and search custody records by
              county.
            </p>
          }
        />
        <div className="coverage-hero__signal" aria-label="Coverage summary">
          <span className="coverage-hero__signal-label">CURRENT SCOPE</span>
          <strong>{published.length}</strong>
          <span>public county pages</span>
          <div className="coverage-hero__meter" aria-hidden="true">
            <span style={{ width: `${Math.min(published.length * 16.66, 100)}%` }} />
          </div>
          <small>
            {published.length > 0
              ? "Cleared for public display"
              : "No county page has cleared review yet"}
          </small>
        </div>
      </div>

      <section className="content-section" aria-labelledby="scope-heading">
        <div className="section-kicker-row">
          <div>
            <p className="eyebrow">Approved geography</p>
            <h2 id="scope-heading">Where the evidence is live</h2>
          </div>
          <span className="section-index">01 / 02</span>
        </div>
        <div className="coverage-grid">
          <div className="surface-card coverage-state-row">
            <div>
              <StatusPill tone={iowaPublished ? "current" : "neutral"}>
                {iowaPublished ? "Active coverage" : "Coming soon"}
              </StatusPill>
              <h3>Iowa</h3>
              <p>
                {iowaPublished
                  ? `${publishedIowa.length} public county page${publishedIowa.length === 1 ? " is" : "s are"} available.`
                  : "Public county pages are being prepared."}
              </p>
            </div>
            <Link className="coverage-state-row__link" href="/coverage/iowa/">
              Explore Iowa <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="surface-card coverage-state-row">
            <div>
              <StatusPill tone={publishedMinnesota.length > 0 ? "current" : "neutral"}>
                {publishedMinnesota.length > 0 ? "Active coverage" : "Coming soon"}
              </StatusPill>
              <h3>Minnesota</h3>
              <p>
                {publishedMinnesota.length > 0
                  ? `${publishedMinnesota.length} public county page${publishedMinnesota.length === 1 ? " is" : "s are"} available.`
                  : "Public county pages are being prepared."}
              </p>
            </div>
            <Link className="coverage-state-row__link" href="/coverage/minnesota/">
              Explore Minnesota <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="content-section prose" aria-labelledby="verified-heading">
        <h2 id="verified-heading">What “verified” means</h2>
        <p>
          Verified does not mean that this publisher is the official source. It means the official
          institution-to-roster relationship is documented, a live fetch and source-specific parser
          work, field provenance and retention are known, contacts are checked, and a human review
          is recorded. Health and freshness can change after publication, so county pages show those
          states separately.
        </p>
        <p>
          <Link href="/source-policy/">Read the complete source policy</Link>.
        </p>
      </section>
    </main>
  );
}
