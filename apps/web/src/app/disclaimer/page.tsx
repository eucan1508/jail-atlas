import { TrustPage } from "@/components/trust-page";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/disclaimer/",
  title: "Custody information disclaimer",
  description: "Important limits on custody, charge, release, and contact information."
});

export default function DisclaimerPage() {
  return (
    <TrustPage
      eyebrow="Read before relying"
      path="/disclaimer/"
      title="Disclaimer"
      summary="This independent product is not a government website, does not control an official roster, and cannot make legal or custody determinations."
      sections={[
        {
          heading: "Custody information changes",
          paragraphs: [
            "A county page describes what an approved official source displayed at its stated last successful-fetch time. A person may have been booked, released, transferred, or otherwise changed status afterward. A source can also become stale or unavailable; those states are disclosed but cannot guarantee present custody.",
            "A valid zero-result roster means the source successfully represented no matching current records for that snapshot. It does not mean the source failed. Conversely, a source or parser failure is never presented as a zero-result roster."
          ]
        },
        {
          heading: "Charges and court outcomes",
          paragraphs: [
            "A displayed charge is an official-source label, not proof of guilt or conviction. Custody information is not a complete case history or court disposition.",
            "The product does not determine whether someone can be released, calculate payment, provide legal advice, or tell a visitor what action to take. Courts and responsible official institutions control their own records and processes."
          ]
        },
        {
          heading: "Identity and contact limits",
          paragraphs: [
            "Names and identifiers are displayed only within the approved source scope. Similar names do not establish identity, and this product does not independently verify a person. Do not use the service to make eligibility, employment, housing, credit, insurance, or other regulated decisions.",
            "Facility contacts and operational guidance are shown only when supported by current official evidence, but procedures can change. Confirm time-sensitive instructions directly with the responsible official institution."
          ]
        },
        {
          heading: "No affiliation or endorsement",
          paragraphs: [
            "The publisher is independent and is not affiliated with, endorsed by, or acting on behalf of a county, sheriff, jail, detention authority, court, vendor, or government agency. Links identify sources; they do not imply a relationship with this product."
          ]
        }
      ]}
    />
  );
}
