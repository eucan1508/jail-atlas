import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="page-main site-shell narrow-shell">
      <p className="eyebrow">404 · Not published</p>
      <h1>This custody page is not available.</h1>
      <div className="page-intro__summary">
        <p>
          A route may be absent because its county has not passed every official-source, ingestion,
          evidence, contact, and human-review gate. Placeholder pages are not created.
        </p>
      </div>
      <p>
        <Link href="/coverage/">Review current coverage</Link>
      </p>
    </main>
  );
}
