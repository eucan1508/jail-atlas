import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  JOHNSON_COUNTY_ADAPTER_KEY,
  JOHNSON_COUNTY_CURRENT_SOURCE_URL,
  createJohnsonCountySourceAdapter,
  type JohnsonRosterIdFactory
} from "./johnson-county.js";

type SyntheticInmate = Readonly<{
  id: string;
  name: string;
  housing?: string;
  released?: string;
  charges: readonly (readonly [string, string, string])[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    id: "900001",
    name: "TESTER, ALPHA",
    charges: [
      ["SYNTHETIC OFFENSE ALPHA (SRMS)", "999.1(2)", "PENDING"],
      ["SYNTHETIC OFFENSE BETA", "999.22", "2000-01-01"]
    ]
  },
  { id: "900002", name: "TESTER, BETA", charges: [] },
  { id: "900003", name: "TESTER, GAMMA", housing: "OTHER COUNTY", charges: [] },
  { id: "900004", name: "TESTER, DELTA", released: "1/1/2000 9:00 AM", charges: [] }
];

function context(sourceUrl = JOHNSON_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://johnsoncountyiowa.gov/sheriff/jail-division",
      relationshipEvidenceUrl: "https://johnsoncountyiowa.gov/office-of-sheriff",
      evidenceDescription: "Synthetic Johnson County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: JOHNSON_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-johnson-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): JohnsonRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 910;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function listPage(roster: readonly SyntheticInmate[]): string {
  const rows = roster
    .map(
      (inmate) => `
      <tr><td>1/1/2000 08:00 AM</td><td>${inmate.name}</td><td>99</td><td>${inmate.released ?? ""}</td>
        <td>${inmate.housing ?? "JOHNSON COUNTY"}</td>
        <td><a href="/Sheriff/jailroster/details/${inmate.id}">Details</a></td></tr>
      <tr><td colspan="6">Charges: SYNTHETIC</td></tr>`
    )
    .join("");
  return `<html><head><title>Johnson County Iowa Jail Roster | Johnson County Iowa</title></head><body>
    <table><tr><th>Date Booked</th><th>Name</th><th>Age</th><th>Date Released</th>
    <th>Housing Facility</th><th>Details</th></tr>${rows}</table></body></html>`;
}

function detailPage(inmate: SyntheticInmate, name = inmate.name): string {
  const charges = inmate.charges
    .map(
      ([offense, code, released]) => `
      <table class="table table-sm">
        <tr><th>Offense</th><th>Code Section</th><th>Level of Offense</th></tr>
        <tr><td>${offense}</td><td>${code}</td><td>SYNTHETIC LEVEL</td></tr>
        <tr><th>Cause Number</th><th>Bond Type/Sentenced</th><th>Bond Amount</th><th>Charge Released</th></tr>
        <tr><td>CASE777</td><td>CASH</td><td>$999.00</td><td>${released}</td></tr>
      </table>`
    )
    .join("");
  return `<html><body><h1>Johnson County Iowa Jail</h1><h4>Inmate Information for ${name}</h4>
    <table class="table table-sm"><tr><th>Date Booked</th><th>Housing Facility</th><th>Age</th><th></th></tr>
      <tr></tr><tr><td>1/1/2000 8:00:00 AM</td><td>${inmate.housing ?? "JOHNSON COUNTY"}</td><td>99</td><td></td></tr></table>
    <table class="table table-sm"><tr><th>Address</th><th>City</th><th>State</th><th>Zip</th></tr>
      <tr></tr><tr><td>1 SYNTHETIC STREET</td><td>SYNTHVILLE</td><td>IA</td><td>00000</td></tr></table>
    ${charges}</body></html>`;
}

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html" } });
}

function adapter(
  roster: readonly SyntheticInmate[],
  overrides: {
    listAfter?: (call: number) => readonly SyntheticInmate[];
    detail?: (inmate: SyntheticInmate) => Response;
  } = {}
) {
  const requested: string[] = [];
  let listCalls = 0;
  const source = createJohnsonCountySourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      if (input === JOHNSON_COUNTY_CURRENT_SOURCE_URL) {
        listCalls += 1;
        return html(listPage(overrides.listAfter?.(listCalls) ?? roster));
      }
      const inmate = roster.find((item) => input.endsWith(`/details/${item.id}`));
      if (!inmate) return html("Not found", 404);
      return overrides.detail?.(inmate) ?? html(detailPage(inmate));
    },
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory()
  });
  return { source, requested };
}

