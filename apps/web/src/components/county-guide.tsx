import Link from "next/link";
import { Alert } from "@jail-atlas/ui";
import { FaqList, type FaqItem } from "./faq-list";
import { JsonLd } from "./json-ld";
import type { CountyCoverageBrief } from "@/lib/coverage-catalog";
import type { PublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl } from "@/lib/site";

function facilityName(entry: CountyCoverageBrief): string {
  if (entry.slug === "ramsey-county") return "Ramsey County Adult Detention Center";
  return `${entry.county} Jail`;
}

function countyFaqItems(entry: CountyCoverageBrief): readonly FaqItem[] {
  const facility = facilityName(entry);
  return [
    {
      question: `How do I find out if someone is in ${facility}?`,
      answer: `Use the current-custody search at the top of this page. Search by name and review the latest successful capture time before relying on a result.`
    },
    {
      question: `What information appears on the ${entry.county} roster?`,
      answer: `JailAtlas displays only fields approved from ${entry.officialSourceLabel}, such as a name, source-identified booking number, booking time when published, and source-listed charges.`
    },
    {
      question: `Is the ${entry.county} jail roster a court record?`,
      answer:
        "No. A jail roster is a custody record, not a court docket or proof of guilt. Use the appropriate court for filings, hearings, dispositions, judgments, and current bail decisions."
    },
    {
      question: `How current is the ${entry.county} roster?`,
      answer:
        "The page shows the latest successful capture time above the roster. Booking, transfer, release, and charge information can change, so confirm urgent details with the responsible official institution."
    },
    {
      question: `How do I correct information shown for ${entry.county}?`,
      answer:
        "Use the JailAtlas correction process for display or source concerns. For changes to the underlying official record, contact the agency that publishes the roster."
    }
  ];
}

export function CountyGuide({
  entry,
  capturedAt,
  recordCount,
  related
}: {
  entry: CountyCoverageBrief;
  capturedAt: Date;
  recordCount: number;
  related: readonly PublishedCountyCoverage[];
}) {
  const facility = facilityName(entry);
  const faqItems = countyFaqItems(entry);
  const capturedLabel = capturedAt.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "short"
  });
  const pagePath = `/${entry.state}/${entry.slug}/custody/`;

  return (
    <>
      <Alert heading="Important" tone="warning">
        A jail roster is a custody record, not a court docket. Custody status, charges, bond
        information, and release details can change; confirm time-sensitive information with the
        appropriate jail or court.
      </Alert>

      <section className="content-section county-guide__about" aria-labelledby="facility-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Verified county context</p>
            <h2 id="facility-heading">About {facility}</h2>
          </div>
        </div>
        <p>{entry.article}</p>
        <dl className="definition-list county-facts">
          <div>
            <dt>Facility</dt>
            <dd>{facility}</dd>
          </div>
          <div>
            <dt>County and city</dt>
            <dd>
              {entry.county}, {entry.seatCity}, {entry.stateName}
            </dd>
          </div>
          <div>
            <dt>Official roster source</dt>
            <dd>
              <a href={entry.officialSourceUrl}>{entry.officialSourceLabel}</a>
            </dd>
          </div>
          <div>
            <dt>Current page status</dt>
            <dd>
              {recordCount} visible {recordCount === 1 ? "record" : "records"} · captured{" "}
              {capturedLabel}
            </dd>
          </div>
        </dl>
      </section>

      <section className="content-section" aria-labelledby="search-guide-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Using this page</p>
            <h2 id="search-guide-heading">How the {entry.county} inmate search works</h2>
          </div>
        </div>
        <div className="county-guide__split">
          <p>
            The roster above searches the complete current snapshot, not only the records visible on
            screen. Search names as published by the official source and use the booking number to
            distinguish similar names when that identifier is available.
          </p>
          <p>
            JailAtlas preserves source labels and does not turn a listed charge into a court
            outcome. A missing result can mean the person is not in the current snapshot, the name
            is recorded differently, or the official source has changed since the last capture.
          </p>
        </div>
      </section>

      <section className="content-section" aria-labelledby="local-guidance-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Practical guidance</p>
            <h2 id="local-guidance-heading">Contact, visits, money, and court information</h2>
            <p className="section-lede">
              Procedures vary by facility. JailAtlas publishes a local instruction only after it is
              confirmed on an official page.
            </p>
          </div>
        </div>
        <div className="guidance-grid">
          <article>
            <h3>Bail and court records</h3>
            <p>
              Bail is controlled by the court, not by this directory. Confirm the current amount,
              eligibility, case number, and accepted process with the jail or appropriate court.
            </p>
          </article>
          <article>
            <h3>Visitation</h3>
            <p>
              Schedules, identification rules, age limits, and approval requirements can change.
              Check the official county source before traveling.
            </p>
          </article>
          <article>
            <h3>Money and commissary</h3>
            <p>
              Use only a deposit provider linked by the responsible official institution. Confirm
              fees, limits, and the correct recipient before sending money.
            </p>
          </article>
          <article>
            <h3>Phone and mail</h3>
            <p>
              Calling, messaging, mail, and package rules are facility-specific. Verify current
              instructions and addressing requirements with the jail.
            </p>
          </article>
        </div>
        <p className="official-source-callout">
          Start with the <a href={entry.officialSourceUrl}>official {entry.county} roster source</a>
          . If it does not publish the instruction you need, contact the responsible county agency
          directly.
        </p>
      </section>

      {related.length > 0 ? (
        <section className="content-section" aria-labelledby="related-counties-heading">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Continue browsing</p>
              <h2 id="related-counties-heading">More county jail rosters in {entry.stateName}</h2>
            </div>
          </div>
          <div className="related-county-grid">
            {related.slice(0, 6).map(({ entry: county, liveSource, path }) => (
              <Link href={path} key={county.slug}>
                <strong>{county.county} jail roster</strong>
                <span>
                  {liveSource.recordCount} visible{" "}
                  {liveSource.recordCount === 1 ? "record" : "records"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-section faq-section" aria-labelledby="county-faq-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Common questions</p>
            <h2 id="county-faq-heading">{entry.county} jail roster FAQ</h2>
          </div>
        </div>
        <FaqList items={faqItems} />
        <p className="faq-correction-link">
          See something that needs attention? <Link href="/corrections/">Report a concern</Link>.
        </p>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": absoluteUrl(`${pagePath}#faq`),
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer }
          }))
        }}
      />
    </>
  );
}
