import { FaqList, type FaqItem } from "./faq-list";
import { JsonLd } from "./json-ld";
import type { CoverageState } from "@/lib/coverage-catalog";
import { absoluteUrl } from "@/lib/site";

const stateDetails: Record<
  CoverageState,
  Readonly<{ name: string; correctionsName: string; path: string }>
> = {
  iowa: {
    name: "Iowa",
    correctionsName: "Iowa Department of Corrections",
    path: "/coverage/iowa/"
  },
  minnesota: {
    name: "Minnesota",
    correctionsName: "Minnesota Department of Corrections",
    path: "/coverage/minnesota/"
  },
  texas: {
    name: "Texas",
    correctionsName: "Texas Department of Criminal Justice",
    path: "/coverage/texas/"
  }
};

export function stateFaqItems(state: CoverageState): readonly FaqItem[] {
  const details = stateDetails[state];
  return [
    {
      question: `Does the ${details.correctionsName} replace a ${details.name} county jail roster?`,
      answer: `No. The state corrections system primarily covers state custody and supervision. County jails are operated locally, so a county roster remains the appropriate source for current local custody information.`
    },
    {
      question: `Why do ${details.name} county pages use different roster labels?`,
      answer:
        "Each county publishes its own system and field names. JailAtlas preserves the source meaning while clearly separating current custody, recent bookings, release information, and state corrections searches."
    },
    {
      question: `What should I do if the ${details.name} county I need is not listed?`,
      answer:
        "Only reviewed and approved county pages are published. Check the county sheriff or county government website directly and return later as JailAtlas expands verified coverage."
    },
    {
      question: `How current are the ${details.name} jail roster pages?`,
      answer:
        "Each published county page shows its latest successful capture time. Custody can change at any moment, so confirm time-sensitive information with the responsible jail or court."
    }
  ];
}

export function StateFaq({ state }: { state: CoverageState }) {
  const details = stateDetails[state];
  const items = stateFaqItems(state);
  return (
    <section className="content-section faq-section" aria-labelledby="state-faq-heading">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Common questions</p>
          <h2 id="state-faq-heading">{details.name} jail roster FAQ</h2>
        </div>
      </div>
      <FaqList items={items} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": absoluteUrl(`${details.path}#faq`),
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer }
          }))
        }}
      />
    </section>
  );
}
