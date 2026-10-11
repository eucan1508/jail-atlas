import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  SHERBURNE_COUNTY_ADAPTER_KEY,
  SHERBURNE_COUNTY_CURRENT_SOURCE_URL,
  createSherburneCountySourceAdapter,
  type SherburneRosterIdFactory
} from "./sherburne-county.js";

type SyntheticInmate = Readonly<{
  bookingNo: string;
  fullName: string;
  charges: readonly (readonly [string | null, string | null])[];
  releaseDate?: string;
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    bookingNo: "2000000001",
    fullName: "Tester, Alpha",
    charges: [
      ["999.11.1(1)", "Synthetic Offense Alpha"],
      ["999.22", "Synthetic Offense Beta"]
    ]
  },
  { bookingNo: "2000000002", fullName: "Tester, Beta", charges: [["999.33", null]] }
];

function context(sourceUrl = SHERBURNE_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000801",
    source: {
      id: "00000000-0000-4000-8000-000000000802",
      officialInstitutionId: "00000000-0000-4000-8000-000000000803",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.co.sherburne.mn.us/400/Jail",
      relationshipEvidenceUrl: "https://www.co.sherburne.mn.us/903/Inmate-Search",
      evidenceDescription: "Synthetic Sherburne County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: SHERBURNE_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-sherburne-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): SherburneRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 810;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function adapter(
  roster: readonly SyntheticInmate[],
  overrides: {
    total?: number;
    listAfter?: (call: number) => readonly SyntheticInmate[];
    detail?: (inmate: SyntheticInmate) => Response;
  } = {}
) {
  const requested: string[] = [];
  let listCalls = 0;
  const source = createSherburneCountySourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      const url = new URL(input);
      if (url.pathname.endsWith("/search")) {
        listCalls += 1;
        const rows = overrides.listAfter?.(listCalls) ?? roster;
        return json({
          total: overrides.total ?? rows.length,
          page: Number(url.searchParams.get("page")),
          pageSize: 200,
          data: rows.map((inmate) => ({
            spnNo: 99999,
            bookingNo: inmate.bookingNo,
            fullName: inmate.fullName,
            dobDttm: "1900-01-01T00:00:00",
            sex: "M",
            status: "1",
            totalBondAmt: 999
          }))
        });
      }
      const inmate = roster.find((item) => url.pathname.endsWith(`/${item.bookingNo}`));
      if (!inmate) return json({ title: "Not Found", status: 404 }, 404);
      return (
        overrides.detail?.(inmate) ??
        json({
          bookingNo: inmate.bookingNo,
          fullName: inmate.fullName,
          spnNo: 99999,
          dobDttm: "1900-01-01T00:00:00",
          releaseDate: inmate.releaseDate ?? null,
          charges: inmate.charges.map(([charge, chargeDesc]) => ({
            caseNbr: "77770001",
            charge,
            chargeDesc,
            severity: "F   ",
            bailAmt: 999
          })),
          holds: []
        })
      );
    },
    facilityId: "00000000-0000-4000-8000-000000000804",
    createId: idFactory()
  });
  return { source, requested };
}

describe("Sherburne County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(SHERBURNE_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every booking with statute-coded charges and keeps no personal details", async () => {
    const { source, requested } = adapter(inmates);
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(requested.filter((url) => url.includes("/search?"))).toHaveLength(2);
    expect(result.snapshot.recordCount).toBe(2);
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.bookingIdentifier?.value).toBe("2000000001");
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      ["999.11.1(1)", "Synthetic Offense Alpha"],
      ["999.22", "Synthetic Offense Beta"]
    ]);
    // A charge without a description falls back to its statute.
    expect(beta?.charges.map((charge) => charge.description)).toEqual(["999.33"]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["1900-01-01", "99999", "77770001"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the list total and its rows disagree", async () => {
    const result = await runSourceAdapter(adapter(inmates, { total: 3 }).source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("SHERBURNE_COUNTY_RECORD_COUNT_MISMATCH");
  });

  it("reads again, then fails closed, when the list keeps changing during the crawl", async () => {
    const changing = adapter(inmates, {
      listAfter: (call) => (call % 2 === 0 ? inmates.slice(0, 1) : inmates)
    });
    const result = await runSourceAdapter(changing.source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("SHERBURNE_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
    expect(changing.requested.filter((url) => url.includes("/search?"))).toHaveLength(6);

    const settles = adapter(inmates, {
      listAfter: (call) => (call === 2 ? inmates.slice(0, 1) : inmates)
    });
    expect((await runSourceAdapter(settles.source, context())).ok).toBe(true);
  });

  it("treats a booking released mid-crawl as a changed roster", async () => {
    const released = await runSourceAdapter(
      adapter([inmates[0]!, { ...inmates[1]!, releaseDate: "2000-01-01T09:00:00" }]).source,
      context()
    );
    expect(released.ok).toBe(false);
    if (!released.ok) {
      expect(released.failure.diagnosticCode).toBe("SHERBURNE_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
    }

    const gone = await runSourceAdapter(
      adapter(inmates, { detail: () => json({ status: 404 }, 404) }).source,
      context()
    );
    expect(gone.ok).toBe(false);
    if (!gone.ok) {
      expect(gone.failure.diagnosticCode).toBe("SHERBURNE_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
    }
  });

  it("fails closed when a detail record names someone else or the roster is empty", async () => {
    const mismatch = await runSourceAdapter(
      adapter(inmates, {
        detail: (inmate) =>
          json({
            bookingNo: inmate.bookingNo,
            fullName: "Other, Person",
            releaseDate: null,
            charges: []
          })
      }).source,
      context()
    );
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) {
      expect(mismatch.failure.diagnosticCode).toBe("SHERBURNE_COUNTY_INVALID_RECORD_IDENTITY");
    }

    const empty = await runSourceAdapter(adapter([]).source, context());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.failure.diagnosticCode).toBe("SHERBURNE_COUNTY_ROSTER_EMPTY");
  });

  it("refuses a source URL other than the approved inmate search", async () => {
    const result = await runSourceAdapter(
      adapter(inmates).source,
      context("https://inmatelocatorext.co.sherburne.mn.us/InmateLocatorAPI/api/Other")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("SHERBURNE_COUNTY_SOURCE_URL_MISMATCH");
  });
});
