import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { PageIntro } from "@/components/page-intro";
import { chargeTermsForState, offenseLevels, statuteSourceLabels } from "@/lib/charge-decoder";
import { countiesForState, type CoverageState } from "@/lib/coverage-catalog";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { absoluteUrl, createPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

type ChargeTermsParams = { state: string };

const stateNames: Readonly<Record<CoverageState, string>> = {
  alabama: "Alabama",
  arkansas: "Arkansas",
  iowa: "Iowa",
  kansas: "Kansas",
  minnesota: "Minnesota",
  missouri: "Missouri",
  oklahoma: "Oklahoma",
  texas: "Texas"
};

/** How the statute numbers printed on each state's rosters are put together. */
const citationGuides: Partial<Record<CoverageState, readonly string[]>> = {
  minnesota: [
    "Minnesota rosters often print a Minnesota Statutes citation such as 609.52.2(a)(1). That means section 609.52 (in chapter 609, the Criminal Code), subdivision 2, paragraph (a), clause (1).",
    "Chapter 609 holds most criminal offenses, chapter 152 covers drug crimes, chapter 169A covers driving while impaired, and chapter 171 covers driver's licenses."
  ],
  iowa: [
    "Iowa rosters cite the Iowa Code. In 321J.2(2)(b), 321J is the chapter, 321J.2 is the section, and (2)(b) points to a subsection and paragraph inside it.",
    "Chapter 708 covers assault, chapter 124 covers controlled substances, and chapter 321J covers operating while intoxicated."
  ],
  kansas: [
    "Kansas rosters cite the Kansas Statutes Annotated. In 21-5414(a)(2), 21 is the chapter and 5414 the section; the letters and numbers in parentheses point to a subsection.",
    "Chapter 21 holds the criminal code, chapter 22 covers criminal procedure such as probation violations, and chapter 8 covers vehicles and driving."
  ],
  missouri: [
    "Missouri rosters cite the Revised Statutes of Missouri. In 565.225, 565 is the chapter and 225 the section.",
    "Some Missouri rosters add a longer number after the section, such as 565.225-006Y202053. That is a state charge code that identifies the exact version of the offense."
  ],
  arkansas: [
    "Arkansas rosters cite the Arkansas Code by title, chapter, and section. In 5-64-419, 5 is the title (criminal offenses), 64 the chapter, and 419 the section."
  ],
  oklahoma: [
    "Oklahoma rosters cite the Oklahoma Statutes by title and section. In 21 O.S. 1283, 21 is the title and 1283 the section."
  ],
  texas: [
    "Texas rosters cite a code and section, such as PC 49.04 (Penal Code section 49.04) or HSC 481.115 (Health and Safety Code section 481.115).",
    "Some Texas rosters put an eight-digit number in front of the charge. That is the state offense code that identifies the exact offense."
  ]
};

function coverageState(state: string): CoverageState | null {
  return state in stateNames ? (state as CoverageState) : null;
}

export async function generateMetadata({
  params
}: {
  params: Promise<ChargeTermsParams>;
}): Promise<Metadata> {
  const state = coverageState((await params).state);
  if (!state) return { title: "Jail charge terms" };
  const published = await getPublishedCountyCoverage(state);
  const name = stateNames[state];
  return createPageMetadata({
    path: `/charge-terms/${state}/`,
    title: `${name} Jail Charge Abbreviations and Codes Explained`,
    description: `What the abbreviations, statute numbers, and offense levels on ${name} county jail rosters mean, in plain English.`,
    index: published.length > 0
  });
}

export default async function ChargeTermsPage({ params }: { params: Promise<ChargeTermsParams> }) {
  const state = coverageState((await params).state);
  if (!state || countiesForState(state).length === 0) notFound();
  const published = await getPublishedCountyCoverage(state);
  if (published.length === 0) notFound();
  const name = stateNames[state];
  const path = `/charge-terms/${state}/`;
  const terms = chargeTermsForState(state);
  const levels = offenseLevels[state];
  const citation = citationGuides[state];
  const statuteSource = statuteSourceLabels[state];

  return (
    <main id="main-content" className="page-main site-shell charge-terms-page">
      <Breadcrumbs
        currentPath={path}
        items={[
          { href: "/", label: "Home" },
          { href: "/coverage/", label: "Coverage" },
          { href: `/coverage/${state}/`, label: name },
          { label: "Charge terms" }
        ]}
      />
      <PageIntro
        eyebrow={name}
        title={`${name} jail charge abbreviations and codes`}
        summary={
          <p>
            Jail rosters print charges the way the booking system stores them: short, abbreviated,
            and often with a statute number in front. This page explains the terms that show up on{" "}
            {name} county rosters. On each county roster, the same notes appear under the charge
            itself.
          </p>
        }
      />

      <section className="content-section prose" aria-labelledby="charge-meaning-heading">
        <h2 id="charge-meaning-heading">What a charge on a jail roster means</h2>
        <p>
          A charge on a roster is what the person was booked on. It is not a conviction. Prosecutors
          can change, add, or drop charges, and the court decides the outcome. For the current
          status of a case, contact the court clerk in the county where the case is filed.
        </p>
      </section>

      {levels ? (
        <section className="content-section" aria-labelledby="offense-levels-heading">
          <h2 id="offense-levels-heading">{name} offense levels and maximum penalties</h2>
          <p className="section-lede">
            From the least to the most serious. These are the general limits set by law; a specific
            offense can carry a different penalty.
          </p>
          <table className="county-facts charge-levels">
            <caption className="ui-visually-hidden">{name} offense levels</caption>
            <tbody>
              {levels.levels.map((level) => (
                <tr key={level.name}>
                  <th scope="row">{level.name}</th>
                  <td>{level.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="guidance-source">Source: {levels.source}</p>
        </section>
      ) : null}

      {citation ? (
        <section className="content-section prose" aria-labelledby="statute-numbers-heading">
          <h2 id="statute-numbers-heading">How to read the statute numbers</h2>
          {citation.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {statuteSource ? (
            <p className="guidance-source">
              Section names shown under roster charges come from: {statuteSource}.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="content-section" aria-labelledby="abbreviations-heading">
        <h2 id="abbreviations-heading">Common abbreviations on {name} rosters</h2>
        <dl className="definition-list charge-terms-list">
          {terms.map((term) => (
            <div key={term.term}>
              <dt>{term.term}</dt>
              <dd>{term.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="content-section" aria-labelledby="charge-terms-next-heading">
        <h2 id="charge-terms-next-heading">{name} county jail rosters</h2>
        <p>
          <Link href={`/coverage/${state}/`}>Browse every {name} county roster</Link> to search
          current custody records. The notes under each charge use the terms on this page.
        </p>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          "@id": absoluteUrl(`${path}#terms`),
          url: absoluteUrl(path),
          name: `${name} jail charge abbreviations`,
          hasDefinedTerm: terms.map((term) => ({
            "@type": "DefinedTerm",
            name: term.term,
            description: term.meaning
          }))
        }}
      />
    </main>
  );
}
