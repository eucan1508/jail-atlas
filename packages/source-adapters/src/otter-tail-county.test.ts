import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  OTTER_TAIL_COUNTY_ADAPTER_KEY,
  OTTER_TAIL_COUNTY_CURRENT_SOURCE_URL,
  createOtterTailCountySourceAdapter,
  type OtterTailPdfPage,
  type OtterTailRosterIdFactory
} from "./otter-tail-county.js";

function context(sourceUrl = OTTER_TAIL_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000701",
    source: {
      id: "00000000-0000-4000-8000-000000000702",
      officialInstitutionId: "00000000-0000-4000-8000-000000000703",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://ottertailcounty.gov/",
      relationshipEvidenceUrl:
        "https://ottertailcounty.gov/public-safety-law/detention/jail-in-custody-list/",
      evidenceDescription: "Synthetic Otter Tail County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: OTTER_TAIL_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-otter-tail-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): OtterTailRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 710;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function adapter(pages: readonly OtterTailPdfPage[]) {
  return createOtterTailCountySourceAdapter({
    fetch: async () =>
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), {
        status: 200,
        headers: { "content-type": "application/pdf" }
      }),
    facilityId: "00000000-0000-4000-8000-000000000704",
    createId: idFactory(),
    extractPdfPages: async () => pages,
    nowMs: () => 1_000
  });
}

// Column positions mirror the official In Custody report.
function header(top: number, withTitle: boolean, printed = "01/01/2000 14:00"): OtterTailPdfPage {
  return [
    ...(withTitle
      ? [
          { text: "Otter Tail County Jail", x: 283, y: top + 92 },
          { text: `In Custody ${printed}`, x: 236, y: top + 57 }
        ]
      : []),
    { text: "Photo", x: 15, y: top },
    { text: "MNI #", x: 84, y: top },
    { text: "Sex", x: 276, y: top },
    { text: "Age", x: 313, y: top },
    { text: "Booking #", x: 335, y: top },
    { text: "Intake_Date", x: 401, y: top },
    { text: "Charges", x: 471, y: top },
    { text: "Bond_Amount", x: 705, y: top - 2 },
    { text: "Name", x: 170, y: top - 2 },
    { text: "Projected Release Date", x: 680, y: top - 15 }
  ];
}

function row(
  y: number,
  name: string,
  bookingNumber: string,
  charges: readonly (readonly [string, string])[]
): OtterTailPdfPage {
  return [
    { text: "900000000001", x: 86, y },
    { text: name, x: 169, y },
    { text: "M", x: 278, y },
    { text: "99", x: 313, y },
    { text: bookingNumber, x: 335, y },
    { text: "01/01/2000", x: 409, y },
    { text: "$999 w/o conditions", x: 672, y: y + 1 },
    ...charges.flatMap(([chargeHeader, description], index) => [
      { text: chargeHeader, x: 470, y: y + 1 - index * 31 },
      { text: description, x: 470, y: y - 12 - index * 31 }
    ])
  ];
}

const firstPage: OtterTailPdfPage = [
  ...header(483, true),
  ...row(450, "Tester, Alpha", "000000000001", [
    ["F - Active 999.11(1)", "Synthetic Offense Alpha"],
    ["GM - Sentenced 999.22.1(a)~1", "Synthetic Offense Beta"],
    ["GM - RPR/Chg Dismiss 999.24.5", "Synthetic Offense Epsilon"]
  ]),
  ...row(294, "Tester, Beta", "000000000002", [["M - Active 999.33", "Synthetic Offense Gamma"]]),
  { text: "Page 1 of 2", x: 287, y: 16 }
];
const lastPage: OtterTailPdfPage = [
  ...header(588, false),
  ...row(555, "Tester, Gamma", "000000000003", [["F - Active 999.44", "Synthetic Offense Delta"]]),
  { text: "Page 2 of 2", x: 285, y: 16 }
];

describe("Otter Tail County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(OTTER_TAIL_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every row with its booking number and statute-coded charges", async () => {
    const result = await runSourceAdapter(adapter([firstPage, lastPage]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(3);
    const [alpha, beta, gamma] = result.snapshot.bookings;
    expect(alpha?.bookingIdentifier?.value).toBe("000000000001");
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      ["999.11(1)", "Synthetic Offense Alpha"],
      ["999.22.1(a)~1", "Synthetic Offense Beta"],
      ["999.24.5", "Synthetic Offense Epsilon"]
    ]);
    expect(beta?.person.displayName).toBe("Tester, Beta");
    expect(gamma?.charges).toHaveLength(1);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["900000000001", "$999", "01/01/2000"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when a page of the list is missing", async () => {
    const result = await runSourceAdapter(adapter([firstPage]), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("OTTER_TAIL_COUNTY_PAGE_SEQUENCE_MISMATCH");
  });

  it("fails closed when a row continues across a page break", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, [...lastPage, { text: "orphaned charge line", x: 470, y: 565 }]]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("OTTER_TAIL_COUNTY_RECORD_SPLIT_ACROSS_PAGES");
  });

  it("fails closed when a row has no booking number", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage.filter((item) => item.text !== "000000000003")]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("OTTER_TAIL_COUNTY_RECORD_BOUNDARY_MISMATCH");
  });

  it("fails closed when a booking number repeats or a charge has no description", async () => {
    const duplicate = await runSourceAdapter(
      adapter([
        firstPage,
        lastPage.map((item) =>
          item.text === "000000000003" ? { ...item, text: "000000000001" } : item
        )
      ]),
      context()
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.failure.diagnosticCode).toBe("OTTER_TAIL_COUNTY_DUPLICATE_BOOKING_NUMBER");
    }

    const bare = await runSourceAdapter(
      adapter([firstPage, lastPage.filter((item) => item.text !== "Synthetic Offense Delta")]),
      context()
    );
    expect(bare.ok).toBe(false);
    if (!bare.ok) {
      expect(bare.failure.diagnosticCode).toBe("OTTER_TAIL_COUNTY_CHARGE_DESCRIPTION_MISSING");
    }
  });

  it("fails closed when the list has stopped updating", async () => {
    const result = await runSourceAdapter(
      adapter([
        firstPage.map((item) =>
          item.text.startsWith("In Custody ")
            ? { ...item, text: "In Custody 12/01/1999 14:00" }
            : item
        ),
        lastPage
      ]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("OTTER_TAIL_COUNTY_SOURCE_STALE");
  });

  it("refuses a source URL other than the approved list", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage]),
      context("https://web1.co.ottertail.mn.us/sheriff/report/other.pdf")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("OTTER_TAIL_COUNTY_SOURCE_URL_MISMATCH");
  });
});
