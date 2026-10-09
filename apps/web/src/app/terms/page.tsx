import { TrustPage } from "@/components/trust-page";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/terms/",
  title: "Terms of Use",
  description:
    "Review the terms for using Jail Atlas, including permitted use of county custody information, source limitations, corrections, and service availability."
});

export default function TermsPage() {
  return (
    <TrustPage
      eyebrow="Use of this service"
      path="/terms/"
      title="Terms of use"
      summary="These terms describe what this public-information service is, how it may be used, and its limits."
      sections={[
        {
          heading: "Informational purpose",
          paragraphs: [
            "The service organizes information from identified official public sources and explains source scope and freshness. It is not an official record, government service, court docket, background-check service, legal service, notification system, or substitute for contacting the responsible institution.",
            "Custody status and charges can change after the displayed successful-fetch time. Use the timestamp, page context, and correction process for decisions that depend on current information."
          ]
        },
        {
          heading: "Permitted use",
          paragraphs: [
            "You may use public pages for lawful personal information needs. You may not attempt to defeat access controls, rate limits, security measures, or noindex controls; overload the service; submit malicious content; or use the product to harass, threaten, discriminate against, or impersonate a person or institution.",
            "The roster API exists only to continue the county-page task. It does not grant permission for bulk collection, redistribution, permanent archiving, person profiling, or creation of an independent custody database."
          ]
        },
        {
          heading: "Source meaning and corrections",
          paragraphs: [
            "Displayed fields retain the meaning supplied by the approved source. A charge is not a conviction, and a custody record is not a court disposition. Missing information is not converted into a more definite statement.",
            "Report suspected stale data, source mismatch, contact errors, display problems, or accessibility barriers through the correction process. The publisher may temporarily withhold a county page while investigating evidence or source health."
          ]
        },
        {
          heading: "Availability and contact",
          paragraphs: [
            "The service may be unavailable during source failures, parser review, security events, or maintenance. No guarantee of uninterrupted access or completeness is made.",
            `Questions about these terms can be sent to ${CONTACT_EMAIL}.`
          ]
        }
      ]}
    />
  );
}
