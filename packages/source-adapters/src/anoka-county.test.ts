import { describe, expect, it } from "vitest";

import {
  ANOKA_COUNTY_CURRENT_SOURCE_URL,
  createAnokaCountySourceAdapter,
  type AnokaRosterFetch
} from "./anoka-county.js";
import type { AdapterContext } from "./contracts.js";

const context: AdapterContext = {
  runId: "00000000-0000-4000-8000-000000000021",
  source: {
    id: "00000000-0000-4000-8000-000000000022",
    officialInstitutionId: "00000000-0000-4000-8000-000000000023",
    sourceUrl: ANOKA_COUNTY_CURRENT_SOURCE_URL,
    sourceType: "official_county",
    officialInstitutionUrl: "https://www.anokacountymn.gov/727/Inmate-Locator",
    relationshipEvidenceUrl: "https://www.anokacountymn.gov/727/Inmate-Locator",
    evidenceDescription: "Synthetic Anoka source contract for tests only.",
    verifiedAt: null,
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastError: null,
    parserVersion: "1.0.0",
    sourceStatus: "verification_pending",
    custodyDataScope: ["current_custody"],
    retentionScope: { kind: "current_only", description: "Synthetic test scope" },
    adapterKey: "anoka-county-mn-current-roster",
    publicationApproved: false
  },
  requestedAt: "2026-09-26T00:00:00.000Z",
  traceId: "trace-anoka-test",
  signal: new AbortController().signal,
  logger: { debug() {}, info() {}, warn() {}, error() {} }
};

function response(payload: unknown): Response {
  return new Response(`anokaInmates(${JSON.stringify(payload)});`, {
    status: 200,
    headers: { "content-type": "application/javascript" }
  });
}

function adapter(fetch: AnokaRosterFetch) {
  return createAnokaCountySourceAdapter({
    fetch,
    facilityId: "00000000-0000-4000-8000-000000000024",
    createId: (() => {
      let sequence = 30;
      return () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    })()
  });
}

describe("Anoka County roster adapter", () => {
  it("keeps only current inmates and normalizes booking identifiers", async () => {
    const result = await adapter(async () =>
      response({
        LastUpdate: "09/26/2026 01:00 PM",
        inmates: [
          ["DOE", "JANE", "Q", "A-100", "True", "x", "y"],
          ["RELEASED", "PAT", "", "A-101", "False", "x", "y"],
          ["DOE", "JANE", "Q", "A-100", "True", "x", "y"]
        ]
      })
    ).fetch(context);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = await adapter(async () => response(result.value)).parse(result.value, context);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const empty = await adapter(async () => response(result.value)).interpretEmptyResult(
      parsed.value,
      context
    );
    const normalized = await adapter(async () => response(result.value)).normalize(
      parsed.value,
      empty,
      context
    );
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.value.recordCount).toBe(1);
    expect(normalized.value.bookings[0]?.bookingIdentifier?.value).toBe("A-100");
    expect(normalized.value.bookings[0]?.person.displayName).toBe("DOE, JANE Q");
  });

  it("rejects an unexpected JSONP callback", async () => {
    const result = await adapter(
      async () =>
        new Response(`otherCallback(${JSON.stringify({ LastUpdate: "now", inmates: [] })});`, {
          status: 200
        })
    ).fetch(context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("INVALID_JSONP_CALLBACK");
  });
});
