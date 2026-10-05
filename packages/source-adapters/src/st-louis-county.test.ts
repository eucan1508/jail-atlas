import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  ST_LOUIS_COUNTY_ADAPTER_KEY,
  ST_LOUIS_COUNTY_CURRENT_SOURCE_URL,
  createStLouisCountySourceAdapter,
  type StLouisPdfPage,
  type StLouisRosterIdFactory
} from "./st-louis-county.js";

type SyntheticEntry = Readonly<{
  sequence: number;
  nameLines: readonly string[];
  location?: string;
  charges: readonly string[];
}>;

function context(sourceUrl = ST_LOUIS_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000121",
    source: {
      id: "00000000-0000-4000-8000-000000000122",
      officialInstitutionId: "00000000-0000-4000-8000-000000000123",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail",
      relationshipEvidenceUrl:
        "https://www.stlouiscountymn.gov/departments-a-z/sheriff/jail/jail-roster",
      evidenceDescription: "Synthetic St. Louis County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: ST_LOUIS_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-st-louis-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): StLouisRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 130;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

// Positions mirror the official Oracle report: four entries per page, 163 points apart.
function page(pageNumber: number, pageCount: number, entries: readonly SyntheticEntry[]) {
  const items: { text: string; x: number; y: number }[] = [
    { text: "SAINT LOUIS COUNTY JAIL", x: 207, y: 770 },
    { text: "JAIL ROSTER REPORT", x: 234, y: 753 },
    { text: "Current Inmates as of January 1, 2000 1:00 PM", x: 196, y: 738 },
    { text: `Page ${pageNumber} of`, x: 508, y: 771 },
    { text: String(pageCount), x: 558, y: 771 }
  ];
  entries.forEach((entry, index) => {
    const top = 712 - index * 163;
    items.push({ text: String(entry.sequence), x: 15, y: top + 1 });
    entry.nameLines.forEach((line, lineIndex) =>
      items.push({ text: line, x: 34, y: top - lineIndex * 12 })
    );
    items.push(
      { text: "DOB:", x: 169, y: top - 2 },
      { text: "01/01/1900", x: 195, y: top - 2 },
      { text: "Location:", x: 257, y: top - 2 },
      { text: entry.location ?? "Saint Louis County Jail", x: 303, y: top - 2 },
      { text: "Bail:", x: 483, y: top - 3 },
      { text: "$1,000.00", x: 506, y: top - 3 },
      { text: "Age:", x: 170, y: top - 19 },
      { text: "Booking Date:", x: 215, y: top - 19 },
      { text: "01/01/2000 9:00 pm", x: 284, y: top - 18 },
      { text: "Arresting Agency:", x: 173, y: top - 40 },
      { text: "Synthetic Agency", x: 262, y: top - 39 },
      { text: "Charges", x: 183, y: top - 53 },
      { text: "Offense Level", x: 442, y: top - 54 }
    );
    entry.charges.forEach((charge, chargeIndex) => {
      const y = top - 71 - chargeIndex * 15;
      items.push(
        { text: String(chargeIndex + 1), x: 177, y },
        { text: charge, x: 183, y },
        { text: "Felony", x: 440, y },
        { text: "Remand", x: 517, y }
      );
    });
  });
  return items as StLouisPdfPage;
}

function pdfResponse(): Response {
  return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), {
    status: 200,
    headers: { "content-type": "application/pdf" }
  });
}

function adapter(pages: readonly StLouisPdfPage[]) {
  return createStLouisCountySourceAdapter({
    fetch: async () => pdfResponse(),
    facilityId: "00000000-0000-4000-8000-000000000124",
    createId: idFactory(),
    extractPdfPages: async () => pages,
    nowMs: () => 1_000
  });
}

const firstPageEntries: readonly SyntheticEntry[] = [
  { sequence: 1, nameLines: ["Tester, Alpha", "#10001"], charges: ["SYNTHETIC OFFENSE A"] },
  {
    sequence: 2,
    nameLines: ["Tester, Beta Long", "Name #10002"],
    charges: ["SYNTHETIC OFFENSE B", "SYNTHETIC OFFENSE C"]
  },
  {
    sequence: 3,
    nameLines: ["Tester, Gamma", "#10003"],
    location: "Example County Jail",
    charges: ["SYNTHETIC OFFENSE D"]
  },
  { sequence: 4, nameLines: ["Tester, Delta", "#10004"], charges: [] }
];
const secondPageEntries: readonly SyntheticEntry[] = [
  { sequence: 5, nameLines: ["Tester, Epsilon", "#10005"], charges: ["SYNTHETIC OFFENSE E"] }
];

describe("St. Louis County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(ST_LOUIS_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("keeps people at the Duluth jail, joins wrapped names, and drops the LID", async () => {
    const result = await runSourceAdapter(
      adapter([page(1, 2, firstPageEntries), page(2, 2, secondPageEntries)]),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.bookings.map((booking) => booking.person.displayName)).toEqual([
      "Tester, Alpha",
      "Tester, Beta Long Name",
      "Tester, Delta",
      "Tester, Epsilon"
    ]);
    expect(result.snapshot.bookings[1]?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC OFFENSE B",
      "SYNTHETIC OFFENSE C"
    ]);
    expect(result.snapshot.bookings[2]?.charges).toEqual([]);
    expect(result.snapshot.bookings[0]?.bookingIdentifier).toBeNull();
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["#10001", "10001", "Synthetic Agency", "01/01/1900", "Tester, Gamma"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the running numbers skip an entry", async () => {
    const result = await runSourceAdapter(
      adapter([
        page(1, 2, firstPageEntries),
        page(2, 2, [{ ...secondPageEntries[0]!, sequence: 6 }])
      ]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ST_LOUIS_COUNTY_SEQUENCE_GAP");
  });

  it("fails closed when a page of the report is missing", async () => {
    const result = await runSourceAdapter(adapter([page(1, 2, firstPageEntries)]), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ST_LOUIS_COUNTY_PAGE_SEQUENCE_MISMATCH");
  });

  it("fails closed when an entry has no LID after the name", async () => {
    const result = await runSourceAdapter(
      adapter([page(1, 1, [{ sequence: 1, nameLines: ["Tester, Alpha"], charges: [] }])]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ST_LOUIS_COUNTY_INVALID_RECORD_IDENTITY");
  });

  it("fails closed when nobody is placed at the Duluth jail", async () => {
    const result = await runSourceAdapter(
      adapter([
        page(1, 1, [
          {
            sequence: 1,
            nameLines: ["Tester, Alpha", "#10001"],
            location: "Example County Jail",
            charges: []
          }
        ])
      ]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ST_LOUIS_COUNTY_NO_RECORDS_AT_JAIL");
  });

  it("rejects a PDF that is not the St. Louis County roster report", async () => {
    const pages = [
      page(1, 1, firstPageEntries.slice(0, 1)).filter((item) => item.text !== "JAIL ROSTER REPORT")
    ];
    const result = await runSourceAdapter(adapter(pages), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ST_LOUIS_COUNTY_SOURCE_IDENTITY_MISMATCH");
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter([page(1, 1, firstPageEntries.slice(0, 1))]),
      context("https://www.stlouiscountymn.gov/Portals/0/rpts/SLCJ_Jail_Roster_Rel.pdf")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ST_LOUIS_COUNTY_SOURCE_URL_MISMATCH");
  });
});
