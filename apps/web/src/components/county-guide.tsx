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

function sectionAnchor(index: number): string {
  return `guidance-${index + 1}`;
}

type FirstStep = Readonly<{ title: string; body: string; link?: { href: string; label: string } }>;

/**
 * The first things a family usually needs after an arrest, in order. Every step points to this
 * county's verified guidance below rather than restating it, so no step adds facts of its own.
 */
function firstSteps({
  profile,
  rosterPublished,
  capturedLabel
}: {
  profile: CountyGuideProfile;
  rosterPublished: boolean;
  capturedLabel: string | undefined;
}): FirstStep[] {
  const facility = profile.facilityName;
  const used = new Set<number>();
  const find = (pattern: RegExp) => {
    const index = profile.sections.findIndex(
      (section, position) => !used.has(position) && pattern.test(section.title)
    );
    if (index < 0) return null;
    used.add(index);
    return { href: `#${sectionAnchor(index)}`, index };
  };
  const bail = find(/bail|bond/i);
  const visit = find(/visit/i);
  const money = find(/money/i);
  const contact = find(/phone|mail|messag|communication/i);

  const steps: FirstStep[] = [
    {
      title: "Confirm where the person is held",
      body:
        rosterPublished && capturedLabel
          ? `Search the name in the roster above. Anyone booked after ${capturedLabel} will not appear yet, so call ${facility} at ${profile.phone} if you cannot find them.`
          : `Call ${facility} at ${profile.phone} and ask whether the person has been booked there.`
    },
    {
      title: "Write down the booking details",
      body: "Note the full name exactly as the jail lists it, the booking number if one is shown, and each charge. You may be asked for them when you call the jail, send money, or ask about bail."
    }
  ];
  if (bail) {
    steps.push({
      title: "Ask about bail and the first court date",
      body: "Find out whether bail has been set, how it can be paid, and which court has the case.",
      link: { href: bail.href, label: `How bail works at ${facility}` }
    });
  }
  if (money) {
    steps.push({
      title: "Set up money for commissary and calls",
      body: "People in custody use their account for commissary items and, at many jails, phone time.",
      link: { href: money.href, label: `How to send money to ${facility}` }
    });
  }
  if (contact) {
    steps.push({
      title: "Learn the rules for calls and mail",
      body: "Check what is allowed before you send anything, because mail that breaks the rules can be rejected.",
      link: { href: contact.href, label: `Phone and mail at ${facility}` }
    });
  }
  if (visit) {
    steps.push({
      title: "Plan a visit",
      body: "Check the schedule, sign-up rules, and ID requirements before you travel.",
      link: { href: visit.href, label: `Visiting ${facility}` }
    });
  }
  return steps;
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
  const steps = firstSteps({ profile, rosterPublished, capturedLabel });

  return (
    <>
      <section
        className="content-section county-guide__panel county-guide__first-steps"
        aria-labelledby="first-steps-heading"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">If someone was just arrested</p>
            <h2 id="first-steps-heading">What to do in the first 24 hours</h2>
            <p className="section-lede">
              A short checklist for {facility}. Each step links to the official details further down
              this page.
            </p>
          </div>
        </div>
        <ol className="first-steps">
          {steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {step.link ? <a href={step.link.href}>{step.link.label}</a> : null}
            </li>
          ))}
        </ol>
      </section>

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
            <article className="guidance-card" id={sectionAnchor(index)} key={section.title}>
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
              <Link href={path} key={path}>
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
