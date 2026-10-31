import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  COTTONWOOD_COUNTY_ROSTER_REPORT,
  REDWOOD_COUNTY_ROSTER_REPORT,
  createJailRosterReportAdapter,
  parseJailRosterBail,
  type JailRosterReportConfig,
  type JailRosterReportPdfPage,
  type JailRosterReportPdfTextItem,
  type JailRosterReportIdFactory
} from "./jail-roster-report.js";

type SyntheticInmate = Readonly<{
  // A long name wraps onto a second line.
  nameLines: readonly string[];
  bookingDate: string;
  holdReason: string;
  // Each charge is printed as one or more wrapped lines.
  charges: readonly (readonly string[])[];
  bail: readonly string[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    nameLines: ["Tester (Doe),", "Alpha Test"],
    bookingDate: "01/02/00",
    holdReason: "Pending Charge/Investigation",
    charges: [
      ["999.11.1(a) - Synthetic Offense Alpha - Arrest of", "Adult"],
      ["999A.22 - Synthetic Offense Beta"]
    ],
    bail: ["Bail/Bond -", "$20000.00 - Court", "Order", "ROR - $0.00 - Court", "Order"]
  },
  {
    nameLines: ["Tester, Beta"],
    bookingDate: "01/03/00",
    holdReason: "Bench Warrant",
    charges: [["999.33 - Synthetic Offense Gamma"]],
    bail: []
  }
];

const PRINTED = "Printed on January 4, 2000";
const HEADERS: JailRosterReportPdfTextItem[] = [
  { text: "Inmate", x: 67.2, y: 558.4 },
  { text: "Charges", x: 235.2, y: 558.4 },
  { text: "Held For", x: 433.2, y: 558.4 },
  { text: "Booking Date", x: 511.2, y: 558.4 },
  { text: "Projected Release", x: 571.2, y: 558.4 },
  { text: "Bail Amount", x: 667.2, y: 558.4 }
];

/** Lays each person out as the county's report does, starting at the booking date row. */
function block(person: SyntheticInmate, top: number): JailRosterReportPdfTextItem[] {
  const items: JailRosterReportPdfTextItem[] = [
    { text: "Synthetic Police", x: 421.2, y: top },
    { text: "Department", x: 421.2, y: top - 9.6 },
    { text: person.bookingDate, x: 517.2, y: top },
    { text: "02/01/00", x: 583.2, y: top },
    { text: person.holdReason, x: 127.2, y: top - 6 }
  ];
  person.bail.forEach((text, index) => items.push({ text, x: 661.2, y: top - 9.6 * index }));
  let y = top - 24;
  for (const charge of person.charges) {
    for (const line of charge) {
      items.push({ text: line, x: 127.2, y });
      y -= 9.6;
    }
  }
  person.nameLines.forEach((text, index) =>
    items.push({ text, x: 49.2, y: top - 90 - 9.6 * index })
  );
  return items;
}

function pages(
  people: readonly SyntheticInmate[] = inmates,
  options: { printed?: string; total?: number; title?: string } = {}
): JailRosterReportPdfPage[] {
  const report = people.map((person, index) => [
    { text: `Page ${index + 1} of ${people.length}`, x: 686.3, y: 39 },
    ...HEADERS,
    ...block(person, 538.4)
  ]);
  if (report.length === 0) report.push([...HEADERS]);
  report[0]!.push(
    { text: options.title ?? "Jail Roster", x: 49.2, y: 590.4 },
    { text: options.printed ?? PRINTED, x: 604.6, y: 590.4 }
  );
  report.at(-1)!.push({ text: `Total Records: ${options.total ?? people.length}`, x: 49.2, y: 60 });
  return report;
}

function context(
  sourceUrl: string = COTTONWOOD_COUNTY_ROSTER_REPORT.sourceUrl,
  config: JailRosterReportConfig = COTTONWOOD_COUNTY_ROSTER_REPORT
): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl:
        "https://www.cottonwoodcountymn.gov/departments/courts___legal/sheriff/jail.php",
      relationshipEvidenceUrl:
        "https://www.cottonwoodcountymn.gov/departments/courts___legal/sheriff/jail_roster.php",
      evidenceDescription: "Synthetic Cottonwood County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: config.adapterKey,
      publicationApproved: false
    },
    requestedAt: "2000-01-04T18:00:00.000Z",
    traceId: "synthetic-cottonwood-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): JailRosterReportIdFactory {
  const ids = new Map<string, string>();
  let sequence = 910;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function adapter(
  report: readonly JailRosterReportPdfPage[],
  body: Uint8Array = PDF_BYTES,
  config: JailRosterReportConfig = COTTONWOOD_COUNTY_ROSTER_REPORT
) {
  return createJailRosterReportAdapter(config, {
    fetch: async () => new Response(body),
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    extractPdfPages: async () => report,
    nowMs: () => 1_000
  });
}

