import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  CLEARWATER_COUNTY_ADAPTER_KEY,
  CLEARWATER_COUNTY_CURRENT_SOURCE_URL,
  createClearwaterCountySourceAdapter,
  parseClearwaterCharges,
  type ClearwaterRosterIdFactory
} from "./clearwater-county-mn.js";

type SyntheticInmate = Readonly<{ number: string; name: string; charges: string | null }>;

const inmates: readonly SyntheticInmate[] = [
  {
    number: "CRIN200000001",
    name: "TESTER, ALPHA",
    charges:
      "000.00.1 - Synthetic Offense Alpha\n000.00.2(a) - Synthetic Offense Beta - Arrest of Adult"
  },
  { number: "CRIN200000002", name: "TESTER, BETA", charges: "" }
];

const REQUESTED_AT = "2000-01-02T18:00:00.000Z";

function context(sourceUrl = CLEARWATER_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000501",
    source: {
      id: "00000000-0000-4000-8000-000000000502",
      officialInstitutionId: "00000000-0000-4000-8000-000000000503",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://clearwatercountymn.gov/sheriff",
      relationshipEvidenceUrl: "https://clearwatercountymn.gov/inmate-list",
      evidenceDescription: "Synthetic Clearwater County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: CLEARWATER_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: REQUESTED_AT,
    traceId: "synthetic-clearwater-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): ClearwaterRosterIdFactory {
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

function adapter(
  roster: readonly SyntheticInmate[],
  lastModified: string | null = "Sun, 02 Jan 2000 17:00:00 GMT"
) {
  const requested: string[] = [];
  const source = createClearwaterCountySourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      return new Response(
        JSON.stringify({
          data: roster.map((inmate) => ({
            Last_First_Name: inmate.name,
            Age: "99",
            Inmate_number: inmate.number,
            Sex: "Synthetic",
            Charges_for_All_Hold_Reasons_New_Lines: inmate.charges,
            Booking_Date_Time: "01/01/00 08:00"
          }))
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            ...(lastModified ? { "last-modified": lastModified } : {})
          }
        }
      );
    },
    facilityId: "00000000-0000-4000-8000-000000000504",
    createId: idFactory()
  });
  return { source, requested };
}

describe("Clearwater County, Minnesota source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(CLEARWATER_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads names and statute-led charges, and keeps no age, sex, or inmate number", async () => {
    const { source, requested } = adapter(inmates);
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(requested).toEqual([CLEARWATER_COUNTY_CURRENT_SOURCE_URL]);
    expect(result.snapshot.recordCount).toBe(2);
    expect(result.snapshot.sourceLastUpdatedAt).toBe("2000-01-02T17:00:00.000Z");
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("TESTER, ALPHA");
    expect(alpha?.bookingIdentifier).toBeNull();
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      ["000.00.1", "Synthetic Offense Alpha"],
      ["000.00.2(a)", "Synthetic Offense Beta - Arrest of Adult"]
    ]);
    expect(beta?.charges).toEqual([]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["CRIN200000001", 'Synthetic"', "01/01/00"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the file has stopped updating or carries no update time", async () => {
    const stale = await runSourceAdapter(
      adapter(inmates, "Fri, 31 Dec 1999 00:00:00 GMT").source,
      context()
    );
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.failure.diagnosticCode).toBe("CLEARWATER_COUNTY_SOURCE_STALE");

    const undated = await runSourceAdapter(adapter(inmates, null).source, context());
    expect(undated.ok).toBe(false);
    if (!undated.ok) {
      expect(undated.failure.diagnosticCode).toBe("CLEARWATER_COUNTY_LAST_MODIFIED_MISSING");
    }
  });

  it("fails closed on an empty roster or a number listed twice", async () => {
    const empty = await runSourceAdapter(adapter([]).source, context());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.failure.diagnosticCode).toBe("CLEARWATER_COUNTY_ROSTER_EMPTY");

    const twice = await runSourceAdapter(
      adapter([inmates[0]!, { ...inmates[1]!, number: inmates[0]!.number }]).source,
      context()
    );
    expect(twice.ok).toBe(false);
    if (!twice.ok) {
      expect(twice.failure.diagnosticCode).toBe("CLEARWATER_COUNTY_DUPLICATE_INMATE_NUMBER");
    }
  });

  it("refuses a source URL other than the approved inmate list", async () => {
    const result = await runSourceAdapter(
      adapter(inmates).source,
      context("https://map.co.clearwater.mn.us/inmate-list/inmate-data/other.json")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CLEARWATER_COUNTY_SOURCE_URL_MISMATCH");
  });

  it("splits charges at line breaks and keeps a line without a statute whole", () => {
    expect(parseClearwaterCharges(null)).toEqual([]);
    expect(parseClearwaterCharges(" \n")).toEqual([]);
    expect(parseClearwaterCharges("SYNTHETIC HOLD\r\n000.1 - Synthetic Offense")).toEqual([
      { statuteCode: null, description: "SYNTHETIC HOLD" },
      { statuteCode: "000.1", description: "Synthetic Offense" }
    ]);
  });
});
