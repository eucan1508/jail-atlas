import { Breadcrumbs } from "./breadcrumbs";
import { PageIntro } from "./page-intro";

export interface TrustSection {
  bullets?: string[];
  heading: string;
  paragraphs: string[];
}

export function TrustPage({
  eyebrow,
  sections,
  summary,
  title,
  path
}: {
  eyebrow: string;
  path: string;
  sections: TrustSection[];
  summary: string;
  title: string;
}) {
  return (
    <main id="main-content" className="page-main site-shell narrow-shell">
      <Breadcrumbs currentPath={path} items={[{ href: "/", label: "Home" }, { label: title }]} />
      <PageIntro eyebrow={eyebrow} title={title} summary={<p>{summary}</p>} />
      <div className="prose trust-content">
        {sections.map((section) => (
          <section className="content-section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
