import Link from "next/link";
import type { CountyCoverageBrief } from "@/lib/coverage-catalog";

export function CountyCoverageCard({
  entry,
  href,
  published = true,
  actionLabel = "View county page"
}: {
  entry: CountyCoverageBrief;
  href?: string;
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
        <span className="coverage-card__status">Live roster</span>
      </div>
      <div className="coverage-card__body">
        <p className="eyebrow">
          {entry.stateName} · {entry.seatCity}
        </p>
        <h3>{entry.county}</h3>
        <p>{entry.description}</p>
      </div>
      <div className="coverage-card__footer">
        <span>JailAtlas roster</span>
        <div className="coverage-card__actions">
          {published && href ? (
            <Link href={href}>
              {actionLabel} <span aria-hidden="true">↗</span>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
