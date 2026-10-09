import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  path: "/corrections/",
  title: "Report a Roster Data Concern",
  description:
    "Report a stale jail roster, incorrect display, privacy concern, or accessibility issue on Jail Atlas by email. Include the affected county page and what looks wrong."
});

const reportSubject = encodeURIComponent("Jail Atlas correction");

export default function CorrectionsPage() {
  return (
    <main id="main-content" className="page-main site-shell narrow-shell editorial-page">
      <Breadcrumbs
        currentPath="/corrections/"
        items={[{ href: "/", label: "Home" }, { label: "Corrections" }]}
      />
      <PageIntro
        eyebrow="Correction and freshness reports"
        title="Report a county jail data concern"
        summary={
          <p>
            Flag a stale roster, display mismatch, incorrect contact, wrong guidance, privacy
            concern, or accessibility barrier by email. For an emergency or a change to an official
            record, contact the responsible institution directly.
          </p>
        }
      />

      <section className="content-section prose" aria-labelledby="report-heading">
        <h2 id="report-heading">How to report</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}?subject=${reportSubject}`}>{CONTACT_EMAIL}</a>. To
          help us check it quickly, include:
        </p>
        <ul>
          <li>the county page, or a link to it;</li>
          <li>what looks wrong, such as a name, charge, phone number, or visiting hour;</li>
          <li>
            the &ldquo;captured&rdquo; time shown on the page, if the problem is on the roster.
          </li>
        </ul>
        <p>
          Do not send Social Security numbers, medical information, passwords, or payment details.
        </p>
      </section>

      <section className="content-section prose" aria-labelledby="after-heading">
        <h2 id="after-heading">What happens after a report</h2>
        <p>
          We compare the report with the county&apos;s official roster or page. If our page shows
          something the official source does not, we fix it, and a county page can be withheld while
          we check.
        </p>
        <p>
          If the official source itself appears wrong, contact the institution that publishes it. We
          cannot edit a sheriff, jail, court, or vendor system. Email addresses sent with a report
          are used only to reply and are handled as described in our{" "}
          <Link href="/privacy/">privacy policy</Link>.
        </p>
      </section>
    </main>
  );
}
