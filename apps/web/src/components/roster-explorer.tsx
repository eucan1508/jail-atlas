"use client";

import { useState } from "react";
import { Button } from "@jail-atlas/ui";
import { RosterPageSchema, type PublicRosterRecord } from "@/lib/roster-contract";

function RosterRecordRow({ record }: { record: PublicRosterRecord }) {
  return (
    <tr data-testid="roster-record">
      <th scope="row" data-label="Name and booking">
        <strong>{record.displayName}</strong>
        <span>
          {record.bookingIdentifier
            ? `Booking ${record.bookingIdentifier}`
            : "Booking ID not published"}
        </span>
        <span>Booked {record.bookedAtLabel}</span>
      </th>
      <td data-label="Charges">
        {record.charges.length > 0 ? (
          <ul className="roster-detail-list">
            {record.charges.map((charge, index) => (
              <li key={`${record.recordKey}-charge-${index}`}>
                <strong>{charge.description}</strong>
                {charge.statuteCode ? <span>Code {charge.statuteCode}</span> : null}
              </li>
            ))}
          </ul>
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
  official = false,
  total
}: {
  initialCursor: string | null;
  initialRecords: PublicRosterRecord[];
  sourceId: string;
  official?: boolean;
  total: number;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState(
    initialCursor
      ? `${initialRecords.length} of ${total} records shown.`
      : `All ${total} records are shown.`
  );

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setFailed(false);
    setAnnouncement("Loading more custody records.");

    try {
      const query = new URLSearchParams({ cursor, limit: "25" });
      const response = await fetch(
        `/api/rosters/${encodeURIComponent(sourceId)}/?${query.toString()}`,
        {
          headers: { Accept: "application/json" }
        }
      );
      if (response.status === 400 || response.status === 409 || response.status === 404) {
        setRecords([]);
        setCursor(null);
        setFailed(true);
        setAnnouncement("The roster changed or is unavailable. Refresh this page to check again.");
        return;
      }
      if (!response.ok) throw new Error("Roster continuation request failed.");
      const page = RosterPageSchema.parse(await response.json());
      const existingKeys = new Set(records.map((record) => record.recordKey));
      const newRecords = page.records.filter((record) => !existingKeys.has(record.recordKey));
      const nextCount = records.length + newRecords.length;
      setRecords((current) => [...current, ...newRecords]);
      setCursor(page.nextCursor);
      setAnnouncement(
        page.endOfResults
          ? `All ${nextCount} records are shown. End of results.`
          : `${newRecords.length} more records loaded. ${nextCount} of ${page.total} records shown.`
      );
    } catch {
      setFailed(true);
      setAnnouncement("More records could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="roster-explorer">
      <div className="roster-table-wrap" data-testid="roster-results" data-nosnippet="">
        <table className="roster-table">
          <caption>
            {official
              ? "Current-custody records as reported by the linked official source at the displayed fetch time."
              : "Synthetic current-custody records. Names and identifiers are fictional and are not official information."}
          </caption>
          <thead>
            <tr>
              <th scope="col">Name and booking</th>
              <th scope="col">Source-listed charges</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <RosterRecordRow key={record.recordKey} record={record} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="roster-continuation">
        {cursor ? (
          <Button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            aria-describedby="roster-announcement"
          >
            {loading ? "Loading records…" : failed ? "Try again" : "Load more records"}
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
