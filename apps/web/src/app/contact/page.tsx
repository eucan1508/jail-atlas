import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  path: "/contact/",
  title: "Contact Jail Atlas",
  description:
    "Contact Jail Atlas by email about the site, a county page, or a privacy question. Jail Atlas is not a jail or sheriff's office and cannot help with a person's case."
});

export default function ContactPage() {
  return (
    <main id="main-content" className="page-main site-shell narrow-shell editorial-page">
      <Breadcrumbs
        currentPath="/contact/"
        items={[{ href: "/", label: "Home" }, { label: "Contact" }]}
      />
      <PageIntro
        eyebrow="Get in touch"
        title="Contact"
        summary={
          <p>
            Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with questions about the
            site, a county page, or how we handle data.
          </p>
        }
      />
      <div className="prose trust-content">
        <section className="content-section">
          <h2>What to include</h2>
          <p>
            Tell us which county page you are writing about and what you noticed. If something on a
            roster looks wrong or out of date, the <Link href="/corrections/">correction form</Link>{" "}
            is the fastest route, because it records the page and the details a reviewer needs to
            check it against the official source.
          </p>
        </section>
        <section className="content-section">
          <h2>What we cannot help with</h2>
          <p>
            Jail Atlas is an independent site. We are not a jail, sheriff&apos;s office, court, or
            law firm, and we cannot release anyone, post bond, pass on messages to people in
            custody, or give legal advice. For any of those, contact the jail directly; its phone
            number is on each county page.
          </p>
          <p>
            We also cannot change or remove an official record. The roster shows what the county
            publishes, and it changes when the county&apos;s own list changes.
          </p>
        </section>
        <section className="content-section">
          <h2>Privacy requests</h2>
          <p>
            For a question about personal information on the site, write to the same address and
            name the county page involved. Our <Link href="/privacy/">privacy policy</Link> explains
            what we keep and for how long.
          </p>
        </section>
      </div>
    </main>
  );
}
