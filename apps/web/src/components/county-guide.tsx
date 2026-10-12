import Link from "next/link";
import { FaqList, type FaqItem } from "./faq-list";
import { JsonLd } from "./json-ld";
import type { CountyCoverageBrief } from "@/lib/coverage-catalog";
import { findCountyGuide, type CountyGuideProfile } from "@/lib/county-guides";
import { guidanceQuestion, reviewedDateIso } from "@/lib/county-summary";
import type { PublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl } from "@/lib/site";

function countyFaqItems({
  entry,
  profile,
  recordCount,
  capturedLabel,
  rosterPaused
}: {
  entry: CountyCoverageBrief;
  profile: CountyGuideProfile;
  recordCount: number | null;
  capturedLabel: string | undefined;
  rosterPaused: boolean;
}): readonly FaqItem[] {
  const facility = profile.facilityName;
  const listed =
    recordCount === null ? null : `${recordCount} ${recordCount === 1 ? "person" : "people"}`;
  return [
    {
      question: `How do I find out if someone is in ${facility}?`,
      answer:
        listed && capturedLabel
          ? `Search the ${listed} on the ${entry.officialSourceLabel} at the top of this page, captured ${capturedLabel}. Anyone booked after that time will not appear yet, so call ${facility} at ${profile.phone} if the person is not listed.`
          : rosterPaused
            ? `The ${entry.officialSourceLabel} is not shown right now because it could not be refreshed recently. Call ${facility} at ${profile.phone} to confirm whether someone is held there.`
            : `The ${entry.officialSourceLabel} is not published on this page yet. Call ${facility} at ${profile.phone} to confirm whether someone is held there.`
    },
    {
      question: `Who runs ${facility}?`,
      answer: `${facility}, at ${profile.address}, is run by the ${profile.operatedBy}. Call ${profile.phone} for current procedures.`
    },
    {
      question: `How current is the ${entry.county} roster?`,
      answer:
        listed && capturedLabel
          ? `JailAtlas reads the ${entry.officialSourceLabel} twice a day. The copy on this page was captured ${capturedLabel} and lists ${listed}.`
          : `JailAtlas reads the ${entry.officialSourceLabel} twice a day and shows it here only while the latest copy is fresh. The list returns after the next successful refresh.`
    }
  ];
}

export function CountyGuide({
  entry,
  capturedAt,
  recordCount,
  related,
  rosterPaused = false
}: {
  entry: CountyCoverageBrief;
  capturedAt: Date | null;
  recordCount: number | null;
  related: readonly PublishedCountyCoverage[];
  rosterPaused?: boolean;
}) {
  const profile = findCountyGuide(entry.state, entry.slug);
  if (!profile) {
    throw new Error(`Missing verified county guide for ${entry.state}/${entry.slug}`);
  }
  const facility = profile.facilityName;
  const rosterPublished = capturedAt !== null && recordCount !== null;
  const capturedLabel = capturedAt?.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "short"
  });
  const faqItems = [
    ...profile.faq,
    ...countyFaqItems({
      entry,
      profile,
      recordCount: rosterPublished ? recordCount : null,
      capturedLabel: rosterPublished ? capturedLabel : undefined,
      rosterPaused
    })
  ];
  const guidanceSources = [...new Set(profile.sections.map((section) => section.sourceLabel))];
  const pagePath = `/${entry.state}/${entry.slug}/custody/`;
  const reviewedIso = reviewedDateIso(profile.reviewedAt);

  return (
    <>
      <section
        className="content-section county-guide__panel county-guide__about"
        aria-labelledby="facility-heading"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Verified county context</p>
            <h2 id="facility-heading">Where is {facility}, and who runs it?</h2>
          </div>
        </div>
        <p>{profile.overview}</p>
        <table className="county-facts">
          <caption className="ui-visually-hidden">{facility} facts</caption>
          <tbody>
            <tr>
              <th scope="row">Facility</th>
              <td>{facility}</td>
            </tr>
            <tr>
              <th scope="row">Address</th>
              <td>{profile.address}</td>
            </tr>
            <tr>
              <th scope="row">Main phone</th>
              <td>{profile.phone}</td>
            </tr>
            <tr>
              <th scope="row">Operated by</th>
              <td>{profile.operatedBy}</td>
            </tr>
            <tr>
              <th scope="row">Official facility source</th>
              <td>{profile.contactSourceLabel}</td>
            </tr>
            <tr>
              <th scope="row">People in custody</th>
              <td>
                {rosterPublished && capturedAt ? (
                  <>
                    {recordCount} on the official roster · captured{" "}
                    <time dateTime={capturedAt.toISOString()}>{capturedLabel}</time>
                  </>
                ) : rosterPaused ? (
                  "Roster temporarily unavailable · waiting for the next official refresh"
                ) : (
                  "Verified facility guidance available · roster publication pending"
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">Facility details reviewed</th>
              <td>
                {reviewedIso ? (
                  <time dateTime={reviewedIso}>{profile.reviewedAt}</time>
                ) : (
                  profile.reviewedAt
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section
        className="content-section county-guide__panel county-guide__guidance"
        aria-labelledby="local-guidance-heading"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Practical guidance</p>
            <h2 id="local-guidance-heading">
              How do you visit, call, or send money to someone at {facility}?
            </h2>
            <p className="section-lede">
              From the {profile.operatedBy}: {guidanceSources.join("; ")}. Checked{" "}
              {profile.reviewedAt}.
            </p>
          </div>
        </div>
        <div className="guidance-grid">
          {profile.sections.map((section, index) => (
            <article className="guidance-card" key={section.title}>
              <header className="guidance-card__header">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{guidanceQuestion(section.title, facility)}</h3>
              </header>
              <p className="guidance-card__body">{section.body}</p>
              <p className="guidance-source">Source: {section.sourceLabel}</p>
            </article>
          ))}
        </div>
        <p className="official-source-callout">
          Facility procedures can change without notice. Call {profile.phone} before traveling or
          sending money, mail, or property.
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
          How these rosters are read and checked: <Link href="/methodology/">methodology</Link>.
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
