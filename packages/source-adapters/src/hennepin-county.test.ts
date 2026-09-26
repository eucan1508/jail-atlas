import { syntheticId } from "@jail-atlas/test-fixtures";
import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  createHennepinCountySourceAdapter,
  HENNEPIN_COUNTY_ADAPTER_KEY,
  HENNEPIN_COUNTY_API_URL,
  HENNEPIN_COUNTY_CURRENT_SOURCE_URL
} from "./hennepin-county.js";
import { runSourceAdapter } from "./runner.js";

function context(): AdapterContext {
  return {
    runId: syntheticId(10_001),
    source: {
      id: syntheticId(10_002),
      officialInstitutionId: syntheticId(10_003),
      sourceUrl: HENNEPIN_COUNTY_CURRENT_SOURCE_URL,
      sourceType: "officially_linked_vendor",
      officialInstitutionUrl: "https://www.hennepinsheriff.org/jail-warrants/jail",
      relationshipEvidenceUrl: "https://www.hennepinsheriff.org/jail-warrants/jail-roster",
      evidenceDescription: "Synthetic Hennepin source contract for tests only.",
      verifiedAt: "2000-01-01T00:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: HENNEPIN_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T00:00:00.000Z",
    traceId: "synthetic-hennepin-test",
    signal: new AbortController().signal,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function adapter(body: unknown) {
  return createHennepinCountySourceAdapter({
    subscriptionKey: "synthetic-subscription-key",
    facilityId: syntheticId(10_004),
    createId: (() => {
      let sequence = 10_100;
      return () => syntheticId(sequence++);
    })(),
    fetch: async (input, init) => {
      expect(input).toBe(HENNEPIN_COUNTY_API_URL);
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("Ocp-Apim-Subscription-Key")).toBe(
        "synthetic-subscription-key"
      );
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
}

describe("Hennepin County roster adapter", () => {
  it("keeps only current custody records and drops bond/released fields", async () => {
    const result = await runSourceAdapter(
      adapter({
        data: [
          {
            incarcerationId: 1,
            bookingNumber: "20260001",
            fullName: "SYNTHETIC HENNEPIN — TEST ONLY",
            custodyStatus: 1,
            custodyStatusDisplay: "Currently in Jail/Custody",
            arrestedBy: "TEST AGENCY",
            receivedDateTime: "2026-09-25T12:00:00",
            releasedDateTime: null
          }
        ],
        pagination: { totalRecords: 1 }
      }),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(1);
    expect(result.snapshot.bookings[0]?.bookingIdentifier?.value).toBe("20260001");
    expect(result.snapshot.bookings[0]?.bondEntries).toEqual([]);
    expect(result.snapshot.bookings[0]?.charges).toEqual([]);
    expect(JSON.stringify(result.snapshot)).not.toContain("TEST AGENCY");
  });

  it("accepts an explicitly empty current-custody response", async () => {
    const result = await runSourceAdapter(
      adapter({ data: [], pagination: { totalRecords: 0 } }),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(0);
    expect(result.snapshot.validEmptyResult).toBe(true);
  });
});
