import Link from "next/link";
import { Alert, StatusPill } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { countiesForState } from "@/lib/coverage-catalog";
import { canRenderSyntheticScottCounty, hasPublishedIowaCoverage } from "@/lib/publication";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/coverage/",
  title: "Custody source coverage",
  description: "See which county custody sources have passed the evidence and publication gates."
});

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const prototypeAvailable = canRenderSyntheticScottCounty();
  const published = await getPublishedCountyCoverage();
  const publishedIowa = published.filter(({ entry }) => entry.state === "iowa");
  const iowaPublished = publishedIowa.length > 0 || hasPublishedIowaCoverage();
  const iowaPlanned = countiesForState("iowa");
  const minnesotaPlanned = countiesForState("minnesota");

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
                  ? `${publishedIowa.length} published county source${publishedIowa.length === 1 ? " is" : "s are"} available.`
                  : `${iowaPlanned.length} Iowa county sources are selected for audit; none are published yet.`}
              </p>
            </div>
            <Link href="/coverage/iowa/">View Iowa coverage</Link>
          </div>
          <div className="surface-card coverage-state-row">
            <div>
              <StatusPill tone="neutral">Proposed · audit pending</StatusPill>
              <h3>Minnesota</h3>
              <p>{minnesotaPlanned.length} county sources are selected for the second-state launch set.</p>
            </div>
            <Link href="/coverage/minnesota/">View Minnesota plan</Link>
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
