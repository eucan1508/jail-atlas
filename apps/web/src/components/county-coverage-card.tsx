import Link from "next/link";
import { StatusPill } from "@jail-atlas/ui";
import type { CountyCoverageBrief } from "@/lib/coverage-catalog";

export function CountyCoverageCard({
  entry,
  href,
  published = false,
  actionLabel = "Review page brief"
}: {
  entry: CountyCoverageBrief;
  href: string;
  published?: boolean;
  actionLabel?: string;
}) {
  const stateCode = entry.state === "iowa" ? "IA" : "MN";

  return (
    <article className="surface-card coverage-card">
      <div className="coverage-card__topline">
        <span className="coverage-card__state" aria-hidden="true">
          {stateCode}
        </span>
        <StatusPill tone={published ? "current" : "neutral"}>
          {published ? "Published source" : "Source under review"}
        </StatusPill>
      </div>
      <div className="coverage-card__visual" aria-hidden="true">
        <span className="coverage-card__visual-grid" />
        <span className="coverage-card__visual-pin" />
        <span className="coverage-card__visual-label">{entry.seatCity}</span>
      </div>
      <div className="coverage-card__body">
        <p className="eyebrow">
          {entry.stateName} · {entry.seatCity}
        </p>
        <h3>{entry.county}</h3>
        <p>{entry.description}</p>
      </div>
      <div className="coverage-card__footer">
        <span>Official source</span>
        <div className="coverage-card__actions">
          <Link href={href}>
            {actionLabel} <span aria-hidden="true">↗</span>
          </Link>
          <a href={entry.officialSourceUrl} rel="noreferrer" target="_blank">
            Source <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
