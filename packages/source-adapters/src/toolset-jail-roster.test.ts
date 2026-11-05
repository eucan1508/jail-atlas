import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  JACKSON_COUNTY_KS_ROSTER,
  TOOLSET_JAIL_ROSTERS,
  createToolsetJailRosterAdapter,
  toolsetPageUrl,
  type ToolsetJailRosterConfig
} from "./toolset-jail-roster.js";

type SyntheticPerson = Readonly<{ name: string; booking: string; charges: string }>;

const config = JACKSON_COUNTY_KS_ROSTER;

function context(sourceUrl: string = config.sourceUrl): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000091",
    source: {
      id: "00000000-0000-4000-8000-000000000092",
      officialInstitutionId: "00000000-0000-4000-8000-000000000093",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.jasoks.org/",
      relationshipEvidenceUrl: "https://www.jasoks.org/divisions/jail-division/",
      evidenceDescription: "Synthetic Toolset roster adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: config.adapterKey,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-toolset-roster-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function person(entry: SyntheticPerson): string {
  return `
          <h3 style="background-color:#C6CDD7;">
            ${entry.name}
			   </h3>
<div style="float: left; width:25%;"><img decoding="async" src="/inmatephotos/${entry.booking}-1.jpg" width="150"></div>
<div style="float: right; width:70%;">
<b>Booking Number:</b> ${entry.booking}<br>
<b>Charges:</b> ${entry.charges}<br>
<b>Bond:</b> 5000<br>
<b>Arresting Agency:</b> Synthetic SO<br>
<b>Date:</b> 20000101 09:00<br>
Age: 99, Sex: X, Race: X<br></div>
<div style="clear: both;"></div><br>`;
}

function page(
  people: readonly SyntheticPerson[],
  options: { total?: number; next?: number | null; county?: string } = {}
): string {
  const total = options.total ?? people.length;
  const next =
    options.next == null
      ? ""
      : `<a class="wpv-filter-next-link js-wpv-pagination-next-link page-link "  href="/agency-data/jail-roster/?wpv_view_count=5832&#038;wpv_paged=${options.next}">Next</a>`;
  return `<!doctype html><html><head><title>Jail Roster | ${options.county ?? "Jackson County"} Sheriff&#039;s Office of Kansas</title></head><body>
<div id="wpv-view-layout-5832" data-viewnumber="5832">
(Number of Inmates: ${total} )
${people.map(person).join("\n")}
</div>${next}
</body></html>`;
}

const alpha = {
  name: "Tester, Alpha Synthetic",
  booking: "B00000000001",
  charges:
    "21-5915(a) Synthetic failure to appear: STAT|21-5904(a4)(b6)(B) Synthetic interference.<br> knowingly flee for felony case: STAT|Hold for Synthetic Agency"
};
const beta = { name: "Tester-Doe, Beta", booking: "B00000000002", charges: "Serving 30 Days" };
const gamma = {
  name: "Tester, Gamma",
  booking: "B00000000003",
  charges: "8-1528 Synthetic failure to yield &amp; stop: STAT"
};

function adapter(pages: ReadonlyMap<string, string>, requests: string[] = []) {
  return createToolsetJailRosterAdapter(config, {
    fetch: async (input) => {
      requests.push(input);
      const html = pages.get(input);
      return new Response(html ?? "missing", { status: html ? 200 : 404 });
    },
    facilityId: "00000000-0000-4000-8000-000000000094",
    createId: (() => {
      let sequence = 0;
      return () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    })(),
    nowMs: () => 1_000
  });
}

function roster(...pages: string[]): ReadonlyMap<string, string> {
  return new Map(pages.map((html, index) => [toolsetPageUrl(config, index + 1), html]));
}

