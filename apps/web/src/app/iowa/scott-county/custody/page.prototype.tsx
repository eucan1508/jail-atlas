import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, EvidenceStamp, LinkButton, StatusPill } from "@jail-atlas/ui";
import { syntheticCounty, syntheticFacility } from "@jail-atlas/test-fixtures";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { RosterExplorer } from "@/components/roster-explorer";
import { canRenderSyntheticScottCounty } from "@/lib/publication";
import { getSyntheticRosterPage, syntheticRosterSourceId } from "@/lib/roster";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  path: "/iowa/scott-county/custody/",
  title: "Scott County custody information — synthetic prototype",
  description:
    "Private Phase 1 prototype for Scott County custody source, freshness, roster, contact, and evidence patterns.",
  index: false
});

export default function ScottCountyCustodyPage() {
  if (!canRenderSyntheticScottCounty()) notFound();

  const initialPage = getSyntheticRosterPage({ limit: 25 });
  const sourceId = syntheticRosterSourceId();

  return (
    <main id="main-content" className="county-page">
      <div className="site-shell county-shell">
        <Breadcrumbs
          currentPath="/iowa/scott-county/custody/"
          items={[
            { href: "/", label: "Home" },
            { href: "/coverage/", label: "Coverage" },
            { href: "/coverage/iowa/", label: "Iowa" },
            { label: "Scott County custody" }
          ]}
        />

        <header className="county-identity">
          <div>
            <p className="eyebrow">Iowa · Scott County · Phase 1</p>
            <h1>Scott County custody information</h1>
            <p className="county-identity__summary">
              A synthetic interaction prototype for {syntheticCounty.seatCity}, Iowa. It is not an
              official roster and contains no real custody records.
            </p>
          </div>
          <div className="county-jurisdiction">
            <span>Prototype facility identity</span>
            <strong>{syntheticFacility.name}</strong>
            <small>{syntheticFacility.jurisdictionLabel}</small>
          </div>
        </header>

        <section className="freshness-panel" aria-labelledby="freshness-heading">
          <div className="freshness-panel__lead">
            <StatusPill tone="stale">Not current · publication blocked</StatusPill>
            <h2 id="freshness-heading">No official source has been connected</h2>
            <p>
              The records below are deterministic test fixtures dated in 2000. They do not describe
              current or historical events and must not be used to identify a person.
            </p>
          </div>
          <div className="freshness-panel__evidence">
            <EvidenceStamp label="Last official verification" value="Not recorded" />
            <EvidenceStamp label="Last successful official fetch" value="Not recorded" />
            <EvidenceStamp label="Editorial review" value="Not approved" />
            <EvidenceStamp label="Source health" value="Synthetic simulation only" />
          </div>
        </section>

        <section className="county-section scope-panel" aria-labelledby="scope-heading">
          <div>
            <p className="eyebrow">Custody scope</p>
            <h2 id="scope-heading">Current custody and recent release remain separate</h2>
          </div>
          <p>
            This view exercises the <strong>current custody</strong> display contract. Synthetic
            recent releases exist only in regression fixtures and are excluded from this count and
            table. Neither scope is a court disposition, conviction record, release forecast, or
            notification service.
          </p>
        </section>

        <section className="county-section roster-section" aria-labelledby="roster-heading">
          <div className="roster-heading-row">
            <div>
              <p className="eyebrow">Synthetic roster specimen</p>
              <h2 id="roster-heading">Current-custody display</h2>
            </div>
            <div
              className="active-count"
              aria-label={`${initialPage.total} synthetic active records`}
            >
              <strong>{initialPage.total}</strong>
              <span>fictional active records</span>
            </div>
          </div>
          <div className="roster-scope-control" role="group" aria-label="Roster data scope">
            <span aria-current="true">Current custody</span>
            <span>Recent release excluded</span>
          </div>
          <RosterExplorer
            initialCursor={initialPage.nextCursor}
            initialRecords={initialPage.records}
            sourceId={sourceId}
            total={initialPage.total}
          />
        </section>

        <div data-testid="county-editorial">
          <section className="county-section notes-grid" aria-labelledby="interpretation-heading">
            <div>
              <p className="eyebrow">Interpretation</p>
              <h2 id="interpretation-heading">How the source fields are preserved</h2>
            </div>
            <div className="prose">
              <p>
                Each source-labeled charge stays attached to its booking. Multiple bond entries
                remain separate. Monetary bond, “No bond,” information not published, unknown
                information, and not-applicable are distinct states.
              </p>
              <Alert heading="Missing never means “No bond”" tone="info">
                When a source omits bond information, this interface says it was not published. It
                does not infer a restriction or release condition.
              </Alert>
            </div>
          </section>

          <section className="county-section contact-section" aria-labelledby="contact-heading">
            <div>
              <p className="eyebrow">Facility and contact</p>
              <h2 id="contact-heading">Official contact verification is pending</h2>
            </div>
            <div className="contact-placeholder">
              <strong>No public phone number, address, or facility instruction is shown.</strong>
              <p>
                Phase 1 does not fabricate contact metadata. Facility identity, official contact
                values, their purpose, evidence URL, and real verification time must be approved in
                Phase 2.
              </p>
            </div>
          </section>

          <section
            className="county-section operations-section"
            aria-labelledby="operations-heading"
          >
            <div>
              <p className="eyebrow">County-specific guidance</p>
              <h2 id="operations-heading">No operational instructions have been approved</h2>
            </div>
            <p className="prose">
              Visitation, mail, payments, property, release questions, and accessibility
              instructions are intentionally omitted. Each statement needs current Scott
              County-specific official evidence and a recorded editorial review; general jail
              guidance would not satisfy that requirement.
            </p>
          </section>

          <section className="county-section source-method" aria-labelledby="sources-heading">
            <div>
              <p className="eyebrow">Method and sources</p>
              <h2 id="sources-heading">Source disclosure</h2>
              <p>
                A visible disclosure will identify the official institution and any vendor
                relationship after approval. This specimen records the absence of that evidence
                instead.
              </p>
            </div>
            <dl className="definition-list source-definition-list">
              <div>
                <dt>Official institution</dt>
                <dd>Not approved in Phase 1</dd>
              </div>
              <div>
                <dt>Official page title</dt>
                <dd>Not recorded</dd>
              </div>
              <div>
                <dt>Source purpose</dt>
                <dd>Planned current-custody verification; no live connection</dd>
              </div>
              <div>
                <dt>Vendor involved</dt>
                <dd>Not determined</dd>
              </div>
              <div>
                <dt>Official relationship evidence</dt>
                <dd>No documentary evidence packet approved</dd>
              </div>
              <div>
                <dt>Verification date</dt>
                <dd>Not recorded</dd>
              </div>
            </dl>
          </section>

          <section
            className="county-section correction-callout"
            aria-labelledby="correction-heading"
          >
            <div>
              <p className="eyebrow">See a problem?</p>
              <h2 id="correction-heading">Report stale data or a display concern</h2>
              <p>
                Correction reports identify possible freshness, field, contact, guidance, privacy,
                or accessibility problems. They do not edit an official record.
              </p>
            </div>
            <LinkButton href="/corrections/">Open the correction form</LinkButton>
          </section>
        </div>

        <p className="county-method-link">
          <Link href="/methodology/">Read the complete ingestion and publication methodology</Link>
        </p>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "@id": absoluteUrl("/iowa/scott-county/custody/#page"),
          url: absoluteUrl("/iowa/scott-county/custody/"),
          name: "Scott County custody information — synthetic prototype",
          description:
            "Private Phase 1 prototype showing custody source, freshness, roster, and evidence patterns.",
          isPartOf: { "@id": absoluteUrl("/#website") }
        }}
      />
    </main>
  );
}
