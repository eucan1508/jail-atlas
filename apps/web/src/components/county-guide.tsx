import Link from "next/link";
import { FaqList, type FaqItem } from "./faq-list";
import { JsonLd } from "./json-ld";
import type { CountyCoverageBrief } from "@/lib/coverage-catalog";
import { findCountyGuide } from "@/lib/county-guides";
import type { PublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl } from "@/lib/site";

function countyFaqItems(
  entry: CountyCoverageBrief,
  facility: string,
  operatedBy: string,
  phone: string
): readonly FaqItem[] {
  return [
    {
      question: `How do I find out if someone is in ${facility}?`,
      answer: `Use the current-custody search at the top of this page. Search by name and review the latest successful capture time before relying on a result.`
    },
    {
      question: `Who operates ${facility}?`,
      answer: `${facility} is operated by ${operatedBy}. For current facility procedures, use the linked official sources or call ${phone}.`
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

function guidanceChecklist(title: string): readonly string[] {
  const normalizedTitle = title.toLocaleLowerCase("en-US");

  if (normalizedTitle.includes("visit")) {
    return [
      "Confirm the current day and time before traveling.",
      "Check identification, approval, age, dress, and arrival rules.",
      "Use the official scheduling service when an appointment is required."
    ];
  }

  if (
    normalizedTitle.includes("money") ||
    normalizedTitle.includes("commissary") ||
    normalizedTitle.includes("canteen")
  ) {
    return [
      "Match the recipient's full name and booking identifier.",
      "Open deposit services only from the linked official county page.",
      "Review transaction fees, limits, delivery time, and refund rules."
    ];
  }

  if (
    normalizedTitle.includes("mail") ||
    normalizedTitle.includes("phone") ||
    normalizedTitle.includes("communication") ||
    normalizedTitle.includes("message")
  ) {
    return [
      "Verify the current mailing format and required booking identifier.",
      "Review prohibited-item, photo, publication, and package rules.",
      "Confirm provider registration, rates, and service availability."
    ];
  }

  if (
    normalizedTitle.includes("bail") ||
    normalizedTitle.includes("bond") ||
    normalizedTitle.includes("court")
  ) {
    return [
      "Confirm the case number, current amount, and bond type.",
      "Ask which payment methods and locations are currently accepted.",
      "Use the court for hearings, filings, dispositions, and legal status."
    ];
  }

  return [
    "Confirm the procedure with the responsible facility.",
    "Use the linked official source for the latest instructions.",
    "Keep the person's booking identifier available when contacting the agency."
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
  const profile = findCountyGuide(entry.state, entry.slug);
  if (!profile) {
    throw new Error(`Missing verified county guide for ${entry.state}/${entry.slug}`);
  }
  const facility = profile.facilityName;
  const faqItems = countyFaqItems(entry, facility, profile.operatedBy, profile.phone);
  const capturedLabel = capturedAt.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "short"
  });
  const pagePath = `/${entry.state}/${entry.slug}/custody/`;

  return (
    <>
      <section
        className="content-section county-guide__panel county-guide__about"
        aria-labelledby="facility-heading"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Verified county context</p>
            <h2 id="facility-heading">About {facility}</h2>
          </div>
        </div>
        <p>{profile.overview}</p>
        <dl className="definition-list county-facts">
          <div>
            <dt>Facility</dt>
            <dd>{facility}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{profile.address}</dd>
          </div>
          <div>
            <dt>Main phone</dt>
            <dd>{profile.phone}</dd>
          </div>
          <div>
            <dt>Operated by</dt>
            <dd>{profile.operatedBy}</dd>
          </div>
          <div>
            <dt>Official facility source</dt>
            <dd>
              <a href={profile.contactSourceUrl}>{profile.contactSourceLabel}</a>
            </dd>
          </div>
          <div>
            <dt>Current page status</dt>
            <dd>
              {recordCount} visible {recordCount === 1 ? "record" : "records"} · captured{" "}
              {capturedLabel}
            </dd>
          </div>
          <div>
            <dt>Facility details reviewed</dt>
            <dd>{profile.reviewedAt}</dd>
          </div>
        </dl>
      </section>

      <section
        className="content-section county-guide__panel county-guide__search"
        aria-labelledby="search-guide-heading"
      >
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

      <section
        className="content-section county-guide__panel county-guide__guidance"
        aria-labelledby="local-guidance-heading"
      >
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
          {profile.sections.map((section, index) => (
            <article className="guidance-card" key={section.title}>
              <header className="guidance-card__header">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{section.title}</h3>
              </header>
              <p className="guidance-card__body">{section.body}</p>
              <div className="guidance-card__checklist">
                <h4>Before you use this information</h4>
                <ul>
                  {guidanceChecklist(section.title).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <a className="guidance-source" href={section.sourceUrl}>
                {section.sourceLabel} <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
        <p className="official-source-callout">
          Facility procedures can change without notice. Use the official source linked in each
          section and call {profile.phone} before traveling or sending money, mail, or property.
        </p>
      </section>

      {related.length > 0 ? (
        <section
          className="content-section county-guide__panel county-guide__related"
          aria-labelledby="related-counties-heading"
        >
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

      <section
        className="content-section county-guide__panel faq-section"
        aria-labelledby="county-faq-heading"
      >
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
