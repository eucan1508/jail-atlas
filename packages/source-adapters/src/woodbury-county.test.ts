import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  WOODBURY_COUNTY_ADAPTER_KEY,
  WOODBURY_COUNTY_CURRENT_SOURCE_URL,
  createWoodburyCountySourceAdapter,
  parseWoodburyPage,
  type WoodburyRosterIdFactory
} from "./woodbury-county.js";

type SyntheticRow = readonly [
  name: string,
  date: string,
  time: string,
  charges: string,
  bond: string
];

const rows: readonly SyntheticRow[] = [
  [
    "TESTER, ALPHA",
    "01/02/2000",
    "1:05 PM",
    "SYNTHETIC OFFENSE, 2ND OFF, SYNTHETIC WARRANT",
    "$1,250.00"
  ],
  ["TESTER, BETA", "01/03/2000", "11:40 AM", "SYNTHETIC HOLD", "No Bond"],
  ["TESTER, GAMMA", "01/04/2000", "8:00 AM", "SYNTHETIC OFFENSE-(2 Counts)", "$0.00"]
];

function page(
  list: readonly SyntheticRow[],
  options: { total?: number; pageNumber?: number; pageCount?: number; title?: string } = {}
): string {
  const total = options.total ?? list.length;
  const body = list
    .map(
      ([name, date, time, charges, bond], index) => `<tr>
        <td><a id="GridView1_lnkSelect_${index}" href="javascript:__doPostBack('GridView1$ctl0${index + 2}$lnkSelect','')">View</a></td>
        <td>${name}</td><td>${date}</td><td>${time}</td><td>${charges}</td><td>${bond}</td>
      </tr>`
    )
    .join("");
  return `<!doctype html><html><head><title>${options.title ?? "Woodbury County In Jail Search"}</title></head>
  <body><form method="post" action="./" id="form1">
    <input type="hidden" name="__VIEWSTATE" value="SYNTHETIC-STATE" />
    <input type="hidden" name="__VIEWSTATEGENERATOR" value="SYNTHETIC" />
    <input type="hidden" name="__VIEWSTATEENCRYPTED" value="" />
    <input type="hidden" name="__EVENTVALIDATION" value="SYNTHETIC-VALIDATION" />
    <input name="txtName" type="text" /><input name="txtFrom" type="text" />
    <input name="txtTo" type="text" /><input name="txtCharge" type="text" />
    <select name="ddDisplayRows"><option selected="selected" value="10">10</option><option value="999">All</option></select>
    <select name="ddSortTable"><option selected="selected" value="NameAsc">Name Ascending</option></select>
    <input type="submit" name="btnSearch" value="Search" />
    <p>Search Returned ${total} records.</p>
    <table id="GridView1"><tr>
      <th>View Inmate Details</th><th>Inmate Name</th><th>Date Booked</th>
      <th>Time Booked</th><th>Charges</th><th>Bond Amount</th>
    </tr>${body}</table>
    <span>Page ${options.pageNumber ?? 1} of ${options.pageCount ?? 1}</span>
  </form></body></html>`;
}

