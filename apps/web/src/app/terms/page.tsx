import { TrustPage } from "@/components/trust-page";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/terms/",
  title: "Terms of use",
  description: "Terms for using this independent county custody information product."
});

export default function TermsPage() {
  return (
    <TrustPage
      eyebrow="Use of this service"
      path="/terms/"
      title="Terms"
      summary="These Phase 1 terms describe the intended public-information service and its limits. Production legal review, operator details, effective date, and jurisdiction must be approved before launch."
      sections={[
        {
          heading: "Informational purpose",
          paragraphs: [
            "The service organizes information from identified official public sources and explains source scope and freshness. It is not an official record, government service, court docket, background-check service, legal service, notification system, or substitute for contacting the responsible institution.",
            "Custody status and charges can change after the displayed successful-fetch time. Use the linked official source or verified facility contact for decisions that depend on current information."
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
          heading: "Availability and future legal review",
          paragraphs: [
            "The service may be unavailable during source failures, parser review, security events, or maintenance. No guarantee of uninterrupted access or completeness is made. Before production, an authorized operator must approve enforceable limitation, governing-law, contact, and effective-date language; Phase 1 deliberately leaves those facts unclaimed."
          ]
        }
      ]}
    />
  );
}
