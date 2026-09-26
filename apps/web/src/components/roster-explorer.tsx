"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@jail-atlas/ui";
import { RosterPageSchema, type PublicRosterRecord } from "@/lib/roster-contract";

function ChargeDetails({ charge }: { charge: PublicRosterRecord["charges"][number] }) {
  return (
    <>
      <strong>{charge.description}</strong>
      {charge.sourceLabel ? <span>{charge.sourceLabel}</span> : null}
      {charge.statuteCode ? <span>Code {charge.statuteCode}</span> : null}
    </>
  );
}

function RosterRecordRow({ record }: { record: PublicRosterRecord }) {
  const [firstCharge, ...additionalCharges] = record.charges;

  return (
    <tr data-testid="roster-record">
      <th scope="row" data-label="Name">
        <strong>{record.displayName}</strong>
      </th>
      <td data-label="Booking number">{record.bookingIdentifier ?? "Not published"}</td>
      <td data-label="Booked at">{record.bookedAtLabel}</td>
      <td data-label="Charges">
        {firstCharge ? (
          <div className="roster-charges">
            <ul className="roster-detail-list">
              <li>
                <ChargeDetails charge={firstCharge} />
              </li>
            </ul>
            {additionalCharges.length > 0 ? (
              <details className="roster-charges__disclosure">
                <summary>
                  <span className="roster-charges__show">
                    View {additionalCharges.length} more{" "}
                    {additionalCharges.length === 1 ? "charge" : "charges"}
                  </span>
                  <span className="roster-charges__hide">Show fewer charges</span>
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </summary>
                <div
                  className="roster-charges__scroll"
                  role="region"
                  aria-label={`Additional charges for ${record.displayName}`}
                >
                  <ul className="roster-detail-list">
                    {additionalCharges.map((charge, index) => (
                      <li key={`${record.recordKey}-charge-${index + 1}`}>
                        <ChargeDetails charge={charge} />
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <span>Charge information not published</span>
        )}
      </td>
    </tr>
  );
}

export function RosterExplorer({
  initialCursor,
  initialRecords,
  sourceId,
  snapshotId,
  official = false,
  total
}: {
  initialCursor: string | null;
  initialRecords: PublicRosterRecord[];
  sourceId: string;
  snapshotId?: string;
  official?: boolean;
  total: number;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [cursor, setCursor] = useState(initialCursor);
  const [query, setQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"search" | "more" | null>(null);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState(
    initialCursor
      ? `${initialRecords.length} of ${total} records shown.`
      : `All ${total} records are shown.`
  );

  async function requestPage({
    cursor: cursorValue,
    search
  }: {
    cursor?: string;
    search?: string;
  }) {
    const params = new URLSearchParams({ limit: "25" });
    if (cursorValue) params.set("cursor", cursorValue);
    if (search) params.set("search", search);
    if (snapshotId) params.set("snapshotId", snapshotId);

    const response = await fetch(
      `/api/rosters/${encodeURIComponent(sourceId)}/?${params.toString()}`,
      {
        headers: { Accept: "application/json" }
      }
    );
    if (response.status === 400 || response.status === 409 || response.status === 404) {
      throw new Error("The roster changed or is unavailable. Refresh this page to check again.");
    }
    if (!response.ok) throw new Error("Roster request failed.");
    return RosterPageSchema.parse(await response.json());
  }

  async function searchRoster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const search = query.trim();
    if (!search) {
      setRecords(initialRecords);
      setCursor(initialCursor);
      setActiveSearch("");
      setFailed(false);
      setAnnouncement(
        initialCursor
          ? `${initialRecords.length} of ${total} records shown.`
          : `All ${total} records are shown.`
      );
      return;
    }

    setLoading(true);
    setLoadingMode("search");
    setFailed(false);
    setAnnouncement(`Searching all current custody records for ${search}.`);
    try {
      const page = await requestPage({ search });
      setRecords(page.records);
      setCursor(page.nextCursor);
      setActiveSearch(search);
      setAnnouncement(
        page.total === 0
          ? `No current custody records match ${search}.`
          : page.endOfResults
            ? `${page.total} matching ${page.total === 1 ? "record" : "records"} shown.`
            : `${page.records.length} of ${page.total} matching records shown.`
      );
    } catch (error) {
      setFailed(true);
      setAnnouncement(
        error instanceof Error && error.message.startsWith("The roster changed")
          ? error.message
          : "The roster search could not be completed. Try again."
      );
    } finally {
      setLoading(false);
      setLoadingMode(null);
    }
  }

  function clearSearch() {
    if (loading) return;
    setQuery("");
    setRecords(initialRecords);
    setCursor(initialCursor);
    setActiveSearch("");
    setFailed(false);
    setAnnouncement(
      initialCursor
        ? `${initialRecords.length} of ${total} records shown.`
        : `All ${total} records are shown.`
    );
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setLoadingMode("more");
    setFailed(false);
    setAnnouncement("Loading more custody records.");

    try {
      const page = await requestPage({ cursor, search: activeSearch });
      const existingKeys = new Set(records.map((record) => record.recordKey));
      const newRecords = page.records.filter((record) => !existingKeys.has(record.recordKey));
      const nextCount = records.length + newRecords.length;
      setRecords((current) => [...current, ...newRecords]);
      setCursor(page.nextCursor);
      setAnnouncement(
        page.endOfResults
          ? activeSearch
            ? `All ${nextCount} matching records are shown. End of results.`
            : `All ${nextCount} records are shown. End of results.`
          : activeSearch
            ? `${newRecords.length} more matching records loaded. ${nextCount} of ${page.total} shown.`
            : `${newRecords.length} more records loaded. ${nextCount} of ${page.total} records shown.`
      );
    } catch (error) {
      setFailed(true);
      setAnnouncement(
        error instanceof Error && error.message.startsWith("The roster changed")
          ? error.message
          : "More records could not be loaded. Try again."
      );
    } finally {
      setLoading(false);
      setLoadingMode(null);
    }
  }

  return (
    <div className="roster-explorer">
      <form className="roster-search" onSubmit={(event) => void searchRoster(event)}>
        <label htmlFor="roster-search-input">Search current custody records</label>
        <div className="roster-search__controls">
          <input
            id="roster-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            autoComplete="off"
            maxLength={80}
            disabled={loading}
          />
          <Button type="submit" disabled={loading}>
            {loadingMode === "search" ? "Searching…" : "Search roster"}
          </Button>
          {activeSearch || query ? (
            <Button
              className="roster-search__clear"
              type="button"
              variant="secondary"
              onClick={clearSearch}
            >
              Clear
            </Button>
          ) : null}
        </div>
        <p>Searches every current roster name, not just the records visible below.</p>
      </form>
      <div className="roster-table-wrap" data-testid="roster-results" data-nosnippet="">
        <table className="roster-table">
          <caption>
            {official
              ? "Current-custody records captured from the approved source at the displayed fetch time."
              : "Synthetic current-custody records. Names and identifiers are fictional and are not official information."}
          </caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Booking number</th>
              <th scope="col">Booked at</th>
              <th scope="col">Charges</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <RosterRecordRow key={record.recordKey} record={record} />
            ))}
          </tbody>
        </table>
        {records.length === 0 ? (
          <p className="roster-empty">
            {activeSearch
              ? `No current custody records match ${activeSearch}.`
              : "No current custody records are published."}
          </p>
        ) : null}
      </div>

      <div className="roster-continuation">
        {cursor ? (
          <Button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            aria-describedby="roster-announcement"
          >
            {loadingMode === "more"
              ? "Loading records…"
              : failed
                ? "Try again"
                : "Load more records"}
          </Button>
        ) : null}
        <p
          id="roster-announcement"
          className={
            failed ? "roster-announcement roster-announcement--error" : "roster-announcement"
          }
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </p>
      </div>
    </div>
  );
}