function context(sourceUrl: string = WOODBURY_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.woodburycountyiowa.gov/sheriff/",
      relationshipEvidenceUrl: "https://www.woodburycountyiowa.gov/sheriff/jail/",
      evidenceDescription: "Synthetic Woodbury County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: WOODBURY_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-woodbury-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): WoodburyRosterIdFactory {
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

type Server = {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  bodies: (string | null)[];
};

/** Serves the opening page on GET and the whole roster on an "All" search; `all` overrides a search answer. */
function server(
  list: readonly SyntheticRow[] = rows,
  overrides: { opening?: string; all?: (call: number) => string | undefined } = {}
): Server {
  const bodies: (string | null)[] = [];
  let searches = 0;
  return {
    bodies,
    fetch: async (_input, init) => {
      const body = init?.body ? String(init.body) : null;
      bodies.push(body);
      if (!body) {
        return new Response(
          overrides.opening ?? page(list.slice(0, 2), { total: list.length, pageCount: 2 })
        );
      }
      searches += 1;
      return new Response(overrides.all?.(searches) ?? page(list));
    }
  };
}

function adapter(source: Server) {
  return createWoodburyCountySourceAdapter({
    fetch: source.fetch,
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Woodbury County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(WOODBURY_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads the whole roster on one page and keeps charge text whole", async () => {
    const source = server();
    const result = await runSourceAdapter(adapter(source), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(3);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier,
        booking.charges.map((charge) => charge.description),
        booking.bondEntries.map((bond) =>
          bond.state === "monetary" ? bond.amountMinor : bond.state
        )
      ])
    ).toEqual([
      ["TESTER, ALPHA", null, ["SYNTHETIC OFFENSE, 2ND OFF, SYNTHETIC WARRANT"], [125_000]],
      ["TESTER, BETA", null, ["SYNTHETIC HOLD"], ["no_bond"]],
      ["TESTER, GAMMA", null, ["SYNTHETIC OFFENSE-(2 Counts)"], [0]]
    ]);
    // The opening page, then two "All" searches that must agree.
    expect(source.bodies).toHaveLength(3);
    expect(source.bodies[0]).toBeNull();
    for (const body of source.bodies.slice(1)) {
      const form = new URLSearchParams(body ?? "");
      expect(form.get("ddDisplayRows")).toBe("999");
      expect(form.get("btnSearch")).toBe("Search");
      expect(form.get("__VIEWSTATE")).toBe("SYNTHETIC-STATE");
    }
  });

  it("drops booking dates and times from the snapshot", async () => {
    const result = await runSourceAdapter(adapter(server()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["01/02/2000", "1:05 PM"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("accepts a record count one row ahead of the grid", async () => {
    const result = await runSourceAdapter(
      adapter(
        server(rows, {
          opening: page(rows.slice(0, 2), { total: 4, pageCount: 2 }),
          all: () => page(rows, { total: 4 })
        })
      ),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(3);
  });

  it("starts over when a search comes back short, then fails closed", async () => {
    const recovered = await runSourceAdapter(
      adapter(server(rows, { all: (call) => (call === 1 ? page([], { total: 0 }) : undefined) })),
      context()
    );
    expect(recovered.ok).toBe(true);

    const failed = await runSourceAdapter(
      adapter(
        server(rows, { all: (call) => (call % 2 === 0 ? page(rows.slice(0, 2)) : undefined) })
      ),
      context()
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.failure.diagnosticCode).toBe("WOODBURY_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
  });

  it("fails closed on a changed page, a count gap, a duplicate, or an empty roster", async () => {
    const cases: [Server, string][] = [
      [
        server(rows, { opening: page(rows, { title: "Other Search" }) }),
        "SOURCE_IDENTITY_MISMATCH"
      ],
      [
        server(rows, {
          opening: page(rows.slice(0, 2), { total: 6, pageCount: 2 }),
          all: () => page(rows, { total: 6 })
        }),
        "ROSTER_COUNT_MISMATCH"
      ],
      [server(rows, { all: () => page(rows, { pageCount: 2 }) }), "PAGE_SEQUENCE_MISMATCH"],
      [server([rows[0]!, rows[0]!]), "DUPLICATE_ROSTER_ROW"],
      [
        server([["TESTER, DELTA", "01/05/2000", "9:00 AM", "SYNTHETIC", "Unknown"]]),
        "BOND_UNREADABLE"
      ],
      [
        server([["TESTER, DELTA", "2000-01-05", "9:00 AM", "SYNTHETIC", "No Bond"]]),
        "ROW_STRUCTURE_CHANGED"
      ],
      [server([]), "ROSTER_EMPTY"]
    ];
    for (const [source, code] of cases) {
      const result = await runSourceAdapter(adapter(source), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`WOODBURY_COUNTY_${code}`);
    }
  });

  it("rejects a page whose grid columns changed", () => {
    expect(() =>
      parseWoodburyPage(page(rows).replace("<th>Bond Amount</th>", "<th>Bond</th>"))
    ).toThrow("ROSTER_COLUMNS_CHANGED");
  });

  it("refuses a source URL other than the approved search", async () => {
    const result = await runSourceAdapter(
      adapter(server()),
      context("https://www.woodburycountyiowa.gov/sheriff/jail/")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WOODBURY_COUNTY_SOURCE_URL_MISMATCH");
  });
});
