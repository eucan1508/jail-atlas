import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  WRIGHT_COUNTY_ADAPTER_KEY,
  WRIGHT_COUNTY_CURRENT_SOURCE_URL,
  createWrightCountySourceAdapter,
  type WrightPdfPage,
  type WrightRosterIdFactory
} from "./wright-county.js";

function context(sourceUrl = WRIGHT_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000061",
    source: {
      id: "00000000-0000-4000-8000-000000000062",
      officialInstitutionId: "00000000-0000-4000-8000-000000000063",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.wrightcountymn.gov/237/Jail",
      relationshipEvidenceUrl: "https://www.wrightcountymn.gov/237/Jail",
      evidenceDescription: "Synthetic Wright County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: WRIGHT_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-wright-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): WrightRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 70;
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

function adapter(pages: readonly WrightPdfPage[]) {
  return createWrightCountySourceAdapter({
    fetch: async () => pdfResponse(),
    facilityId: "00000000-0000-4000-8000-000000000064",
    createId: idFactory(),
    extractPdfPages: async () => pages,
    nowMs: () => 1_000
  });
}

// Column positions mirror the official census layout.
function header(top: number, withTitle: boolean): WrightPdfPage {
  return [
    ...(withTitle
      ? [
          { text: "Web Site Jail Census", x: 49, y: top + 27 },
          { text: "Printed on October 2, 2000", x: 611, y: top + 27 }
        ]
      : []),
    { text: "Photo", x: 55, y: top },
    { text: "Name", x: 133, y: top },
    { text: "Inmate #", x: 235, y: top },
    { text: "Age", x: 295, y: top },
    { text: "Sex", x: 325, y: top },
    { text: "Release", x: 355, y: top },
    { text: "Date", x: 355, y: top - 9 },
    { text: "Held for", x: 409, y: top },
    { text: "Charges", x: 487, y: top }
  ];
}

function row(
  y: number,
  name: string,
  inmateNumber: string,
  chargeLines: readonly string[]
): WrightPdfPage {
  return [
    { text: name, x: 133, y },
    { text: inmateNumber, x: 235, y },
    { text: "99", x: 301, y },
    { text: "Male", x: 319, y },
    { text: "01/01/00", x: 355, y },
    { text: "Synthetic Agency", x: 409, y },
    ...chargeLines.map((text, index) => ({ text, x: 487, y: y - index * 10 }))
  ];
}

const firstPage: WrightPdfPage = [
  ...header(463, true),
  ...row(422, "TESTER, ALPHA — TEST ONLY", "200000001", [
    "999.11.1(a) - Synthetic Offense Alpha - Test Only -",
    "continued fictional detail",
    "999.22 - Synthetic Offense Beta - Test Only"
  ]),
  ...row(377, "TESTER, BETA — TEST ONLY", "200000002", ["Fed Hold - Federal Hold"]),
  { text: "Page 1 of 2", x: 686, y: 39 }
];
const lastPage: WrightPdfPage = [
  ...header(558, false),
  ...row(517, "TESTER, GAMMA — TEST ONLY", "200000003", ["999.33 - Synthetic Offense Gamma"]),
  { text: "Total Records: 3", x: 49, y: 480 },
  { text: "Page 2 of 2", x: 686, y: 39 }
];

describe("Wright County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(WRIGHT_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every census row across pages and splits charges at statute citations", async () => {
    const result = await runSourceAdapter(adapter([firstPage, lastPage]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(3);
    const [alpha, beta, gamma] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("TESTER, ALPHA — TEST ONLY");
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      [
        "999.11.1(a)",
        "999.11.1(a) - Synthetic Offense Alpha - Test Only - continued fictional detail"
      ],
      ["999.22", "999.22 - Synthetic Offense Beta - Test Only"]
    ]);
    expect(beta?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      [null, "Fed Hold - Federal Hold"]
    ]);
    expect(gamma?.person.displayName).toBe("TESTER, GAMMA — TEST ONLY");
  });

  it("keeps the inmate number off the public booking field and drops demographic columns", async () => {
    const result = await runSourceAdapter(adapter([firstPage, lastPage]), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const booking = result.snapshot.bookings[0];
    expect(booking?.bookingIdentifier).toBeNull();
    expect(booking?.bookedAt).toBeNull();
    expect(booking?.releasedAt).toBeNull();
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["Male", "01/01/00", "Synthetic Agency", "200000001"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("identifies JailAtlas when requesting the official PDF", async () => {
    let requestInit: RequestInit | undefined;
    const result = await runSourceAdapter(
      createWrightCountySourceAdapter({
        fetch: async (_input, init) => {
          requestInit = init;
          return pdfResponse();
        },
        facilityId: "00000000-0000-4000-8000-000000000064",
        createId: idFactory(),
        extractPdfPages: async () => [firstPage, lastPage],
        nowMs: () => 1_000
      }),
      context()
    );

    expect(result.ok).toBe(true);
    expect(requestInit?.redirect).toBe("error");
    expect(new Headers(requestInit?.headers).get("user-agent")).toBe(
      "Mozilla/5.0 (compatible; JailAtlas/1.0; +https://jailatlas.com)"
    );
  });

  it("accepts only an explicit zero total as valid empty", async () => {
    const result = await runSourceAdapter(
      adapter([[...header(463, true), { text: "Total Records: 0", x: 49, y: 420 }]]),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emptyResult.kind).toBe("valid_empty");
    expect(result.snapshot.recordCount).toBe(0);
  });

  it("fails closed when parsed rows do not match the declared total", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage.filter((item) => !item.text.startsWith("Total Records"))]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("TOTAL_RECORDS_MISSING");

    const mismatch = await runSourceAdapter(
      adapter([
        firstPage,
        lastPage.map((item) =>
          item.text === "Total Records: 3" ? { ...item, text: "Total Records: 4" } : item
        )
      ]),
      context()
    );
    expect(mismatch.ok).toBe(false);
    if (mismatch.ok) return;
    expect(mismatch.failure.diagnosticCode).toContain("RECORD_COUNT_MISMATCH");
  });

  it("fails closed when a row continues across a page break", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, [...lastPage, { text: "orphaned continuation", x: 487, y: 535 }]]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("RECORD_SPLIT_ACROSS_PAGES");
  });

  it("fails closed when the PDF identity is not the official Wright census", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage.filter((item) => item.text !== "Web Site Jail Census"), lastPage]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("SOURCE_IDENTITY_MISMATCH");
  });

  it("refuses a source URL other than the approved census", async () => {
    const result = await runSourceAdapter(
      adapter([firstPage, lastPage]),
      context("https://www.wrightcountymn.gov/DocumentCenter/View/489")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("SOURCE_URL_MISMATCH");
  });
});
