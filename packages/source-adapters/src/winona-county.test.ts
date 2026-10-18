import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  WINONA_COUNTY_ADAPTER_KEY,
  WINONA_COUNTY_CURRENT_SOURCE_URL,
  createWinonaCountySourceAdapter,
  type WinonaPdfPage,
  type WinonaPdfTextItem,
  type WinonaRosterIdFactory
} from "./winona-county.js";

type SyntheticInmate = Readonly<{
  name: string;
  arrestTime: string;
  bond: string | null;
  charges: readonly string[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    name: "Tester, Alpha Test",
    arrestTime: "01/02/00 03:04",
    bond: "$75000.00",
    charges: ["999.11.1(1) - Synthetic Offense Alpha", "999.22 - Synthetic Offense Beta"]
  },
  {
    name: "Tester-Doe, Beta",
    arrestTime: "01/03/00 09:00",
    bond: null,
    charges: ["999.33.2(a) - Synthetic Offense Gamma"]
  }
];

const PRINTED = "Printed on January 4, 2000";

/** Lays each person out as the county's report does: name at x=49, charges at x=225. */
function block(person: SyntheticInmate, top: number): WinonaPdfTextItem[] {
  const items: WinonaPdfTextItem[] = [
    { text: person.name, x: 49, y: top },
    { text: `Arrest Time: ${person.arrestTime}`, x: 229, y: top - 18 },
    { text: "On-Site Visitation:", x: 595, y: top - 18 },
    { text: "Age:", x: 79, y: top - 24 },
    { text: "99", x: 107, y: top - 24 },
    { text: "Arresting Agency:", x: 199, y: top - 42 },
    { text: "Synthetic Police Department", x: 289, y: top - 42 },
    { text: "Hold Reason:", x: 217, y: top - 90 },
    { text: "SYNTHETIC HOLD", x: 289, y: top - 90 },
    { text: "Bond/Bail:", x: 229, y: top - 114 },
    { text: "Next Court Date:", x: 211, y: top - 138 },
    { text: "12/14/00", x: 295, y: top - 138 },
    { text: "Charges (Listed Below):", x: 343, y: top - 156 },
    { text: "Date of Mugshot: 01/02/00 04:00", x: 49, y: top - 186 }
  ];
  if (person.bond) items.push({ text: person.bond, x: 283, y: top - 114 });
  person.charges.forEach((charge, index) =>
    items.push({ text: charge, x: 225, y: top - 174 - 12 * index })
  );
  return items;
}

function pages(
  people: readonly SyntheticInmate[] = inmates,
  options: { printed?: string; total?: number; title?: string } = {}
): WinonaPdfPage[] {
  return people.map((person, index) => {
    const page: WinonaPdfTextItem[] = [
      { text: `Page ${index + 1} of ${people.length}`, x: 686, y: 39 },
      { text: "HOLD INFORMATION:", x: 277, y: 503 },
      ...block(person, 481)
    ];
    if (index === 0) {
      page.push(
        { text: options.title ?? "Winona County Sheriff's Office", x: 49, y: 547 },
        { text: "Inmate Roster", x: 49, y: 532 },
        { text: options.printed ?? PRINTED, x: 605, y: 532 }
      );
    }
    if (index === people.length - 1) {
      page.push({ text: `Total Records: ${options.total ?? people.length}`, x: 49, y: 89 });
    }
    return page;
  });
}

function context(sourceUrl: string = WINONA_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.winonacounty.gov/314/Jail",
      relationshipEvidenceUrl: "https://www.winonacounty.gov/314/Jail",
      evidenceDescription: "Synthetic Winona County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: WINONA_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-04T18:00:00.000Z",
    traceId: "synthetic-winona-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): WinonaRosterIdFactory {
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

function adapter(report: readonly WinonaPdfPage[], body: Uint8Array = PDF_BYTES) {
  return createWinonaCountySourceAdapter({
    fetch: async () => new Response(body),
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    extractPdfPages: async () => report,
    nowMs: () => 1_000
  });
}

describe("Winona County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(WINONA_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every person with statute-coded charges and the listed bond", async () => {
    const result = await runSourceAdapter(adapter(pages()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(2);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier,
        booking.charges.map((charge) => [charge.statuteCode, charge.description]),
        booking.bondEntries.map((bond) => (bond.state === "monetary" ? bond.amountMinor : null))
      ])
    ).toEqual([
      [
        "Tester, Alpha Test",
        null,
        [
          ["999.11.1(1)", "Synthetic Offense Alpha"],
          ["999.22", "Synthetic Offense Beta"]
        ],
        [7_500_000]
      ],
      ["Tester-Doe, Beta", null, [["999.33.2(a)", "Synthetic Offense Gamma"]], []]
    ]);
  });

  it("drops ages, agencies, hold reasons, court dates, and mugshot dates", async () => {
    const result = await runSourceAdapter(adapter(pages()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "Synthetic Police Department",
      "SYNTHETIC HOLD",
      "12/14/00",
      "Mugshot",
      "01/02/00"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed on a stale, mismatched, changed, duplicate, or empty report", async () => {
    const cases: [readonly WinonaPdfPage[], string][] = [
      [pages(inmates, { printed: "Printed on December 30, 1999" }), "SOURCE_REPORT_STALE"],
      [pages(inmates, { total: 3 }), "ROSTER_TOTAL_MISMATCH"],
      [
        pages(inmates).map((page) => page.filter((item) => !item.text.startsWith("Total"))),
        "ROSTER_TOTAL_MISSING"
      ],
      [pages(inmates, { title: "Other County Sheriff" }), "SOURCE_IDENTITY_MISMATCH"],
      [
        pages([{ ...inmates[0]!, charges: ["Synthetic offense without statute"] }]),
        "CHARGE_UNREADABLE"
      ],
      [pages([{ ...inmates[0]!, bond: "$75,000" }]), "BOND_UNREADABLE"],
      [pages([inmates[0]!, inmates[0]!]), "DUPLICATE_ROSTER_ENTRY"],
      [
        pages([], { total: 0 }).concat([
          [
            { text: "Winona County Sheriff's Office", x: 49, y: 547 },
            { text: "Inmate Roster", x: 49, y: 532 },
            { text: PRINTED, x: 605, y: 532 },
            { text: "Total Records: 0", x: 49, y: 89 }
          ]
        ]),
        "ROSTER_EMPTY"
      ]
    ];
    for (const [report, code] of cases) {
      const result = await runSourceAdapter(adapter(report), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`WINONA_COUNTY_${code}`);
    }
  });

  it("refuses a body that is not a PDF and a source URL other than the approved report", async () => {
    const notPdf = await runSourceAdapter(
      adapter(pages(), new TextEncoder().encode("<html>")),
      context()
    );
    expect(notPdf.ok).toBe(false);
    if (!notPdf.ok) {
      expect(notPdf.failure.diagnosticCode).toBe("WINONA_COUNTY_INVALID_PDF_SIGNATURE");
    }

    const wrongUrl = await runSourceAdapter(
      adapter(pages()),
      context("https://www.winonacounty.gov/314/Jail")
    );
    expect(wrongUrl.ok).toBe(false);
    if (!wrongUrl.ok) {
      expect(wrongUrl.failure.diagnosticCode).toBe("WINONA_COUNTY_SOURCE_URL_MISMATCH");
    }
  });
});
