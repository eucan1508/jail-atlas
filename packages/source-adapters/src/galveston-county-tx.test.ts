import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  GALVESTON_COUNTY_TX_ADAPTER_KEY,
  GALVESTON_COUNTY_TX_CURRENT_SOURCE_URL,
  createGalvestonCountyTxSourceAdapter,
  parseGalvestonList
} from "./galveston-county-tx.js";
import { sourceAdapterRegistry } from "./registry.js";
import { runSourceAdapter } from "./runner.js";

function row(index: number, overrides: Record<string, string> = {}) {
  return {
    book_id: String(260_000_000 + index),
    disp_name: `TESTER, NUMBER ${index} (W /M/99)`,
    disp_charge: "SYNTHETIC OFFENSE",
    dob: "1/1/2000 12:00:00 AM",
    age: "99",
    ...overrides
  };
}

function list(rows: readonly unknown[], records = rows.length) {
  return { total: "1", page: "1", records: String(records), rows };
}

const rows = Array.from({ length: 200 }, (_, index) => row(index));

function context(): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000301",
    source: {
      id: "00000000-0000-4000-8000-000000000302",
      officialInstitutionId: "00000000-0000-4000-8000-000000000303",
      sourceUrl: GALVESTON_COUNTY_TX_CURRENT_SOURCE_URL,
      sourceType: "official_sheriff",
      officialInstitutionUrl: "https://official.example.test/galveston/",
      relationshipEvidenceUrl: "https://official.example.test/galveston/jail/",
      evidenceDescription: "Synthetic Galveston County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: GALVESTON_COUNTY_TX_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-galveston-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

describe("Galveston County inmate inquiry adapter", () => {
  it("is not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(GALVESTON_COUNTY_TX_ADAPTER_KEY)).toBe(false);
  });

  it("asks for every row and keeps the name, booking number, and primary charge", async () => {
    const requests: { url: string; body: string }[] = [];
    const result = await runSourceAdapter(
      createGalvestonCountyTxSourceAdapter({
        fetch: async (input, init) => {
          requests.push({ url: input, body: String(init?.body) });
          return new Response(JSON.stringify(list(rows)));
        },
        facilityId: "00000000-0000-4000-8000-000000000304",
        createId: () => crypto.randomUUID()
      }),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(requests[0]?.url).toBe("https://p2c.galvestoncountytx.gov/jqHandler.ashx?op=s");
    expect(requests[0]?.body).toContain("rows=10000");
    const [first] = result.snapshot.bookings;
    expect(first?.person.displayName).toBe("TESTER, NUMBER 0");
    expect(first?.bookingIdentifier?.value).toBe("260000000");
    expect(first?.charges.map((charge) => [charge.description, charge.sourceLabel])).toEqual([
      ["SYNTHETIC OFFENSE", "Primary charge"]
    ]);
    expect(JSON.stringify(result.snapshot)).not.toContain("1/1/2000");
  });

  it("fails closed on a partial, duplicated, or near-empty list", () => {
    expect(() => parseGalvestonList(list(rows, 201))).toThrow("LIST_INCOMPLETE");
    expect(() => parseGalvestonList(list([...rows, row(0)]))).toThrow("DUPLICATE_BOOKING_NUMBER");
    expect(() =>
      parseGalvestonList(list([...rows.slice(1), row(1, { disp_charge: " " })]))
    ).toThrow();
    expect(() => parseGalvestonList(list(rows.slice(0, 20)))).toThrow();
  });
});