describe("Minnesota jail roster report adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(COTTONWOOD_COUNTY_ROSTER_REPORT.adapterKey)).toBe(false);
  });

  it("reads each person with wrapped names, joined charges, and every bail entry", async () => {
    const result = await runSourceAdapter(adapter(pages()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.charges.map((charge) => [charge.statuteCode, charge.description]),
        booking.bondEntries.map((bond) =>
          bond.state === "monetary" ? [bond.sourceLabel, bond.amountMinor, bond.note] : null
        )
      ])
    ).toEqual([
      [
        "Tester (Doe), Alpha Test",
        [
          ["999.11.1(a)", "Synthetic Offense Alpha - Arrest of Adult"],
          ["999A.22", "Synthetic Offense Beta"]
        ],
        [
          ["Bail/Bond", 2_000_000, "Court Order"],
          ["ROR", 0, "Court Order; The source displays $0.00; this is not interpreted as no bond."]
        ]
      ],
      ["Tester, Beta", [["999.33", "Synthetic Offense Gamma"]], []]
    ]);
  });

  it("reads a county whose charges start on the block's first row", async () => {
    // Redwood County prints no hold reason; the first charge sits on the booking date row.
    const report = pages(inmates, { title: REDWOOD_COUNTY_ROSTER_REPORT.title }).map((page) =>
      page
        .filter(
          (item) => item.text !== inmates[0]!.holdReason && item.text !== inmates[1]!.holdReason
        )
        .map((item) => (item.x === 127.2 ? { ...item, y: item.y + 24 } : item))
    );
    const result = await runSourceAdapter(
      adapter(report, PDF_BYTES, REDWOOD_COUNTY_ROSTER_REPORT),
      context(REDWOOD_COUNTY_ROSTER_REPORT.sourceUrl, REDWOOD_COUNTY_ROSTER_REPORT)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.bookings.map((booking) => booking.charges.length)).toEqual([2, 1]);
    expect(result.snapshot.bookings[0]!.charges[0]!.description).toBe(
      "Synthetic Offense Alpha - Arrest of Adult"
    );
  });

  it("drops agencies, hold reasons, booking dates, and release dates", async () => {
    const result = await runSourceAdapter(adapter(pages()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "Synthetic Police",
      "Pending Charge",
      "Bench Warrant",
      "01/02/00",
      "02/01/00"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("splits bail entries that wrap across lines and refuses one it cannot read", () => {
    expect(parseJailRosterBail("Bail/Bond - $250000.00 Bail/Bond - $1000.00")).toEqual([
      { label: "Bail/Bond", amountMinor: 25_000_000, note: null },
      { label: "Bail/Bond", amountMinor: 100_000, note: null }
    ]);
    expect(
      parseJailRosterBail("Bail/Bond - $0.00 - Court Cash Only - $400.00 ROR - $0.00 - Court")
    ).toEqual([
      { label: "Bail/Bond", amountMinor: 0, note: "Court" },
      { label: "Cash Only", amountMinor: 40_000, note: null },
      { label: "ROR", amountMinor: 0, note: "Court" }
    ]);
    expect(() => parseJailRosterBail("No Bail")).toThrow("BAIL_UNREADABLE");
  });

  it("fails closed on a stale, mismatched, changed, duplicate, or empty report", async () => {
    const moved = pages();
    moved[0] = [...moved[0]!, { text: "Synthetic new column", x: 300, y: 500 }];
    const split = pages();
    split[1] = [...split[1]!, { text: "999.44 - Synthetic continued", x: 127.2, y: 545 }];
    const cases: [readonly JailRosterReportPdfPage[], string][] = [
      [pages(inmates, { printed: "Printed on December 30, 1999" }), "SOURCE_REPORT_STALE"],
      [pages(inmates, { total: 3 }), "ROSTER_TOTAL_MISMATCH"],
      [
        pages(inmates).map((page) => page.filter((item) => !item.text.startsWith("Total"))),
        "ROSTER_TOTAL_MISSING"
      ],
      [pages(inmates, { title: "Other Report" }), "SOURCE_IDENTITY_MISMATCH"],
      [
        pages(inmates).map((page) => page.filter((item) => item.text !== "Bail Amount")),
        "COLUMNS_CHANGED"
      ],
      [moved, "LAYOUT_CHANGED"],
      [split, "RECORD_SPLIT_ACROSS_PAGES"],
      [
        pages([{ ...inmates[1]!, charges: [["Synthetic offense without statute"]] }]),
        "CHARGE_UNREADABLE"
      ],
      [pages([{ ...inmates[1]!, nameLines: ["Tester Beta"] }]), "NAME_UNREADABLE"],
      [pages([{ ...inmates[1]!, bail: ["Bail/Bond - $75,000"] }]), "BAIL_UNREADABLE"],
      [pages([inmates[1]!, inmates[1]!]), "DUPLICATE_ROSTER_ENTRY"],
      [
        pages(
          ["A", "B", "C"].map((letter) => ({
            ...inmates[1]!,
            nameLines: [`Tester, ${letter}`],
            charges: []
          }))
        ),
        "CHARGES_MISSING"
      ],
      [pages([]), "ROSTER_EMPTY"]
    ];
    for (const [report, code] of cases) {
      const result = await runSourceAdapter(adapter(report), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`COTTONWOOD_COUNTY_${code}`);
    }
  });

  it("refuses a body that is not a PDF and a source URL other than the approved report", async () => {
    const notPdf = await runSourceAdapter(
      adapter(pages(), new TextEncoder().encode("<html>")),
      context()
    );
    expect(notPdf.ok).toBe(false);
    if (!notPdf.ok) {
      expect(notPdf.failure.diagnosticCode).toBe("COTTONWOOD_COUNTY_INVALID_PDF_SIGNATURE");
    }

    const wrongUrl = await runSourceAdapter(
      adapter(pages()),
      context("https://www.cottonwoodcountymn.gov/Photo%20Gallery/Sheriff/Jail%20Roster.pdf")
    );
    expect(wrongUrl.ok).toBe(false);
    if (!wrongUrl.ok) {
      expect(wrongUrl.failure.diagnosticCode).toBe("COTTONWOOD_COUNTY_SOURCE_URL_MISMATCH");
    }
  });
});
