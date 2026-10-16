import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  POLK_COUNTY_ADAPTER_KEY,
  POLK_COUNTY_CURRENT_SOURCE_URL,
  createPolkCountySourceAdapter,
  type PolkRosterIdFactory
} from "./polk-county.js";

type SyntheticCase = Readonly<{ title: string; bailType: string; charges?: readonly string[] }>;
type SyntheticInmate = Readonly<{
  name: string;
  bookDate: string;
  bookingNumber: string;
  location: string;
  cases: readonly SyntheticCase[];
}>;

const ALPHA: SyntheticInmate = {
  name: "TESTER, ALPHA",
  bookDate: "01/01/2000 09:00 AM",
  bookingNumber: "200000001",
  location: "PCJ",
  cases: [
    {
      title: "Case FECR000001",
      bailType: "CASH / SURETY",
      charges: ["F FELD 999.26(1)  SYNTHETIC OFFENSE ALPHA", "M  999.8B  SYNTHETIC OFFENSE BETA"]
    },
    {
      title: "Case DALLAS CO 0001",
      bailType: "NO BAIL",
      charges: ["O OTHR 999.11  SYNTHETIC HOLD"]
    },
    {
      title: "Case NTA0000001",
      bailType: "CLEARED",
      charges: ["O NSCH 999.218(1)  CLEARED OFFENSE"]
    },
    { title: "Case", bailType: "CLEARED" }
  ]
};
const BETA: SyntheticInmate = {
  name: "TESTER, BETA",
  bookDate: "01/01/2000 10:00 AM",
  bookingNumber: "200000002",
  location: "PCJ",
  cases: [{ title: "Case AGCR000002", bailType: "CASH" }]
};
const GAMMA: SyntheticInmate = {
  name: "TESTER, GAMMA",
  bookDate: "01/01/2000 11:00 AM",
  bookingNumber: "200000003",
  location: "OTHER",
  cases: [{ title: "Case SRCR000003", bailType: "CASH", charges: ["S 999.1  ELSEWHERE"] }]
};
const DELTA: SyntheticInmate = {
  name: "TESTER, DELTA",
  bookDate: "01/01/2000 12:00 PM",
  bookingNumber: "200000004",
  location: "PCJ",
  cases: [{ title: "Case SRCR000004", bailType: "CASH", charges: ["S 999.4  LATE BOOKING"] }]
};

function context(sourceUrl: string = POLK_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000a01",
    source: {
      id: "00000000-0000-4000-8000-000000000a02",
      officialInstitutionId: "00000000-0000-4000-8000-000000000a03",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.polkcountyiowa.gov/county-sheriff/",
      relationshipEvidenceUrl:
        "https://www.polkcountyiowa.gov/county-sheriff/detention/jail-and-arrest-information/",
      evidenceDescription: "Synthetic Polk County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: POLK_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-polk-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): PolkRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 2_600;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html" } });
}

let tokenSequence = 0;
/** The site issues a fresh detail token on every list request. */
function token(person: SyntheticInmate): string {
  tokenSequence += 1;
  return `${Buffer.from(person.bookingNumber).toString("base64url")}x${"A".repeat(30)}${tokenSequence}`;
}

function listPage(
  people: readonly SyntheticInmate[],
  tokens: Map<string, SyntheticInmate>
): string {
  const rows = people
    .map((person) => {
      const value = token(person);
      tokens.set(value, person);
      return `<tr><td><a href="/Inmates/Detail/${value}">View</a></td><td>${person.name}</td><td>99</td><td>${person.bookDate}</td></tr>`;
    })
    .join("");
  return `<html><head><title>Current Inmates - Polk Inmates</title></head><body>
    <table><tr><td></td><th scope="col">Name</th><th scope="col">Age</th><th scope="col">Book Date</th></tr>${rows}</table>
  </body></html>`;
}

function detailPage(person: SyntheticInmate, name = person.name): string {
  const cases = person.cases
    .map(
      (
        item
      ) => `<div class="card"><div class="card-header"><h2 class="card-title">${item.title}</h2></div>
      <div class="card-body"><table class="table table-sm"><tbody>
        <tr><th scope="row">Case Number</th><td>SYNTHETIC-CASE</td></tr>
        <tr><th scope="row">Arrest Agency</th><td>SYNTHETIC AGENCY</td></tr>
        <tr><th scope="row">Bail Amount</th><td>$1.00</td></tr>
        <tr><th scope="row">Bail Type</th><td>${item.bailType}</td></tr>
      </tbody></table>
      ${
        item.charges
          ? `<h3>Charges</h3><table class="table w-100"><thead><tr><th>Charge Number</th><th>Charge Count</th><th>Charge Details</th></tr></thead><tbody>${item.charges
              .map((charge, index) => `<tr><td>${index + 1}</td><td>1</td><td>${charge}</td></tr>`)
              .join("")}</tbody></table>`
          : ""
      }</div></div>`
    )
    .join("");
  return `<html><head><title>Inmate Details - Polk Inmates</title></head><body>
    <div class="card"><h1 class="card-title">Inmate Details</h1><table class="table table-sm"><tbody>
      <tr><th scope="row">Name</th><td>${name}</td></tr>
      <tr><th scope="row">Inmate Number</th><td>SYNTHETIC-INMATE</td></tr>
      <tr><th scope="row">Race</th><td>X</td></tr>
      <tr><th scope="row">Holding Location</th><td>${person.location}</td></tr>
      <tr><th scope="row">Booking Number</th><td>${person.bookingNumber}</td></tr>
    </tbody></table></div>${cases}</body></html>`;
}

