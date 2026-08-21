import { TrustPage } from "@/components/trust-page";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/methodology/",
  title: "Custody data methodology",
  description:
    "How official custody sources are verified, fetched, interpreted, reviewed, and monitored for freshness."
});

export default function MethodologyPage() {
  return (
    <TrustPage
      eyebrow="Evidence and freshness"
      path="/methodology/"
      title="Methodology"
      summary="The method separates source authority, technical health, data freshness, custody scope, field provenance, and human publication review so one signal cannot stand in for all the others."
      sections={[
        {
          heading: "1. Establish the official relationship",
          paragraphs: [
            "An official county, sheriff, jail, detention authority, or public detention authority page must operate the roster or explicitly link or embed its vendor. A vendor domain by itself is not evidence. Reviewers store the official institution page, the roster URL, the relationship-evidence URL, and a plain-language description of what the evidence demonstrates.",
            "Search snippets, directories, aggregators, marketing sites, and vendor discovery pages are not factual evidence. Access controls and technical protections are never bypassed."
          ]
        },
        {
          heading: "2. Test the source-specific ingestion path",
          paragraphs: [
            "Each approved source receives its own adapter. The adapter fetches only allowlisted endpoints, validates the external response, parses source fields, normalizes known concepts, runs a health check, interprets a valid empty response, and classifies failures. Recorded fixtures and regression tests must cover the behaviors the reviewer approves.",
            "The web application never fetches or parses an external roster during a visitor request. A separate worker writes validated snapshots to PostgreSQL; the web application reads those validated records. Code deployment and data refresh are independent."
          ],
          bullets: [
            "A successful source response with zero current records is a valid empty roster.",
            "A network, timeout, HTTP, or access failure is a source request failure.",
            "A structurally successful response that violates the approved parser contract is a parser failure.",
            "A previously successful snapshot older than its approved threshold is stale data, not a new empty result."
          ]
        },
        {
          heading: "3. Preserve meaning during normalization",
          paragraphs: [
            "Current custody, recent release, historical booking, and arrest-report scopes remain distinct. A booking can retain multiple charges and multiple bond entries; those arrays are never flattened into an ambiguous sentence. A missing bond field is not converted to “No Bond.” Booking identifiers are retained only when the source identifies them that way.",
            "Every displayed field is mapped to a source field, a documented derivation, or an editorial evidence record. Unsupported fields are omitted rather than guessed. Source text is sanitized for safe display without silently rewriting its factual meaning."
          ]
        },
        {
          heading: "4. Measure health, freshness, and review separately",
          paragraphs: [
            "Last checked is when the worker most recently attempted the source. Last successful fetch is when a response passed validation and parsing. Last verified is when a reviewer reconfirmed the official relationship or factual item. Editorial review is when the county publication package was approved. These timestamps are shown only for events that actually occurred.",
            "Freshness is the elapsed time since the last successful source result compared with a source-specific threshold. A healthy fetch can still yield a valid empty roster. A stale snapshot can remain visible with a warning only when the approved display policy permits it; a failure is never presented as evidence that nobody is in custody."
          ]
        },
        {
          heading: "5. Complete a human publication review",
          paragraphs: [
            "A reviewer confirms the source relationship, source health, parser fixtures, empty and failure states, field provenance, contact evidence, custody and retention scope, county-specific usefulness, accessibility checks, and correction path. The review record identifies the decision and time without inventing a public staff identity.",
            "Automation can fetch, validate, parse, normalize, compare timestamps, and raise health alerts. It cannot approve a county, infer absent legal meaning, certify a contact, or replace the recorded human publication decision."
          ]
        }
      ]}
    />
  );
}
