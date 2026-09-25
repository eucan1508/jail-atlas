import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Button, StatusPill } from "@jail-atlas/ui";
import { readEnvironment, isProductionEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private design checkpoint",
  robots: { index: false, follow: false, nocache: true }
};

const directions = [
  {
    slug: "wayfinder",
    name: "Wayfinder",
    summary: "Recommended · strongest task order, status comprehension, and mobile scanning"
  },
  {
    slug: "evidence-ledger",
    name: "Evidence Ledger",
    summary: "Dense provenance rhythm with explicit documentary structure"
  },
  {
    slug: "clear-field",
    name: "Clear Field",
    summary: "Extra breathing room and softened grouping for lower cognitive load"
  }
] as const;

export default function DesignLabPage() {
  const environment = readEnvironment();
  if (
    process.env.NODE_ENV === "production" ||
    isProductionEnvironment(environment) ||
    environment.DATA_MODE !== "synthetic"
  ) {
    notFound();
  }

  return (
    <main id="main-content" className="design-lab site-shell">
      <header className="design-lab__intro">
        <p className="eyebrow">Private development checkpoint</p>
        <h1>Three original custody utility directions</h1>
        <p>
          All specimens use fictional content. Wayfinder is recommended because the task sequence is
          clearest, freshness and source scope stay adjacent, touch targets remain obvious, and the
          roster converts to a legible mobile card without changing information order.
        </p>
      </header>

      <div className="design-lab__directions">
        {directions.map((direction) => (
          <section
            className={`lab-direction lab-direction--${direction.slug}`}
            data-design-direction={direction.slug}
            data-recommended={direction.slug === "wayfinder" ? "true" : undefined}
            key={direction.slug}
            aria-labelledby={`direction-${direction.slug}`}
          >
            <div className="lab-direction__caption">
              <p>{direction.summary}</p>
              <h2 id={`direction-${direction.slug}`}>{direction.name}</h2>
            </div>

            <div className="lab-frame">
              <header className="lab-header">
                <span className="lab-symbol" aria-hidden="true">
                  <i />
                  <i />
                </span>
                <strong>Configured publisher</strong>
                <nav aria-label={`${direction.name} sample navigation`}>
                  <a href="#sample-coverage">Coverage</a>
                  <a href="#sample-method">Method</a>
                </nav>
              </header>

              <div className="lab-body">
                <div className="lab-identity" data-specimen="county-identity">
                  <p className="lab-kicker">Iowa · Development specimen</p>
                  <h3>Scott County custody information</h3>
                  <p>Davenport area · jurisdiction identity pending official review</p>
                </div>

                <div className="lab-status" data-specimen="source-status">
                  <StatusPill tone="stale">Synthetic · not current</StatusPill>
                  <div>
                    <strong>Official source not connected</strong>
                    <span>No successful official fetch or verification date exists</span>
                  </div>
                </div>

                <div className="lab-actions">
                  <Button type="button">Load more records</Button>
                  <Button type="button" variant="secondary">
                    View source method
                  </Button>
                </div>

                <Alert heading="Publication blocked" tone="danger">
                  Live source evidence, parser approval, verified contacts, and human review are
                  required before public use.
                </Alert>

                <div className="lab-roster-row" data-specimen="roster-row">
                  <strong>Morgan Example</strong>
                  <span>SYN-BKG-001</span>
                  <span>Two source-labeled charges</span>
                </div>

                <article className="lab-roster-card" data-specimen="roster-card">
                  <div>
                    <span>Name</span>
                    <strong>Morgan Example</strong>
                  </div>
                  <div>
                    <span>Booking identifier</span>
                    <strong>SYN-BKG-001</strong>
                  </div>
                </article>

                <address className="lab-contact" data-specimen="contact">
                  <span>Verified facility contact</span>
                  <strong>Contact evidence pending</strong>
                  <p>
                    No phone number or address is rendered until an official source is approved.
                  </p>
                </address>
              </div>

              <footer className="lab-footer">
                <span>Independent information utility</span>
                <span>Not a government website</span>
              </footer>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