describe("Toolset jail roster adapter (Jackson County, Kansas)", () => {
  it("keeps every roster out of the default registry", () => {
    for (const site of TOOLSET_JAIL_ROSTERS) {
      expect(sourceAdapterRegistry.has(site.adapterKey)).toBe(false);
    }
  });

  it("reads every page, splits statutes from titles, and keeps only names and charges", async () => {
    const requests: string[] = [];
    const result = await runSourceAdapter(
      adapter(
        roster(page([alpha, beta], { total: 3, next: 2 }), page([gamma], { total: 3 })),
        requests
      ),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(requests).toEqual([
      "https://www.jasoks.org/agency-data/jail-roster/",
      "https://www.jasoks.org/agency-data/jail-roster/?wpv_view_count=5832&wpv_paged=2"
    ]);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier?.value,
        booking.charges.map((charge) => [charge.statuteCode, charge.description]),
        booking.bondEntries.length
      ])
    ).toEqual([
      [
        "Tester, Alpha Synthetic",
        "B00000000001",
        [
          ["21-5915(a)", "Synthetic failure to appear"],
          ["21-5904(a4)(b6)(B)", "Synthetic interference. knowingly flee for felony case"],
          [null, "Hold for Synthetic Agency"]
        ],
        0
      ],
      ["Tester-Doe, Beta", "B00000000002", [[null, "Serving 30 Days"]], 0],
      ["Tester, Gamma", "B00000000003", [["8-1528", "Synthetic failure to yield & stop"]], 0]
    ]);
    const json = JSON.stringify(result.snapshot);
    for (const dropped of ["inmatephotos", "Synthetic SO", "20000101", "Age: 99", "5000"]) {
      expect(json).not.toContain(dropped);
    }
  });

  it("fails closed when the list is short, changes, repeats, or is not the approved page", async () => {
    const cases: [ReadonlyMap<string, string>, string, AdapterContext?][] = [
      [roster(page([alpha, beta], { total: 3 })), "ROSTER_COUNT_MISMATCH"],
      [
        roster(page([alpha, beta], { total: 3, next: 2 }), page([gamma], { total: 4 })),
        "ROSTER_CHANGED_DURING_CRAWL"
      ],
      [roster(page([alpha, alpha])), "DUPLICATE_BOOKING"],
      [roster(page([alpha], { county: "Synthetic County" })), "SOURCE_IDENTITY_MISMATCH"],
      [roster(page([])), "ROSTER_EMPTY"],
      [roster(page([alpha, beta], { total: 3, next: 2 }), page([], { total: 3 })), "PAGE_EMPTY"],
      [roster(page([{ ...alpha, booking: "12345" }])), "BOOKING_NUMBER_UNREADABLE"],
      [roster(page([alpha], { next: 3 })), "PAGER_UNREADABLE"],
      [roster(page([alpha])), "SOURCE_URL_MISMATCH", context("https://www.jasoks.org/elsewhere/")]
    ];
    for (const [pages, code, runContext] of cases) {
      const result = await runSourceAdapter(adapter(pages), runContext ?? context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode, code).toBe(`JACKSON_COUNTY_KS_${code}`);
    }
  });

  it("allows a few people whose charges are not entered yet, but not many", async () => {
    const blank = (index: number) => ({
      name: `Tester, Blank ${index}`,
      booking: `B0000000010${index}`,
      charges: ""
    });
    const few = await runSourceAdapter(adapter(roster(page([alpha, beta, blank(1)]))), context());
    expect(few.ok).toBe(true);
    const many = await runSourceAdapter(
      adapter(roster(page([alpha, blank(1), blank(2), blank(3)]))),
      context()
    );
    expect(many.ok).toBe(false);
    if (!many.ok) expect(many.failure.diagnosticCode).toBe("JACKSON_COUNTY_KS_CHARGES_MISSING");
  });

  it("builds page URLs from the configured view number", () => {
    const other: ToolsetJailRosterConfig = { ...config, viewNumber: "285" };
    expect(toolsetPageUrl(other, 1)).toBe(config.sourceUrl);
    expect(toolsetPageUrl(other, 3)).toBe(`${config.sourceUrl}?wpv_view_count=285&wpv_paged=3`);
  });
});
