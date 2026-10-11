import { describe, expect, it } from "vitest";

import {
  createStearnsCountySourceAdapter,
  STEARNS_COUNTY_CURRENT_SOURCE_URL,
  type StearnsRosterFetch
} from "./stearns-county.js";
import type { AdapterContext } from "./contracts.js";

const context: AdapterContext = {
  runId: "00000000-0000-4000-8000-000000000011",
  source: {
    id: "00000000-0000-4000-8000-000000000012",
    officialInstitutionId: "00000000-0000-4000-8000-000000000013",
    sourceUrl: STEARNS_COUNTY_CURRENT_SOURCE_URL,
    sourceType: "official_county",
    officialInstitutionUrl: "https://www.stearnscountymn.gov/stearns-county-jail",
    relationshipEvidenceUrl: "https://www.stearnscountymn.gov/inmate-warrant-searches",
    evidenceDescription: "Synthetic Stearns source contract for tests only.",
    verifiedAt: null,
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastError: null,
    parserVersion: "1.0.0",
    sourceStatus: "verification_pending",
    custodyDataScope: ["current_custody"],
    retentionScope: { kind: "current_only", description: "Synthetic test scope" },
    adapterKey: "stearns-county-mn-current-roster",
    publicationApproved: false
  },
  requestedAt: "2026-09-26T00:00:00.000Z",
  traceId: "trace-stearns-test",
  signal: new AbortController().signal,
  logger: { debug() {}, info() {}, warn() {}, error() {} }
};

function response(html: string): Response {
  return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
}

function page(pageNumber: number, lastPage = 2): string {
  return `<!doctype html>
    <html><head><title>Stearns County Current Inmates</title></head>
    <body><h1>Stearns County Current Inmates</h1>
      <table><tbody>
        <tr><td><a href="/InmateDetail/Index/1?booking=${pageNumber}01&origin=current">DOE</a></td><td>JANE</td><td>Female</td><td>30</td><td>09/25/2026</td><td>White</td></tr>
        <tr><td><a href="/InmateDetail/Index/1?booking=${pageNumber}01&origin=current">DOE, JANE</a></td><td>JANE</td><td>Female</td><td>30</td><td>09/25/2026</td><td>White</td></tr>
      </tbody></table>
      ${Array.from({ length: lastPage }, (_, index) => `<a href="/Current?page=${index + 1}">${index + 1}</a>`).join("")}
      <p>Data last updated on 09/25/2026 08:00 PM.</p>
    </body></html>`;
}

function adapter(fetch: StearnsRosterFetch) {
  return createStearnsCountySourceAdapter({
    fetch,
    facilityId: "00000000-0000-4000-8000-000000000014",
    createId: (() => {
      let sequence = 20;
      return () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    })()
  });
}

describe("Stearns County roster adapter", () => {
  it("fetches every official roster page and normalizes booking identifiers", async () => {
    const urls: string[] = [];
    const result = await adapter(async (input) => {
      urls.push(input);
      const pageNumber = new URL(input).searchParams.get("page") ?? "1";
      return response(page(Number(pageNumber)));
    }).fetch(context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(urls).toHaveLength(2);
    const parsed = await adapter(async (input) =>
      response(page(Number(new URL(input).searchParams.get("page") ?? "1")))
    ).parse(result.value, context);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const empty = await adapter(async () => response(page(1))).interpretEmptyResult(
      parsed.value,
      context
    );
    const normalized = await adapter(async () => response(page(1))).normalize(
      parsed.value,
      empty,
      context
    );
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.value.recordCount).toBe(2);
    expect(normalized.value.bookings.map((booking) => booking.bookingIdentifier?.value)).toEqual([
      "101",
      "201"
    ]);
    expect(normalized.value.bookings[0]?.bondEntries).toEqual([]);
  });

  it("requests the roster in booking order", async () => {
    const urls: string[] = [];
    await adapter(async (input) => {
      urls.push(input);
      return response(page(Number(new URL(input).searchParams.get("page") ?? "1")));
    }).fetch(context);
    expect(urls.map((url) => new URL(url).searchParams.get("sortOrder"))).toEqual([
      "booking_desc",
      "booking_desc"
    ]);
  });

  it("reads the roster again when a booking repeats across pages", async () => {
    let crawl = 0;
    const result = await adapter(async (input) => {
      const pageNumber = Number(new URL(input).searchParams.get("page") ?? "1");
      if (pageNumber === 1) crawl += 1;
      // On the first crawl, page 2 repeats page 1's booking, as a shifted roster does.
      return response(page(crawl === 1 ? 1 : pageNumber));
    }).fetch(context);
    expect(crawl).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("fails closed when every crawl repeats a booking", async () => {
    let crawl = 0;
    const result = await adapter(async (input) => {
      if (new URL(input).searchParams.get("page") === "1") crawl += 1;
      return response(page(1));
    }).fetch(context);
    expect(crawl).toBe(3);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("DUPLICATE_BOOKING_NUMBER");
  });

  it("rejects a non-Stearns source document", async () => {
    const result = await adapter(async () =>
      response("<html><title>Other county</title></html>")
    ).fetch(context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("SOURCE_IDENTITY_MISMATCH");
  });
});