type Server = { fetch: (input: string) => Promise<Response>; requests: string[] };

function server(
  lists: readonly (readonly SyntheticInmate[])[],
  detail: (person: SyntheticInmate) => Response = (person) => html(detailPage(person))
): Server {
  const requests: string[] = [];
  const tokens = new Map<string, SyntheticInmate>();
  let listCalls = 0;
  return {
    requests,
    fetch: async (input) => {
      requests.push(input);
      if (input === POLK_COUNTY_CURRENT_SOURCE_URL) {
        const people = lists[Math.min(listCalls, lists.length - 1)]!;
        listCalls += 1;
        return html(listPage(people, tokens));
      }
      const person = tokens.get(input.split("/Inmates/Detail/")[1] ?? "");
      return person ? detail(person) : html("missing", 404);
    }
  };
}

function adapter(source: Server) {
  return createPolkCountySourceAdapter({
    fetch: source.fetch,
    facilityId: "00000000-0000-4000-8000-000000000a04",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Polk County, Iowa source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(POLK_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("keeps Polk County Jail inmates with charges from open cases only", async () => {
    const source = server([[ALPHA, BETA, GAMMA]]);
    const result = await runSourceAdapter(adapter(source), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier?.value,
        booking.charges.map((charge) => [charge.statuteCode, charge.description])
      ])
    ).toEqual([
      [
        "TESTER, ALPHA",
        "200000001",
        [
          ["999.26(1)", "SYNTHETIC OFFENSE ALPHA"],
          ["999.8B", "SYNTHETIC OFFENSE BETA"],
          ["999.11", "SYNTHETIC HOLD"]
        ]
      ],
      ["TESTER, BETA", "200000002", []]
    ]);
    // List, three details, then the list again to confirm nobody is missing.
    expect(source.requests).toHaveLength(5);
  });

  it("drops ages, physical details, inmate numbers, cases, agencies, and bail", async () => {
    const result = await runSourceAdapter(adapter(server([[ALPHA, BETA]])), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "SYNTHETIC-INMATE",
      "SYNTHETIC-CASE",
      "SYNTHETIC AGENCY",
      "$1.00",
      "CLEARED OFFENSE"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("reads new bookings found on the second list and drops people released meanwhile", async () => {
    const source = server([
      [ALPHA, BETA],
      [ALPHA, DELTA],
      [ALPHA, DELTA]
    ]);
    const result = await runSourceAdapter(adapter(source), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.bookings.map((booking) => booking.person.displayName)).toEqual([
      "TESTER, ALPHA",
      "TESTER, DELTA"
    ]);
  });

  it("fails closed when the list keeps changing", async () => {
    const people = [ALPHA, BETA, DELTA];
    const lists = Array.from({ length: 6 }, (_, index) => [
      { ...people[index % 3]!, bookDate: `01/0${index + 1}/2000 09:00 AM` }
    ]);
    const result = await runSourceAdapter(adapter(server(lists)), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("POLK_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
  });

  it("fails closed on a changed list, detail identity, case layout, or empty roster", async () => {
    const cases: [Server, string][] = [
      [
        {
          ...server([[ALPHA]]),
          fetch: async () => html("<html><head><title>Other</title></head></html>")
        },
        "SOURCE_IDENTITY_MISMATCH"
      ],
      [
        server([[ALPHA]], (person) => html(detailPage(person, "SOMEONE, ELSE"))),
        "INVALID_RECORD_IDENTITY"
      ],
      [
        server([[ALPHA]], (person) =>
          html(detailPage(person).replace("<th>Charge Details</th>", "<th>Offense</th>"))
        ),
        "CASE_STRUCTURE_CHANGED"
      ],
      [
        server([[ALPHA, { ...BETA, bookingNumber: ALPHA.bookingNumber }]]),
        "DUPLICATE_BOOKING_NUMBER"
      ],
      [server([[GAMMA]]), "ROSTER_EMPTY"]
    ];
    for (const [source, code] of cases) {
      const result = await runSourceAdapter(adapter(source), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`POLK_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved list", async () => {
    const result = await runSourceAdapter(
      adapter(server([[ALPHA]])),
      context("https://polkinmates.polkcountyiowa.gov/Inmates/Bookings/Previous24Hours")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("POLK_COUNTY_SOURCE_URL_MISMATCH");
  });
});
