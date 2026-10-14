import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  createMyr2mRosterAdapter,
  myr2mRosterSite,
  SHARP_COUNTY_AR_ROSTER,
  type Myr2mRosterIdFactory
} from "./myr2m-roster.js";

function context(sourceUrl: string = SHARP_COUNTY_AR_ROSTER.sourceUrl): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000081",
    source: {
      id: "00000000-0000-4000-8000-000000000082",
      officialInstitutionId: "00000000-0000-4000-8000-000000000083",
      sourceUrl,
      sourceType: "officially_linked_vendor",
      officialInstitutionUrl: "https://www.sharpcountysheriff.com/roster",
      relationshipEvidenceUrl: "https://www.sharpcountysheriff.com/roster",
      evidenceDescription: "Synthetic Sharp County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: SHARP_COUNTY_AR_ROSTER.adapterKey,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-sharp-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): Myr2mRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 90;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

type Person = { name: string; arrested: string; charges: string[]; bonds: string[] };

function grid(index: number, kind: "charge" | "bond", label: string, values: string[]): string {
  if (values.length === 0) return "";
  const rows = values
    .map(
      (value, row) =>
        `<tr><td><span id="ContentPlaceHolder1_rptListInmates_${kind}Grid_${index}_Label1_${row}">${value}</span></td></tr>`
    )
    .join("");
  return `<table id="ContentPlaceHolder1_rptListInmates_${kind}Grid_${index}"><tr><th scope="col">${label}</th></tr>${rows}</table>`;
}

function card(person: Person, index: number): string {
  const span = (label: string, value: string) =>
    `<span id="ContentPlaceHolder1_rptListInmates_${label}_${index}">${value}</span>`;
  return `<div class="card mb-3"><div class="card-body">
    <img src="GetPhoto6.aspx?OurImageID=99999${index}" alt="${person.name}" />
    <h5>${span("lblName", person.name)}</h5>
    <p><strong>Race/Sex/Age:</strong> ${span("lblRace", "X / X / 99 years")}</p>
    <p><strong>Address:</strong> ${span("lblAddress", "Synthetic Town, AR")}</p>
    <p><strong>Arrested:</strong> ${span("lblArrestDate", person.arrested)}</p>
    <p><strong>Arrested By:</strong> ${span("lblArrestBy", "Synthetic Agency")}</p>
    ${grid(index, "charge", "Charges", person.charges)}
    ${grid(index, "bond", "Bond", person.bonds)}
  </div></div>`;
}

function page(
  people: Person[],
  options: { total?: number; names?: string[]; state: string; heading?: string }
): string {
  const names = options.names ?? [];
  const total = options.total ?? names.length;
  return `<html><body><form method="post" action="./" id="form1">
    <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="${options.state}" />
    <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="GEN" />
    <input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="EV-${options.state}" />
    <span id="lblAgencyName">${options.heading ?? "Sharp County Sheriff"}</span>
    <span id="lblPageDescription">All Current Inmates</span>
    <span id="lblInmateslisted">${people.length} inmates shown out of ${total} total</span>
    <select name="ctl00$ContentPlaceHolder1$ddlSelectName">${names
      .map((name, index) => `<option value="${index}">${name}</option>`)
      .join("")}</select>
    ${people.map(card).join("<hr />")}
  </form></body></html>`;
}

const PEOPLE: Person[] = Array.from({ length: 32 }, (_, index) => ({
  name: `TESTER, PERSON ${String(index + 1).padStart(2, "0")} - TEST ONLY`,
  arrested: `1/${(index % 28) + 1}/2000 9:00:00 AM`,
  charges:
    index === 0
      ? ["Synthetic Offense Alpha (999 (A)M)", "Synthetic Offense Beta"]
      : ["Synthetic Offense Gamma"],
  bonds: index === 0 ? ["$1,250.00", "$0.00"] : index === 1 ? [] : ["$99.50"]
}));
const NAMES = PEOPLE.map((person) => person.name);

type Request = { method: string; form: URLSearchParams | null };

/** Serves the GET page (10 per page) and posts that switch to 30 per page and step forward. */
function rosterServer(
  people: Person[] = PEOPLE,
  tweak: (request: Request, html: string) => string = (_request, html) => html
) {
  const requests: Request[] = [];
  const names = people.map((person) => person.name);
  let pageIndex = 0;
  const fetch = async (_input: string, init?: RequestInit) => {
    const form = init?.body instanceof URLSearchParams ? init.body : null;
    const request = { method: init?.method ?? "GET", form };
    requests.push(request);
    let html: string;
    if (!form) {
      pageIndex = 0;
      html = page(people.slice(0, 10), { names, state: "S0" });
    } else {
      if (form.get("ctl00$ContentPlaceHolder1$cmdNext") === "Next") pageIndex += 1;
      else pageIndex = 0;
      const slice = people.slice(pageIndex * 30, pageIndex * 30 + 30);
      html = page(slice, { names, state: `S${requests.length}` });
    }
    return new Response(tweak(request, html), {
      status: 200,
      headers: { "content-type": "text/html" }
    });
  };
  return { fetch, requests };
}

function adapter(fetch: ReturnType<typeof rosterServer>["fetch"]) {
  return createMyr2mRosterAdapter(SHARP_COUNTY_AR_ROSTER, {
    fetch,
    facilityId: "00000000-0000-4000-8000-000000000084",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("myr2m roster adapter (Sharp County, Arkansas)", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(SHARP_COUNTY_AR_ROSTER.adapterKey)).toBe(false);
    expect(myr2mRosterSite(SHARP_COUNTY_AR_ROSTER.adapterKey)).toBe(SHARP_COUNTY_AR_ROSTER);
    expect(myr2mRosterSite("unknown-adapter")).toBeUndefined();
  });

  it("pages through every card with form posts and keeps charges and bonds", async () => {
    const server = rosterServer();
    const result = await runSourceAdapter(adapter(server.fetch), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(32);
    expect(result.snapshot.bookings.map((booking) => booking.person.displayName)).toEqual(NAMES);
    const [first, second, third] = result.snapshot.bookings;
    expect(first?.charges.map((charge) => [charge.description, charge.statuteCode])).toEqual([
      ["Synthetic Offense Alpha (999 (A)M)", null],
      ["Synthetic Offense Beta", null]
    ]);
    expect(first?.bondEntries.map((bond) => [bond.state, bond.amountMinor])).toEqual([
      ["monetary", 125_000],
      ["monetary", 0]
    ]);
    expect(first?.bondEntries[1]?.note).toContain("not interpreted as no bond");
    expect(second?.bondEntries).toEqual([]);
    expect(third?.bondEntries.map((bond) => bond.amountMinor)).toEqual([9_950]);

    expect(server.requests.map((request) => request.method)).toEqual(["GET", "POST", "POST"]);
    const [, pageSize, next] = server.requests;
    expect(pageSize?.form?.get("__EVENTTARGET")).toBe("ctl00$ContentPlaceHolder1$ddlPageSize");
    expect(pageSize?.form?.get("ctl00$ContentPlaceHolder1$ddlPageSize")).toBe("30");
    expect(pageSize?.form?.get("__VIEWSTATE")).toBe("S0");
    expect(next?.form?.get("ctl00$ContentPlaceHolder1$cmdNext")).toBe("Next");
    expect(next?.form?.get("__VIEWSTATE")).toBe("S2");
  });

  it("drops demographics, addresses, agencies, photos, and arrest dates", async () => {
    const result = await runSourceAdapter(adapter(rosterServer().fetch), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.bookings[0]?.bookingIdentifier).toBeNull();
    expect(result.snapshot.bookings[0]?.bookedAt).toBeNull();
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "99 years",
      "Synthetic Town",
      "Synthetic Agency",
      "GetPhoto",
      "1/1/2000"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("accepts only an explicit zero total as valid empty", async () => {
    const empty = rosterServer([]);
    const result = await runSourceAdapter(adapter(empty.fetch), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emptyResult.kind).toBe("valid_empty");
    expect(result.snapshot.recordCount).toBe(0);
    expect(empty.requests).toHaveLength(1);
  });

  it("starts over when the roster changes between pages, then fails closed", async () => {
    let crawls = 0;
    const flaky = rosterServer(PEOPLE, (request, html) => {
      if (!request.form) crawls += 1;
      return crawls === 1 && request.form?.get("ctl00$ContentPlaceHolder1$cmdNext")
        ? html.replace("out of 32 total", "out of 33 total")
        : html;
    });
    const recovered = await runSourceAdapter(adapter(flaky.fetch), context());
    expect(recovered.ok).toBe(true);
    expect(crawls).toBe(2);

    const broken = rosterServer(PEOPLE, (request, html) =>
      request.form?.get("ctl00$ContentPlaceHolder1$cmdNext")
        ? html.replace(PEOPLE[30]!.name, "TESTER, SOMEONE ELSE - TEST ONLY")
        : html
    );
    const failed = await runSourceAdapter(adapter(broken.fetch), context());
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.failure.diagnosticCode).toBe("SHARP_COUNTY_AR_ROSTER_CHANGED_DURING_CRAWL");
  });

  it("fails closed when paging stops advancing", async () => {
    const stuck = rosterServer();
    let posts = 0;
    const repeating = async (input: string, init?: RequestInit) => {
      if (init?.body instanceof URLSearchParams) {
        posts += 1;
        init.body.delete("ctl00$ContentPlaceHolder1$cmdNext");
      }
      return stuck.fetch(input, init);
    };
    // A post that lands back on the first page repeats people instead of reaching the rest.
    const result = await runSourceAdapter(adapter(repeating), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("SHARP_COUNTY_AR_ROSTER_CHANGED_DURING_CRAWL");
    expect(posts).toBe(6);
  });

  it("fails closed on a card count, charge, or bond it cannot read", async () => {
    const cases: [(html: string) => string, string][] = [
      [(html) => html.replace("10 inmates shown", "11 inmates shown"), "RECORD_COUNT_MISMATCH"],
      [
        (html) => html.replace('<th scope="col">Charges</th>', "<th>Counts</th>"),
        "CARD_STRUCTURE_CHANGED"
      ],
      [(html) => html.replace("$1,250.00", "Cash only"), "BOND_UNREADABLE"],
      [(html) => html.replace(/9:00:00 AM/, "sometime"), "INVALID_RECORD_IDENTITY"]
    ];
    for (const [tweak, code] of cases) {
      const result = await runSourceAdapter(
        adapter(rosterServer(PEOPLE, (_request, html) => tweak(html)).fetch),
        context()
      );
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`SHARP_COUNTY_AR_${code}`);
    }
  });

  it("fails closed when the page is not the Sharp County roster", async () => {
    const result = await runSourceAdapter(
      adapter(
        rosterServer(PEOPLE, (_request, html) =>
          html.replace(">Sharp County Sheriff<", ">Another County Sheriff<")
        ).fetch
      ),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("SHARP_COUNTY_AR_SOURCE_IDENTITY_MISMATCH");
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter(rosterServer().fetch),
      context("https://www.myr2m.com/stonecoroster/")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("SHARP_COUNTY_AR_SOURCE_URL_MISMATCH");
  });
});
