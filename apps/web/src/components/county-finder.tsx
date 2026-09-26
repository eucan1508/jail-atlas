"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { countyCoveragePath, type CountyCoverageBrief } from "@/lib/coverage-catalog";

export function CountyFinder({
  compact = false,
  counties = []
}: {
  compact?: boolean;
  counties?: readonly CountyCoverageBrief[] | undefined;
}) {
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

  return (
    <section
      className={compact ? "county-finder county-finder--compact" : "county-finder"}
      aria-label="Search public county pages"
    >
      <div className="county-finder__search">
        <label htmlFor={compact ? "finder-search-compact" : "finder-search"}>
          Search by state or county
        </label>
        <input
          id={compact ? "finder-search-compact" : "finder-search"}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try Dallas, Iowa, or Ramsey"
          autoComplete="off"
        />
        <span className="county-finder__count">
          {counties.length === 0
            ? "No public county pages yet"
            : `${matches.length} ${matches.length === 1 ? "page" : "pages"} found`}
        </span>
      </div>
      <div className="county-finder__results" aria-live="polite">
        {matches.length > 0 ? (
          matches.slice(0, 8).map((county) => (
            <Link
              className="county-finder__result"
              href={countyCoveragePath(county)}
              key={county.slug}
            >
              <span className="county-finder__result-state">
                {county.state === "iowa" ? "IA" : "MN"}
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
        {matches.length > 8 ? (
          <p className="county-finder__more">Showing the first 8 matches.</p>
        ) : null}
      </div>
    </section>
  );
}