describe("Johnson County, Iowa source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(JOHNSON_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("keeps people held at the Johnson County Jail with their pending, statute-coded charges", async () => {
    const { source, requested } = adapter(inmates);
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(2);
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("TESTER, ALPHA");
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      ["999.1(2)", "SYNTHETIC OFFENSE ALPHA (SRMS)"]
    ]);
    expect(beta?.charges).toEqual([]);
    expect(alpha?.bookingIdentifier).toBeNull();
    // Only the two people kept have their details read; the list is read before and after.
    expect(requested.filter((url) => url.includes("/details/"))).toHaveLength(2);
    expect(requested.filter((url) => url === JOHNSON_COUNTY_CURRENT_SOURCE_URL)).toHaveLength(2);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["SYNTHETIC STREET", "SYNTHVILLE", "CASE777", "$999", "OFFENSE BETA"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("leaves out a booking listed before its name is entered, but not more than two", async () => {
    const pending = (id: string): SyntheticInmate => ({ id, name: "", charges: [] });
    const one = adapter([...inmates, pending("900005")]);
    const result = await runSourceAdapter(one.source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(2);
    expect(one.requested.some((url) => url.endsWith("/details/900005"))).toBe(false);

    const many = await runSourceAdapter(
      adapter([...inmates, pending("900005"), pending("900006"), pending("900007")]).source,
      context()
    );
    expect(many.ok).toBe(false);
    if (!many.ok) expect(many.failure.diagnosticCode).toBe("JOHNSON_COUNTY_NAMES_MISSING");
  });

  it("lists someone whose detail page errors by name only, but not more than two", async () => {
    const failing = (ids: readonly string[]) =>
      adapter(inmates, {
        detail: (inmate) =>
          ids.includes(inmate.id) ? html("Server Error", 500) : html(detailPage(inmate))
      }).source;
    const one = await runSourceAdapter(failing(["900001"]), context());
    expect(one.ok).toBe(true);
    if (one.ok) {
      expect(one.snapshot.recordCount).toBe(2);
      expect(one.snapshot.bookings[0]?.person.displayName).toBe("TESTER, ALPHA");
      expect(one.snapshot.bookings[0]?.charges).toEqual([]);
    }

    const crowded = [
      ...inmates,
      { id: "900008", name: "TESTER, EPSILON", charges: [] },
      { id: "900009", name: "TESTER, ZETA", charges: [] }
    ];
    const three = await runSourceAdapter(
      adapter(crowded, {
        detail: (inmate) =>
          ["900001", "900008", "900009"].includes(inmate.id)
            ? html("Server Error", 500)
            : html(detailPage(inmate))
      }).source,
      context()
    );
    expect(three.ok).toBe(false);
    if (!three.ok) expect(three.failure.diagnosticCode).toBe("JOHNSON_COUNTY_HTTP_500");
  });

  it("leaves out one blank open charge on a page, but fails closed on two", async () => {
    const blank = ["", "", "PENDING"] as const;
    const withBlank = (extra: number): SyntheticInmate[] =>
      inmates.map((inmate) =>
        inmate.id === "900001"
          ? { ...inmate, charges: [...inmate.charges, ...Array(extra).fill(blank)] }
          : inmate
      );
    const one = await runSourceAdapter(adapter(withBlank(1)).source, context());
    expect(one.ok).toBe(true);
    if (one.ok) {
      expect(one.snapshot.bookings[0]?.charges.map((charge) => charge.description)).toEqual([
        "SYNTHETIC OFFENSE ALPHA (SRMS)"
      ]);
    }

    const two = await runSourceAdapter(adapter(withBlank(2)).source, context());
    expect(two.ok).toBe(false);
    if (!two.ok) expect(two.failure.diagnosticCode).toBe("JOHNSON_COUNTY_EMPTY_CHARGE");
  });

  it("reads again, then fails closed, when the list keeps changing during the crawl", async () => {
    const changing = adapter(inmates, {
      listAfter: (call) => (call % 2 === 0 ? inmates.slice(0, 1) : inmates)
    });
    const result = await runSourceAdapter(changing.source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("JOHNSON_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
    expect(
      changing.requested.filter((url) => url === JOHNSON_COUNTY_CURRENT_SOURCE_URL)
    ).toHaveLength(6);
  });

  it("fails closed when a detail names someone else or its charge table changed", async () => {
    const other = await runSourceAdapter(
      adapter(inmates, { detail: (inmate) => html(detailPage(inmate, "OTHER, PERSON")) }).source,
      context()
    );
    expect(other.ok).toBe(false);
    if (!other.ok)
      expect(other.failure.diagnosticCode).toBe("JOHNSON_COUNTY_INVALID_RECORD_IDENTITY");

    const broken = await runSourceAdapter(
      adapter(inmates, {
        detail: (inmate) => html(detailPage(inmate).replace("Charge Released", "Something Else"))
      }).source,
      context()
    );
    expect(broken.ok).toBe(false);
    if (!broken.ok) {
      expect(broken.failure.diagnosticCode).toBe("JOHNSON_COUNTY_CHARGE_STRUCTURE_CHANGED");
    }
  });

  it("fails closed when the list columns change or nobody is held at the jail", async () => {
    const columns = await runSourceAdapter(
      createJohnsonCountySourceAdapter({
        fetch: async () => html(listPage(inmates).replace("Housing Facility", "Location")),
        facilityId: "00000000-0000-4000-8000-000000000904",
        createId: idFactory()
      }),
      context()
    );
    expect(columns.ok).toBe(false);
    if (!columns.ok)
      expect(columns.failure.diagnosticCode).toBe("JOHNSON_COUNTY_ROSTER_COLUMNS_CHANGED");

    const empty = await runSourceAdapter(adapter([inmates[2]!]).source, context());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.failure.diagnosticCode).toBe("JOHNSON_COUNTY_ROSTER_EMPTY");
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter(inmates).source,
      context("https://ww1.johnsoncountyiowa.gov/Sheriff/jailroster/other")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("JOHNSON_COUNTY_SOURCE_URL_MISMATCH");
  });
});
