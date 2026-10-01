import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  MOWER_COUNTY_ADAPTER_KEY,
  MOWER_COUNTY_CURRENT_SOURCE_URL,
  createMowerCountySourceAdapter,
  type MowerRosterIdFactory,
  type MowerRosterPdfExtractor
} from "./mower-county.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";

function context(sourceUrl = MOWER_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000041",
    source: {
      id: "00000000-0000-4000-8000-000000000042",
      officialInstitutionId: "00000000-0000-4000-8000-000000000043",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://mowercountymn.gov/198/County-Jail",
      relationshipEvidenceUrl: "https://mowercountymn.gov/198/County-Jail",
      evidenceDescription: "Synthetic Mower County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: MOWER_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-mower-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): MowerRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 50;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function adapter(lines: readonly string[]) {
  const extractPdfLines: MowerRosterPdfExtractor = async () => lines;
  return createMowerCountySourceAdapter({
    fetch: async () =>
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), {
        status: 200,
        headers: { "content-type": "application/pdf" }
      }),
    facilityId: "00000000-0000-4000-8000-000000000044",
    createId: idFactory(),
    extractPdfLines,
    nowMs: () => 1_000
  });
}

const fixtureLines = [
  "Mower County Jail",
  "Inmates in Custody",
  "Updated : | 10/1/2026 2:00:08PM",
  "1 | TESTER, ALPHA — TEST ONLY",
  "Booking #: | MCJ-000000000001",
  "Date and Time of Booking : | September 20, 2026 10:58 am",
  "Custody Status : | IN CUSTODY | Bail | $100.00",
  "Charges: | SYNTHETIC CHARGE ALPHA — TEST ONLY",
  "continued fictional detail",
  "Status: | Bond Set",
  "2 | TESTER, RELEASED — TEST ONLY",
  "Booking #: | MCJ-000000000002",
  "Date and Time of Booking : | September 21, 2026 8:00 am",
  "Date and Time of Release : | September 22, 2026 9:00 am",
  "Custody Status : | RELEASED | Bail",
  "Charges: | SYNTHETIC CHARGE BETA — TEST ONLY",
  "Status: | Released"
] as const;

describe("Mower County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(MOWER_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("uses the person name for Name, the booking number separately, and excludes released rows", async () => {
    const result = await runSourceAdapter(adapter(fixtureLines), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(1);
    expect(result.snapshot.bookings[0]?.person.displayName).toBe("TESTER, ALPHA — TEST ONLY");
    expect(result.snapshot.bookings[0]?.bookingIdentifier?.value).toBe("MCJ-000000000001");
    expect(result.snapshot.bookings[0]?.charges[0]?.description).toBe(
      "SYNTHETIC CHARGE ALPHA — TEST ONLY continued fictional detail"
    );
  });

  it("accepts only an explicit zero-inmate marker as valid empty", async () => {
    const result = await runSourceAdapter(
      adapter([
        "Mower County Jail",
        "Inmates in Custody",
        "Updated : | 10/1/2026 2:00:08PM",
        "0 inmates"
      ]),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emptyResult.kind).toBe("valid_empty");
    expect(result.snapshot.recordCount).toBe(0);
  });

  it("fails closed when the PDF identity is not the official Mower roster", async () => {
    const result = await runSourceAdapter(
      adapter(["Other County Jail", "Updated : | 10/1/2026 2:00:08PM", "0 inmates"]),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("SOURCE_IDENTITY_MISMATCH");
  });
});
