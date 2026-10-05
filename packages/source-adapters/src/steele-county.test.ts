import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  STEELE_COUNTY_ADAPTER_KEY,
  STEELE_COUNTY_CURRENT_SOURCE_URL,
  createSteeleCountySourceAdapter,
  type SteelePdfPage,
  type SteeleRosterIdFactory
} from "./steele-county.js";

function context(sourceUrl = STEELE_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000141",
    source: {
      id: "00000000-0000-4000-8000-000000000142",
      officialInstitutionId: "00000000-0000-4000-8000-000000000143",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://steelecountymn.gov/departments/detention_center/index.php",
      relationshipEvidenceUrl: "https://steelecountymn.gov/departments/detention_center/index.php",
      evidenceDescription: "Synthetic Steele County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: STEELE_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-steele-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): SteeleRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 150;
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

function adapter(pages: readonly SteelePdfPage[]) {
  return createSteeleCountySourceAdapter({
    fetch: async () => pdfResponse(),
    facilityId: "00000000-0000-4000-8000-000000000144",
    createId: idFactory(),
    extractPdfPages: async () => pages,
    nowMs: () => 1_000
  });
}

// Column positions mirror the official Inmate Roster report.
function header(top: number, withTitle: boolean): SteelePdfPage {
  return [
    ...(withTitle
      ? [
          { text: "Steele County Sheriff's Office", x: 49, y: top + 42 },
          { text: "Inmate Roster", x: 49, y: top + 27 },
          { text: "Printed on January 1, 2000", x: 611, y: top + 27 }
        ]
      : []),
    { text: "Inmate", x: 181, y: top },
    { text: "Booked", x: 307, y: top },
    { text: "Agency", x: 367, y: top },
    { text: "Hold Reasons", x: 457, y: top },
    { text: "Charges", x: 553, y: top }
  ];
}

function row(
  y: number,
  nameLines: readonly string[],
  chargeLines: readonly string[]
): SteelePdfPage {
  return [
    ...nameLines.map((text, index) => ({ text, x: 181, y: y - index * 9 })),
    { text: "01/01/00", x: 307, y },
    { text: "Synthetic Agency", x: 367, y },
    { text: "Warrant Arrest: Synthetic", x: 457, y },
    ...chargeLines.map((text, index) => ({ text, x: 553, y: y - index * 9 }))
  ];
}

const firstPage: SteelePdfPage = [
  ...header(505, true),
  ...row(
    467,
    ["TESTER, ALPHA"],
    ["999-11 - Synthetic Offense Alpha -", "continued detail", "999-22 - Synthetic Offense Beta"]
  ),
  ...row(323, ["TESTER, BETA LONG", "NAME"], []),
  { text: "Page 1 of 2", x: 686, y: 39 }
];
const lastPage: SteelePdfPage = [
  ...header(558, false),
  ...row(520, ["TESTER, GAMMA"], ["Probation Violation - Synthetic"]),
  { text: "Total Records: 3", x: 49, y: 389 },
  { text: "Page 2 of 2", x: 686, y: 39 }
];

describe("Steele County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(STEELE_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every row, joins wrapped names, and splits charges at dash statutes", async () => {
    const result = await runSourceAdapter(adapter([firstPage, lastPage]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(3);
    const [alpha, beta, gamma] = result.snapshot.bookings;
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      ["999-11", "999-11 - Synthetic Offense Alpha - continued detail"],
      ["999-22", "999-22 - Synthetic Offense Beta"]
    ]);
    expect(beta?.person.displayName).toBe("TESTER, BETA LONG NAME");
    expect(beta?.charges).toEqual([]);
    expect(gamma?.charges.map((charge) => charge.description)).toEqual([
      "Probation Violation - Synthetic"
    ]);
    expect(alpha?.bookingIdentifier).toBeNull();
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["Synthetic Agency", "Warrant Arrest", "01/01/00"]) {
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
    expect(result.failure.diagnosticCode).toBe("STEELE_COUNTY_RECORD_COUNT_MISMATCH");
  });

  it("fails closed when a row continues across a page break", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, [...lastPage, { text: "orphaned charge line", x: 553, y: 540 }]]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("STEELE_COUNTY_RECORD_SPLIT_ACROSS_PAGES");
  });

  it("fails closed when the PDF is not the Steele County roster", async () => {
    const result = await runSourceAdapter(
      adapter([
        firstPage.filter((item) => item.text !== "Steele County Sheriff's Office"),
        lastPage
      ]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("STEELE_COUNTY_SOURCE_IDENTITY_MISMATCH");
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage]),
      context("https://steelecountymn.gov/Sheriff/Other.pdf")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("STEELE_COUNTY_SOURCE_URL_MISMATCH");
  });
});
