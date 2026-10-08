import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  CERRO_GORDO_COUNTY_ADAPTER_KEY,
  CERRO_GORDO_COUNTY_CURRENT_SOURCE_URL,
  createCerroGordoCountySourceAdapter,
  type CerroGordoPdfPage,
  type CerroGordoRosterIdFactory
} from "./cerro-gordo-county.js";

function context(sourceUrl = CERRO_GORDO_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000201",
    source: {
      id: "00000000-0000-4000-8000-000000000202",
      officialInstitutionId: "00000000-0000-4000-8000-000000000203",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://cerrogordo.gov/sheriff/jail/",
      relationshipEvidenceUrl: "https://cerrogordo.gov/sheriff/jail/",
      evidenceDescription: "Synthetic Cerro Gordo County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: CERRO_GORDO_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-cerro-gordo-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): CerroGordoRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 210;
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

function adapter(pages: readonly CerroGordoPdfPage[]) {
  return createCerroGordoCountySourceAdapter({
    fetch: async () => pdfResponse(),
    facilityId: "00000000-0000-4000-8000-000000000204",
    createId: idFactory(),
    extractPdfPages: async () => pages,
    nowMs: () => 1_000
  });
}

// Column positions mirror the official Online Population Report.
function header(top: number, withTitle: boolean, printed = "January 1, 2000"): CerroGordoPdfPage {
  return [
    ...(withTitle
      ? [
          { text: "CGSO Jail - Online Population Report", x: 49, y: top + 27 },
          { text: `Printed on ${printed}`, x: 611, y: top + 27 }
        ]
      : []),
    { text: "Mugshot", x: 49, y: top },
    { text: "Name", x: 121, y: top },
    { text: "Age", x: 211, y: top },
    { text: "Sex", x: 247, y: top },
    { text: "Booking Date:", x: 283, y: top },
    { text: "Housed At:", x: 355, y: top },
    { text: "Jail ID", x: 415, y: top },
    { text: "Charges:", x: 475, y: top },
    { text: "Bond", x: 643, y: top }
  ];
}

function row(
  y: number,
  nameLines: readonly string[],
  chargeLines: readonly string[],
  options: { mergedSex?: boolean } = {}
): CerroGordoPdfPage {
  return [
    ...nameLines.map((text, index) => ({ text, x: 121, y: y - index * 9 })),
    { text: "99", x: 237, y },
    ...(options.mergedSex
      ? [{ text: "Female 01/01/00 08:00", x: 253, y }]
      : [
          { text: "Male", x: 253, y },
          { text: "01/01/00 08:00", x: 283, y }
        ]),
    { text: "SYNTH-CELL 999999", x: 355, y },
    ...chargeLines.map((text, index) => ({ text, x: 469, y: y - index * 9 })),
    { text: "Cash Only - $1.00", x: 637, y }
  ];
}

const firstPage: CerroGordoPdfPage = [
  ...header(463, true),
  ...row(
    443,
    ["Tester, Alpha"],
    ["999.11(1)(b) - Synthetic Offense Alpha, $0", "Injury/Dam", "999.22 - Synthetic Offense Beta"]
  ),
  ...row(359, ["Tester, Beta Long", "Name"], ["999.33A(4) - Synthetic Offense Gamma"], {
    mergedSex: true
  }),
  { text: "Page 1 of 2", x: 686, y: 39 }
];
const lastPage: CerroGordoPdfPage = [
  ...header(558, false),
  ...row(538, ["Tester, Gamma"], ["999.44 - Synthetic Offense Delta"]),
  { text: "Total Records: 3", x: 49, y: 389 },
  { text: "Page 2 of 2", x: 686, y: 39 }
];

describe("Cerro Gordo County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(CERRO_GORDO_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every row, joins wrapped names and charges, and keeps Iowa Code citations", async () => {
    const result = await runSourceAdapter(adapter([firstPage, lastPage]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(3);
    const [alpha, beta, gamma] = result.snapshot.bookings;
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      ["999.11(1)(b)", "999.11(1)(b) - Synthetic Offense Alpha, $0 Injury/Dam"],
      ["999.22", "999.22 - Synthetic Offense Beta"]
    ]);
    expect(beta?.person.displayName).toBe("Tester, Beta Long Name");
    expect(beta?.charges.map((charge) => charge.statuteCode)).toEqual(["999.33A(4)"]);
    expect(gamma?.person.displayName).toBe("Tester, Gamma");
    expect(alpha?.bookingIdentifier).toBeNull();
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["SYNTH-CELL", "999999", "Cash Only", "01/01/00"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when parsed rows do not match the declared total", async () => {
    const result = await runSourceAdapter(
      adapter([
        firstPage,
        lastPage.map((item) =>
          item.text === "Total Records: 3" ? { ...item, text: "Total Records: 4" } : item
        )
      ]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CERRO_GORDO_COUNTY_RECORD_COUNT_MISMATCH");
  });

  it("fails closed when a page of the report is missing", async () => {
    const result = await runSourceAdapter(adapter([lastPage]), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CERRO_GORDO_COUNTY_SOURCE_IDENTITY_MISMATCH");

    const shortened = await runSourceAdapter(
      adapter([
        firstPage.map((item) =>
          item.text === "Page 1 of 2" ? { ...item, text: "Page 1 of 3" } : item
        ),
        lastPage
      ]),
      context()
    );
    expect(shortened.ok).toBe(false);
    if (shortened.ok) return;
    expect(shortened.failure.diagnosticCode).toBe("CERRO_GORDO_COUNTY_PAGE_SEQUENCE_MISMATCH");
  });

  it("fails closed when a row continues across a page break", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, [...lastPage, { text: "orphaned charge line", x: 469, y: 548 }]]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CERRO_GORDO_COUNTY_RECORD_SPLIT_ACROSS_PAGES");
  });

  it("fails closed when the report has stopped updating", async () => {
    const result = await runSourceAdapter(
      adapter([
        firstPage.map((item) =>
          item.text.startsWith("Printed on ")
            ? { ...item, text: "Printed on December 1, 1999" }
            : item
        ),
        lastPage
      ]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CERRO_GORDO_COUNTY_SOURCE_STALE");
  });

  it("refuses a source URL other than the approved report", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage]),
      context("https://sofiles.cerrogordo.gov/other_report/")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CERRO_GORDO_COUNTY_SOURCE_URL_MISMATCH");
  });
});
