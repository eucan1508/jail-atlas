import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  WAGONER_COUNTY_ADAPTER_KEY,
  WAGONER_COUNTY_CURRENT_SOURCE_URL,
  createWagonerCountySourceAdapter,
  parseWagonerCharges,
  type WagonerRosterIdFactory
} from "./wagoner-county.js";

const API = "https://www.wagonercountyso.org/dmxConnect/api/Booking/";

type SyntheticInmate = Readonly<{
  id: string;
  last: string;
  first: string;
  charges: string | null;
}>;

const inmates: readonly SyntheticInmate[] = [
  { id: "9000000001", last: "TESTER", first: "ALPHA", charges: "<li>SYNTHETIC OFFENSE ALPHA</li>" },
  {
    id: "9000000002",
    last: "tester",
    first: "beta",
    charges: "<li>Synthetic Offense Beta</li><li>SYNTHETIC &amp; OFFENSE GAMMA</li>"
  }
];

function context(sourceUrl = WAGONER_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000301",
    source: {
      id: "00000000-0000-4000-8000-000000000302",
      officialInstitutionId: "00000000-0000-4000-8000-000000000303",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.wagonercountyso.org/jail",
      relationshipEvidenceUrl: "https://www.wagonercountyso.org/inmate-search",
      evidenceDescription: "Synthetic Wagoner County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: WAGONER_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-wagoner-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): WagonerRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 310;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function adapter(
  roster: readonly SyntheticInmate[],
  overrides: {
    total?: number;
    idList?: readonly string[];
    detail?: (inmate: SyntheticInmate) => unknown;
  } = {}
) {
  const requested: string[] = [];
  const source = createWagonerCountySourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      const url = new URL(input);
      if (url.pathname.endsWith("/Read.php")) {
        return json({
          bookings: {
            offset: 0,
            limit: 200,
            total: overrides.total ?? roster.length,
            data: roster.map((inmate) => ({
              BookingID: inmate.id,
              LName: inmate.last,
              FName: inmate.first,
              BookingDate: "2000-01-01 08:00:00",
              Pic: inmate.id
            }))
          }
        });
      }
      if (url.pathname.endsWith("/Read2.php")) {
        return json({
          query: (overrides.idList ?? roster.map((inmate) => inmate.id)).map((id) => ({
            BookingID: id
          }))
        });
      }
      const inmate = roster.find((item) => item.id === url.searchParams.get("bookingid"));
      if (!inmate) return json({ queryInmate: null });
      return json(
        overrides.detail?.(inmate) ?? {
          queryInmate: {
            BookingID: inmate.id,
            LName: inmate.last,
            FName: inmate.first,
            DOB: "1900-01-01",
            Address: "SYNTHETIC STREET",
            Charges: inmate.charges,
            Bond: "999"
          }
        }
      );
    },
    facilityId: "00000000-0000-4000-8000-000000000304",
    createId: idFactory()
  });
  return { source, requested };
}

describe("Wagoner County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(WAGONER_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every booking, its ID, and its charges, and keeps no personal details", async () => {
    const { source, requested } = adapter(inmates);
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(requested).toEqual([
      `${API}Read.php?limit=200&offset=0`,
      `${API}Read2.php`,
      `${API}getBookie.php?bookingid=9000000001`,
      `${API}getBookie.php?bookingid=9000000002`
    ]);
    expect(result.snapshot.recordCount).toBe(2);
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("TESTER, ALPHA");
    expect(alpha?.bookingIdentifier?.value).toBe("9000000001");
    expect(beta?.charges.map((charge) => charge.description)).toEqual([
      "Synthetic Offense Beta",
      "SYNTHETIC & OFFENSE GAMMA"
    ]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["1900-01-01", "SYNTHETIC STREET", "999"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the list total and its rows disagree", async () => {
    const result = await runSourceAdapter(adapter(inmates, { total: 3 }).source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WAGONER_COUNTY_RECORD_COUNT_MISMATCH");
  });

  it("retries, then fails closed, when the two official booking lists keep disagreeing", async () => {
    const { source, requested } = adapter(inmates, { idList: ["9000000001"] });
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WAGONER_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
    expect(requested.filter((url) => url.endsWith("Read2.php"))).toHaveLength(3);
  });

  it("fails closed when a detail record names someone else", async () => {
    const result = await runSourceAdapter(
      adapter(inmates, {
        detail: (inmate) => ({
          queryInmate: { BookingID: inmate.id, LName: "OTHER", FName: "PERSON", Charges: null }
        })
      }).source,
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WAGONER_COUNTY_INVALID_RECORD_IDENTITY");
  });

  it("fails closed on an empty roster", async () => {
    const result = await runSourceAdapter(adapter([]).source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WAGONER_COUNTY_ROSTER_EMPTY");
  });

  it("refuses a source URL other than the approved inmate search", async () => {
    const result = await runSourceAdapter(
      adapter(inmates).source,
      context("https://www.wagonercountyso.org/dmxConnect/api/Booking/Other.php")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WAGONER_COUNTY_SOURCE_URL_MISMATCH");
  });

  it("treats a blank charge field as no charges and rejects unreadable markup", () => {
    expect(parseWagonerCharges(null)).toEqual([]);
    expect(parseWagonerCharges("  ")).toEqual([]);
    expect(() => parseWagonerCharges("<li></li>")).toThrow("CHARGE_LIST_UNREADABLE");
  });
});
