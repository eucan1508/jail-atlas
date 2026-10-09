import { TrustPage } from "@/components/trust-page";
import { CONTACT_EMAIL } from "@/lib/contact";
import { readEnvironment } from "@/lib/env";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/about/",
  title: "About Jail Atlas",
  description:
    "Learn about Jail Atlas, an independent county jail roster directory, how it uses official public sources, and the limits of the custody information it shows."
});

export default function AboutPage() {
  const { BRAND_NAME } = readEnvironment();

  return (
    <TrustPage
      eyebrow="Independent public information"
      path="/about/"
      title="About Jail Atlas"
      summary={`${BRAND_NAME} is an independently operated information product built to help people verify county custody information without obscuring its official source or age.`}
      sections={[
        {
          heading: "Why it exists",
          paragraphs: [
            "A custody roster can be technically available yet difficult to interpret. A visitor may not know whether it shows current custody or recent releases, when it last refreshed, why it is hosted on a vendor domain, or whether a blank result means nobody is listed or the source failed. This product keeps those distinctions next to the records they qualify.",
            "Coverage is intentionally earned county by county. The goal is not a large directory. The goal is a small set of pages whose source relationship, parser behavior, data scope, contacts, and editorial guidance can be explained and tested."
          ]
        },
        {
          heading: "Who operates it",
          paragraphs: [
            `${BRAND_NAME} is the configured publisher identity. The product is not operated by a government agency, jail, sheriff, court, law firm, or notification service. It does not claim government affiliation, endorsement, authority, professional credentials, or access beyond the same approved public sources described on each county page.`,
            `Questions about the site can be sent to ${CONTACT_EMAIL}. Questions about a specific person in custody should go to the jail itself; its phone number is on each county page.`
          ]
        },
        {
          heading: "What the product can and cannot answer",
          paragraphs: [
            "A published county page can report what a verified official current-custody source displayed at a stated successful-fetch time. It can preserve source-published booking and charge fields without changing their meaning, and it can show verified facility contacts and supported operational guidance.",
            "It cannot establish guilt, conviction, court disposition, release eligibility, future release, identity beyond the source display, or legal rights. Custody information changes and should be confirmed with the official institution for time-sensitive decisions."
          ]
        },
        {
          heading: "How the rosters stay current",
          paragraphs: [
            "Each county page reads one official roster published by the county or its sheriff's office. Every state is refreshed twice a day. If a roster cannot be read in full, or fails the checks set for that source, the page keeps its last complete copy instead of showing a partial list, and the page shows when that copy was taken.",
            "If a county's roster has not been read successfully for more than 30 hours, its page is taken down until a fresh copy is available, so the site never presents an old list as current."
          ]
        }
      ]}
    />
  );
}
