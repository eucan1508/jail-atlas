import { TrustPage } from "@/components/trust-page";
import { readEnvironment } from "@/lib/env";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/about/",
  title: "About this custody information product",
  description: "Why this independent custody source verification product exists and who it serves."
});

export default function AboutPage() {
  const { BRAND_NAME } = readEnvironment();

  return (
    <TrustPage
      eyebrow="Independent public information"
      path="/about/"
      title="About this product"
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
            "No staff biographies or credentials are presented in Phase 1 because none are required to understand the publication method. A future operator disclosure must be accurate, reviewed, and consistent with the configured publisher identity before launch."
          ]
        },
        {
          heading: "What the product can and cannot answer",
          paragraphs: [
            "A published county page can report what a verified official current-custody source displayed at a stated successful-fetch time. It can preserve source-published booking, charge, and bond fields without changing their meaning, and it can show verified facility contacts and supported operational guidance.",
            "It cannot establish guilt, conviction, court disposition, release eligibility, future release, identity beyond the source display, or legal rights. Custody information changes and should be confirmed with the official institution for time-sensitive decisions."
          ]
        },
        {
          heading: "Phase 1 boundary",
          paragraphs: [
            "The current implementation is a private foundation and design checkpoint. Its Scott County, Iowa records are synthetic and fictional; no live source is connected. Runtime guards, noindex controls, and sitemap exclusion prevent that prototype from being published as custody information. Official integration and production readiness require separate approvals."
          ]
        }
      ]}
    />
  );
}
