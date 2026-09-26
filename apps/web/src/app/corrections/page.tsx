import type { Metadata } from "next";
import { Alert, Button } from "@jail-atlas/ui";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageIntro } from "@/components/page-intro";
import { createCorrectionFormToken } from "@/lib/correction-security";
import { countyCoveragePath } from "@/lib/coverage-catalog";
import { getPublishedCountyCoverage } from "@/lib/published-coverage";
import { createPageMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  path: "/corrections/",
  title: "Report a custody data concern",
  description:
    "Report stale custody data, a source mismatch, incorrect contact details, or an accessibility issue."
});

const resultMessages = {
  received: {
    tone: "success" as const,
    heading: "Your report was received",
    text: "A reviewer can now compare the concern with the official evidence. Submitting a report does not change an official record."
  },
  preview: {
    tone: "warning" as const,
    heading: "Phase 1 form check completed",
    text: "Synthetic development mode validated this submission but did not store or send it. Production correction intake is not active in Phase 1."
  },
  invalid: {
    tone: "danger" as const,
    heading: "The report could not be submitted",
    text: "Check each field and try again. The form may also have expired."
  },
  unavailable: {
    tone: "danger" as const,
    heading: "Correction intake is temporarily unavailable",
    text: "Nothing was recorded. Please try again later."
  }
} as const;

export default async function CorrectionsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const message =
    status && status in resultMessages
      ? resultMessages[status as keyof typeof resultMessages]
      : null;
  const formToken = createCorrectionFormToken();
  const published = await getPublishedCountyCoverage();

  return (
    <main id="main-content" className="page-main site-shell narrow-shell">
      <Breadcrumbs
        currentPath="/corrections/"
        items={[{ href: "/", label: "Home" }, { label: "Corrections" }]}
      />
      <PageIntro
        eyebrow="Correction and freshness reports"
        title="Report a custody data concern"
        summary={
          <p>
            Flag a stale roster, display mismatch, incorrect verified contact, unsupported guidance,
            privacy concern, or accessibility barrier. For an emergency or an official record
            change, contact the responsible institution directly.
          </p>
        }
      />

      {message ? (
        <div className="correction-result">
          <Alert heading={message.heading} tone={message.tone}>
            {message.text}
          </Alert>
        </div>
      ) : null}

      <section className="content-section" aria-labelledby="report-heading">
        <h2 id="report-heading">Describe the concern</h2>
        <form className="correction-form" action="/corrections/submit/" method="post">
          <input type="hidden" name="formStartedAt" value={formToken.startedAt} />
          <input type="hidden" name="submissionToken" value={formToken.token} />

          <div className="field-group">
            <label htmlFor="source-page">Affected page</label>
            <select id="source-page" name="sourcePagePath" defaultValue="/">
              <option value="/">General site concern</option>
              {published.map(({ entry }) => (
                <option key={entry.slug} value={countyCoveragePath(entry)}>
                  {entry.county} custody page
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="correction-category">Concern type</label>
            <select id="correction-category" name="category" defaultValue="stale_data" required>
              <option value="stale_data">Roster may be stale</option>
              <option value="incorrect_roster_display">Roster field appears incorrect</option>
              <option value="incorrect_contact">Verified contact appears incorrect</option>
              <option value="incorrect_guidance">Operational guidance appears incorrect</option>
              <option value="privacy">Privacy concern</option>
              <option value="other">Accessibility or another concern</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="correction-details">What should we review?</label>
            <p className="field-hint" id="details-hint">
              Include the visible field or timestamp and why it may be wrong. Do not submit Social
              Security numbers, medical information, passwords, or payment information.
            </p>
            <textarea
              id="correction-details"
              name="description"
              minLength={20}
              maxLength={5000}
              aria-describedby="details-hint"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="reply-email">
              Email for a reply <span>(optional)</span>
            </label>
            <input
              id="reply-email"
              name="contactEmail"
              type="email"
              autoComplete="email"
              maxLength={320}
            />
          </div>

          <div className="form-trap" aria-hidden="true">
            <label htmlFor="correction-website">Leave this field empty</label>
            <input
              id="correction-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <Button type="submit">Submit concern for review</Button>
        </form>
      </section>

      <section className="content-section prose" aria-labelledby="after-heading">
        <h2 id="after-heading">What happens after a report</h2>
        <p>
          A reviewer triages the category, checks the displayed snapshot and its source health, and
          compares the concern with the stored official evidence. A page can be marked stale or
          withheld while the issue is investigated. Automation may help group and timestamp reports;
          it does not decide that an official record is wrong.
        </p>
        <p>
          If the official source itself appears incorrect, contact the official institution. This
          independent product cannot edit a sheriff, jail, court, or vendor system. Correction
          contact details are limited to the review process and retained according to the privacy
          policy.
        </p>
      </section>
    </main>
  );
}
