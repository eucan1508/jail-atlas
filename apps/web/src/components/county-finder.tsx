"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { countyCoveragePath, type CountyCoverageBrief } from "@/lib/coverage-catalog";

export function CountyFinder({
  compact = false,
  counties = [],
  label = "Search by state or county",
  placeholder = "Try Dallas, Iowa, or Ramsey"
}: {
  compact?: boolean;
  counties?: readonly CountyCoverageBrief[] | undefined;
  label?: string;
  placeholder?: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
  const matches = useMemo(
    () =>
      counties.filter((county) =>
        [county.county, county.stateName, county.seatCity].some((value) =>
          value.toLocaleLowerCase("en-US").includes(normalizedQuery)
        )
      ),
    [counties, normalizedQuery]
  );
  const showResults = compact || normalizedQuery.length > 0;

  return (
    <section
      className={compact ? "county-finder county-finder--compact" : "county-finder"}
      aria-label="County search"
    >
      <div className="county-finder__search">
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      <div className="county-finder__results" aria-live="polite">
        {!showResults ? null : matches.length > 0 ? (
          matches.map((county) => (
            <Link
              className="county-finder__result"
              href={countyCoveragePath(county)}
              key={county.slug}
            >
              <span className="county-finder__result-state">
                {{ iowa: "IA", minnesota: "MN", texas: "TX", arkansas: "AR" }[county.state]}
              </span>
              <span className="county-finder__result-copy">
                <strong>{county.county}</strong>
                <small>
                  {county.stateName} · {county.seatCity}
                </small>
              </span>
              <span className="county-finder__result-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))
        ) : (
          <p className="county-finder__empty">
            {counties.length === 0
              ? "Public pages will appear here after source review is complete."
              : "No public county page matches that search."}
          </p>
        )}
      </div>
    </section>
  );
}
