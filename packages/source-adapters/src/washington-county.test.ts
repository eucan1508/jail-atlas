import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  createWashingtonCountyMnSourceAdapter,
  WASHINGTON_COUNTY_MN_ADAPTER_KEY,
  WASHINGTON_COUNTY_MN_CURRENT_SOURCE_URL,
  type WashingtonPdfPage,
  type WashingtonPdfTextItem,
  type WashingtonRosterIdFactory
} from "./washington-county.js";

function context(
  sourceUrl: string = WASHINGTON_COUNTY_MN_CURRENT_SOURCE_URL,
  requestedAt = "2000-01-02T18:00:00.000Z"
): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000101",
    source: {
      id: "00000000-0000-4000-8000-000000000102",
      officialInstitutionId: "00000000-0000-4000-8000-000000000103",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://washingtoncountymn.gov/3214/Inmate-Information",
      relationshipEvidenceUrl: "https://washingtoncountymn.gov/3214/Inmate-Information",
      evidenceDescription: "Synthetic Washington County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: WASHINGTON_COUNTY_MN_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt,
    traceId: "synthetic-washington-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): WashingtonRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 110;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function pdfResponse(): Response {
  return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), {
    status: 200,
    headers: { "content-type": "application/pdf" }
  });
}

function adapter(pages: readonly WashingtonPdfPage[]) {
  return createWashingtonCountyMnSourceAdapter({
    fetch: async () => pdfResponse(),
    facilityId: "00000000-0000-4000-8000-000000000104",
    createId: idFactory(),
    extractPdfPages: async () => pages,
    nowMs: () => 1_000
  });
}

const AS_OF = "01/02/2000 12:00:05 PM";

// Column positions mirror the official report layout.
function page(
  rows: readonly WashingtonPdfTextItem[][],
  pageNumber: number,
  pageCount: number,
  total: number,
  asOf = AS_OF
): WashingtonPdfPage {
  return [
    { text: "ADULT INMATE ROSTER REPORT", x: 41, y: 702 },
    { text: "Washington County Jail", x: 106, y: 682 },
    { text: "15015 62nd St. N.", x: 106, y: 666 },
    { text: "Active Inmates as of:", x: 205, y: 641 },
    { text: asOf, x: 313, y: 641 },
    { text: `Inmate Count: ${total}`, x: 40, y: 616 },
    { text: "Last Name", x: 40, y: 599 },
    { text: "First Name", x: 139, y: 599 },
    { text: "MI", x: 226, y: 599 },
    { text: "JID #", x: 288, y: 599 },
    { text: "Booking Date Booking#", x: 346, y: 599 },
    { text: "Release Est. # Days", x: 476, y: 599 },
    ...rows.flat(),
    { text: "v1.2 8/25", x: 40, y: 85 },
    { text: "DATE", x: 244, y: 84 },
    { text: "01/02/2000", x: 269, y: 84 },
    { text: "PAGE", x: 525, y: 84 },
    { text: String(pageNumber), x: 549, y: 84 },
    { text: "OF", x: 556, y: 84 },
    { text: String(pageCount), x: 569, y: 84 }
  ];
}

function row(
  y: number,
  last: string | string[],
  first: string,
  middle: string | string[],
  jid: string,
  booking: string,
  release = ""
): WashingtonPdfTextItem[] {
  const lines = (value: string | string[], x: number) =>
    (Array.isArray(value) ? value : [value])
      .filter(Boolean)
      .map((text, index) => ({ text, x, y: y - index * 11 }));
  return [
    ...lines(last, 40),
    ...lines(first, 139),
    ...lines(middle, 226),
    { text: jid, x: 288, y },
    { text: "01/01/00", x: 346, y },
    { text: booking, x: 416, y },
    ...(release ? [{ text: release, x: 476, y }] : []),
    { text: "9", x: 540, y }
  ];
}

