import Link from "next/link";
import { Alert, StatusPill } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { canRenderSyntheticScottCounty, hasPublishedIowaCoverage } from "@/lib/publication";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/coverage/",
  title: "Custody source coverage",
  description: "See which county custody sources have passed the evidence and publication gates."
});

export default function CoveragePage() {
  const prototypeAvailable = canRenderSyntheticScottCounty();
  const iowaPublished = hasPublishedIowaCoverage();

  return (
    <main id="main-content" className="page-main site-shell">
      <Breadcrumbs
        currentPath="/coverage/"
        items={[{ href: "/", label: "Home" }, { label: "Coverage" }]}
      />
      <PageIntro
        eyebrow="Publication status"
        title="Custody source coverage"
        summary={<p>A county appears here only after every evidence, ingestion, and review gate passes.</p>}
      />

      <section className="content-section" aria-labelledby="scope-heading">
        <h2 id="scope-heading">Approved geographic scope</h2>
        <div className="coverage-grid">
          <div className="surface-card coverage-state-row">
            <div>
              <StatusPill tone={iowaPublished ? "current" : "neutral"}>
                {iowaPublished ? "Active coverage" : "No published counties"}
              </StatusPill>
              <h3>Iowa</h3>
              <p>
                {iowaPublished
                  ? "Published county coverage and source health are available."
                  : "Scott County is the only approved Phase 1 prototype; it is not published."}
              </p>
            </div>
            {prototypeAvailable ? <Link href="/coverage/iowa/">View Phase 1 status</Link> : null}
          </div>
          <Alert heading="No placeholder coverage" tone="info">
            Inactive states and unreviewed counties return a genuine 404. Coverage is added one county
            at a time through a separate approval process.
          </Alert>
        </div>
      </section>

      <section className="content-section prose" aria-labelledby="verified-heading">
        <h2 id="verified-heading">What “verified” means</h2>
        <p>
          Verified does not mean that this publisher is the official source. It means the official
          institution-to-roster relationship is documented, a live fetch and source-specific parser
          work, field provenance and retention are known, contacts are checked, and a human review is
          recorded. Health and freshness can change after publication, so county pages show those
          states separately.
        </p>
        <p>
          <Link href="/source-policy/">Read the complete source policy</Link>.
        </p>
      </section>
    </main>
  );
}
