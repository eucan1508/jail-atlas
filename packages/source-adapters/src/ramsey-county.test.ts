import { describe, expect, it } from "vitest";

import {
  createRamseyCountySourceAdapter,
  RAMSEY_COUNTY_CURRENT_SOURCE_URL
} from "./ramsey-county.js";
import type { AdapterContext } from "./contracts.js";

const context: AdapterContext = {
  runId: "00000000-0000-4000-8000-000000000001",
  source: {
    id: "00000000-0000-4000-8000-000000000002",
    officialInstitutionId: "00000000-0000-4000-8000-000000000003",
    sourceUrl: RAMSEY_COUNTY_CURRENT_SOURCE_URL,
    sourceType: "official_county",
    officialInstitutionUrl: RAMSEY_COUNTY_CURRENT_SOURCE_URL,
    relationshipEvidenceUrl: RAMSEY_COUNTY_CURRENT_SOURCE_URL,
    evidenceDescription: "Synthetic Ramsey source contract for tests only.",
    verifiedAt: null,
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastError: null,
    parserVersion: "1.0.0",
    sourceStatus: "verification_pending",
    custodyDataScope: ["current_custody"],
    retentionScope: { kind: "current_only", description: "Synthetic test scope" },
    adapterKey: "ramsey-county-mn-current-roster",
    publicationApproved: false
  },
  requestedAt: "2026-09-26T00:00:00.000Z",
  traceId: "trace-ramsey-test",
  signal: new AbortController().signal,
  logger: { debug() {}, info() {}, warn() {}, error() {} }
};

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("Ramsey County roster adapter", () => {
  it("fetches current bookings from the public datasets and preserves labelled charges", async () => {
    const urls: string[] = [];
    const adapter = createRamseyCountySourceAdapter({
      facilityId: "00000000-0000-4000-8000-000000000004",
      createId: (() => {
        let sequence = 10;
        return () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
      })(),
      fetch: async (input) => {
        urls.push(input);
        if (input.includes("rmrn-stdv")) {
          expect(input).toContain("date_released+IS+NULL");
          return response([
            {
              person_id: "person-1",
              booking_no: "B-1",
              date_booked: "2026-09-25T10:00:00.000",
              name: "Doe, Jane"
            }
          ]);
        }
        if (input.includes("9xpb-vsb7")) {
          return response([
            {
              booking_no: "B-1",
              charge_id: "A-1",
              arrest_charge: "Arrest charge",
              arrest_charge_level: "Gross misdemeanor"
            }
          ]);
        }
        return response([
          {
            booking_no: "B-1",
            charge_id: "F-1",
            formal_charge: "Formal charge",
            formal_charge_level: "Felony"
          }
        ]);
      }
    });

    const fetched = await adapter.fetch(context);
    expect(fetched.ok).toBe(true);
    if (!fetched.ok) return;
    expect(urls).toHaveLength(3);
    const validated = await adapter.validate(fetched.value, context);
    const parsed = await adapter.parse(validated.ok ? validated.value : fetched.value, context);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const emptyResult = await adapter.interpretEmptyResult(parsed.value, context);
    const normalized = await adapter.normalize(parsed.value, emptyResult, context);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.value.recordCount).toBe(1);
    expect(normalized.value.bookings[0]?.charges.map((charge) => charge.description)).toEqual([
      "Arrest charge",
      "Formal charge"
    ]);
    expect(normalized.value.bookings[0]?.bondEntries).toEqual([]);
  });
});
