import { TrustPage } from "@/components/trust-page";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/privacy/",
  title: "Privacy and Data Retention",
  description:
    "Read how Jail Atlas handles public custody records and correction reports, including data minimization, retention, security, and privacy concerns."
});

export default function PrivacyPage() {
  return (
    <TrustPage
      eyebrow="Data minimization"
      path="/privacy/"
      title="Privacy policy and data retention"
      summary="Custody data can affect real people. The product collects only what an approved official source makes necessary for the current-custody task and retains it no longer than the documented source scope permits."
      sections={[
        {
          heading: "Custody records",
          paragraphs: [
            "The product does not create permanent person profiles, booking-history archives, or mugshot galleries. It does not combine records across counties to build a person dossier. Search engines are instructed not to quote roster rows, and roster pagination APIs are noindex, nofollow, and nosnippet.",
            "Current-custody records are retired when the source no longer reports current custody, subject to the approved source-specific grace period needed to complete a safe refresh. Recent-release data is stored only if the official source provides that scope, the scope is documented, and its retention limit is approved."
          ]
        },
        {
          heading: "Logs and operational data",
          paragraphs: [
            "Structured logs use run, source, adapter, outcome, duration, and aggregate-count identifiers. Names, booking identifiers, charge text, contact-form narratives, raw source bodies, cookies, authorization values, and secrets are redacted or omitted. Logs have a separate, time-limited operational retention policy.",
            "The site does not currently run advertising or third-party analytics scripts. If either is added, this policy will be updated first to say what is collected, by whom, and how to opt out."
          ]
        },
        {
          heading: "Correction requests",
          paragraphs: [
            "A correction request asks only for contact details needed to reply, the affected county or page, a category, and a concise explanation. A honeypot, signed form time, rate limit, size limit, and server-side schema reduce spam without sending the narrative to an advertising service.",
            "Correction details are restricted to reviewers, used to investigate the reported concern, and deleted after resolution plus the documented audit period. A request does not itself alter an official record; source discrepancies are checked against the official institution."
          ]
        },
        {
          heading: "Security and requests",
          paragraphs: [
            "Data is separated by purpose, credentials remain server-side, database connections use least privilege, and backups follow the same deletion windows.",
            `For a privacy question or request, email ${CONTACT_EMAIL} and name the county page involved. An official record can only be changed by the county that publishes it; when the county's roster changes, the page here follows.`
          ]
        }
      ]}
    />
  );
}