const firstPage = page(
  [
    row(583, "TESTER", "Alpha", "Test", "J00000001", "0000001", "01/01/00"),
    row(565, ["DOUBLE-", "BARREL"], "Beta", "", "J00000002", "0000002"),
    row(540, "TESTER SAMPLE Gamma", "", "", "J00000003", "0000003")
  ],
  1,
  2,
  4
);
const lastPage = page(
  [row(583, "EXAMPLE", "Delta", ["Longmiddle", "name"], "J00000004", "0000004")],
  2,
  2,
  4
);

describe("Washington County, Minnesota source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(WASHINGTON_COUNTY_MN_ADAPTER_KEY)).toBe(false);
  });

  it("reads every row with its booking number and joins wrapped names", async () => {
    const result = await runSourceAdapter(adapter([firstPage, lastPage]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(4);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier?.value
      ])
    ).toEqual([
      ["TESTER, Alpha Test", "0000001"],
      ["DOUBLE-BARREL, Beta", "0000002"],
      ["TESTER SAMPLE, Gamma", "0000003"],
      ["EXAMPLE, Delta Longmiddlename", "0000004"]
    ]);
    expect(result.snapshot.bookings[0]?.bookingIdentifier?.sourceLabel).toBe("Booking#");
  });

  it("drops JIDs, booking dates, release estimates, and day counts", async () => {
    const result = await runSourceAdapter(adapter([firstPage, lastPage]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const booking = result.snapshot.bookings[0];
    expect(booking?.charges).toEqual([]);
    expect(booking?.bondEntries).toEqual([]);
    expect(booking?.bookedAt).toBeNull();
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["J0000000", "01/01/00", "v1.2"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("accepts only an explicit zero count as valid empty", async () => {
    const result = await runSourceAdapter(adapter([page([], 1, 1, 0)]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emptyResult.kind).toBe("valid_empty");
    expect(result.snapshot.recordCount).toBe(0);
  });

  it("fails closed when rows, pages, or counts do not add up", async () => {
    const cases: [readonly WashingtonPdfPage[], string][] = [
      [[firstPage], "PAGE_SEQUENCE_MISMATCH"],
      [[firstPage, page([], 2, 2, 4)], "RECORD_COUNT_MISMATCH"],
      [
        [firstPage, page([row(583, "X", "Y", "", "J00000004", "0000004")], 2, 2, 5)],
        "ROSTER_CHANGED_DURING_PRINT"
      ],
      [
        [
          firstPage,
          page([row(583, "X", "Y", "", "J00000004", "0000004")], 2, 2, 4, "01/02/2000 1:00:00 PM")
        ],
        "ROSTER_CHANGED_DURING_PRINT"
      ],
      [
        [firstPage, page([row(583, "X", "Y", "", "J00000004", "0000001")], 2, 2, 4)],
        "DUPLICATE_BOOKING_NUMBER"
      ],
      [
        [firstPage, page([row(583, "X", "Y", "", "J00000004", "BOOKING")], 2, 2, 4)],
        "INVALID_RECORD_IDENTITY"
      ],
      [
        [firstPage, [...lastPage, { text: "orphaned", x: 40, y: 594 }]],
        "RECORD_SPLIT_ACROSS_PAGES"
      ],
      [
        [firstPage.filter((item) => item.text !== "Washington County Jail"), lastPage],
        "SOURCE_IDENTITY_MISMATCH"
      ]
    ];
    for (const [pages, code] of cases) {
      const result = await runSourceAdapter(adapter(pages), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`WASHINGTON_COUNTY_MN_${code}`);
    }
  });

  it("refuses a report that has not been regenerated for days", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage]),
      context(WASHINGTON_COUNTY_MN_CURRENT_SOURCE_URL, "2000-01-05T18:00:00.000Z")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_MN_SOURCE_REPORT_STALE");
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage]),
      context("https://washingtoncountymn.gov/3214/Inmate-Information")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_MN_SOURCE_URL_MISMATCH");
  });
});
