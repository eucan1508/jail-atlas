import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  summary,
  title
}: {
  eyebrow?: string;
  summary: ReactNode;
  title: string;
}) {
  return (
    <header className="page-intro">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      <div className="page-intro__summary">{summary}</div>
    </header>
  );
}
