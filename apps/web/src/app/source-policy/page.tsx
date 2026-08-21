import { TrustPage } from "@/components/trust-page";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/source-policy/",
  title: "Official custody source policy",
  description: "The evidence and publication requirements for county custody sources."
});

export default function SourcePolicyPage() {
  return (
    <TrustPage
      eyebrow="Admission rules"
      path="/source-policy/"
      title="Official source policy"
      summary="A roster is eligible only when an official public institution operates it or provides documentary evidence that the vendor roster is its custody source."
      sections={[
        {
          heading: "Eligible sources",
          paragraphs: [
            "Accepted institutions are official county governments, sheriffs, jails or detention centers, and public detention authorities. A vendor portal is eligible only when one of those institutions explicitly links or embeds it. The stored evidence must make that relationship understandable without relying on a search engine result.",
            "The source record includes its URL, type, official institution URL, relationship-evidence URL and description, verification and check timestamps, most recent success and error, parser version, current status, custody-data scope, and retention scope."
          ]
        },
        {
          heading: "Sources we reject",
          paragraphs: [
            "Third-party inmate directories, arrest aggregators, scraped booking sites, attorney marketing pages, bail-bond directories, and search-result snippets are not used as factual sources. A vendor landing page or recognizable vendor name is not proof that a particular county authorized a particular roster.",
            "A source is also rejected when access would require bypassing a WAF, CAPTCHA, authentication, robots restriction, rate control, or another technical protection. Publication value never justifies defeating an access boundary."
          ]
        },
        {
          heading: "Publication gates",
          paragraphs: [
            "A county remains a genuine 404 until every gate is satisfied. Passing some gates does not justify a thin, “coming soon,” or placeholder page."
          ],
          bullets: [
            "A working current-custody roster and documented official relationship exist.",
            "A live fetch succeeds through the approved access path.",
            "Source-specific fixtures and regression tests cover parsing and normalization.",
            "Valid empty, source failure, parser failure, and stale states are distinguishable.",
            "Field provenance and source retention scope are documented.",
            "Official contact information is supported and verified.",
            "Useful county-specific editorial information is tied to evidence.",
            "A human publication review records the final decision."
          ]
        },
        {
          heading: "Ongoing source health",
          paragraphs: [
            "Publication is not permanent approval of every future response. Scheduled ingestion records each attempt, outcome, parser version, count, and classified failure without placing personal data in logs. Repeated failures, changed structure, expired verification, or unexplained scope changes can suspend the county page until review.",
            "A change to an official endpoint, vendor relationship, custody scope, field meaning, or retention behavior requires new evidence and source-specific review rather than a silent parser patch."
          ]
        }
      ]}
    />
  );
}
