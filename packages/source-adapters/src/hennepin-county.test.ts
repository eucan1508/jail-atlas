import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  HENNEPIN_COUNTY_ADAPTER_KEY,
  HENNEPIN_COUNTY_CURRENT_SOURCE_URL,
  HENNEPIN_COUNTY_API_BASE_URL,
  HENNEPIN_COUNTY_ROSTER_CONFIG_URL,
  createHennepinCountySourceAdapter,
  type HennepinRosterIdFactory
} from "./hennepin-county.js";

// A synthetic key in the shape the site publishes.
const KEY = "f".repeat(32);

type SyntheticCase = readonly [
  clearReason: string | null,
  charges: readonly (readonly [string, string])[]
];
type SyntheticInmate = Readonly<{
  incarcerationId: number;
  bookingNumber: string;
  fullName: string;
  facility: string | null;
  custodyStatus?: number;
  cases: readonly SyntheticCase[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    incarcerationId: 1,
    bookingNumber: "2000000001",
    fullName: "TESTER, ALPHA TEST",
    facility: "Public Safety Facility",
    cases: [
      [null, [["999.11.1(1)", "SYNTHETIC OFFENSE ALPHA"]]],
      ["CASE DISMISSED", [["999.22", "SYNTHETIC OFFENSE BETA"]]]
    ]
  },
  {
    incarcerationId: 2,
    bookingNumber: "2000000002",
    fullName: "TESTER, BETA",
    facility: "City Hall",
    cases: [[null, [["999.33", "SYNTHETIC OFFENSE GAMMA"]]]]
  },
  {
    incarcerationId: 3,
    bookingNumber: "2000000003",
    fullName: "TESTER, GAMMA",
    facility: null,
    cases: [[null, [["999.44", "SYNTHETIC OFFENSE DELTA"]]]]
  }
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function listBody(people: readonly SyntheticInmate[]) {
  return {
    data: people.map((person) => ({
      incarcerationId: person.incarcerationId,
      bookingNumber: person.bookingNumber,
      fullName: person.fullName,
      age: 99,
      custodyStatus: 1,
      arrestedBy: "SYNTHETIC PD",
      receivedDateTime: "2000-01-01T00:00:00"
    })),
    pagination: { totalRecords: people.length, totalPages: 1, pageSize: 3000, activePage: 1 }
  };
}

function detailBody(person: SyntheticInmate) {
  return {
    incarcerationId: person.incarcerationId,
    bookingNumber: person.bookingNumber,
    fullName: person.fullName,
    age: 99,
    custodyStatus: person.custodyStatus ?? 1,
    arrestedBy: "SYNTHETIC PD",
    housingLocationFacility: person.facility,
    inmateNumber: "SYNTHETIC-INMATE-NUMBER",
    cases: person.cases.map(([clearReason, charges]) => ({
      chargedBy: "SYNTHETIC PD",
      caseNumber: "SYNTHETIC-CASE",
      bailOptions: ["$1.00 SYNTHETIC BAIL"],
      clearReason,
      charges: charges.map(([statute, description]) => ({
        statute,
        description,
        severityOfCharge: "Felony",
        chargeStatus: null
      }))
    }))
  };
}

type Server = {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  requests: { url: string; body: string | null }[];
};

function server(
  people: readonly SyntheticInmate[] = inmates,
  overrides: {
    config?: unknown;
    list?: (call: number) => unknown;
    detail?: (id: number, call: number) => Response | undefined;
  } = {}
): Server {
  const requests: Server["requests"] = [];
  let listCalls = 0;
  let detailCalls = 0;
  return {
    requests,
    fetch: async (input, init) => {
      const body = typeof init?.body === "string" ? init.body : null;
      requests.push({ url: input, body });
      if (input === HENNEPIN_COUNTY_ROSTER_CONFIG_URL) {
        return json(
          overrides.config ?? {
            serverBaseUrl: HENNEPIN_COUNTY_API_BASE_URL,
            serverSubscriptionKey: KEY
          }
        );
      }
      if (input.startsWith(HENNEPIN_COUNTY_CURRENT_SOURCE_URL)) {
        listCalls += 1;
        return json(overrides.list?.(listCalls) ?? listBody(people));
      }
      detailCalls += 1;
      const id = Number(new URL(input).pathname.split("/").pop());
      const custom = overrides.detail?.(id, detailCalls);
      if (custom) return custom;
      const person = people.find((candidate) => candidate.incarcerationId === id);
      return person ? json(detailBody(person)) : json({}, 404);
    }
  };
}

function context(sourceUrl: string = HENNEPIN_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.hennepinsheriff.org/jail-warrants/jail",
      relationshipEvidenceUrl: "https://www.hennepinsheriff.org/jail-warrants/jail",
      evidenceDescription: "Synthetic Hennepin County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
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
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-hennepin-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): HennepinRosterIdFactory {
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

function adapter(source: Server) {
  return createHennepinCountySourceAdapter({
    fetch: source.fetch,
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Hennepin County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(HENNEPIN_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("keeps people in the jail's two buildings with their open charges", async () => {
    const source = server();
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
      ["TESTER, ALPHA TEST", "2000000001", [["999.11.1(1)", "SYNTHETIC OFFENSE ALPHA"]]],
      ["TESTER, BETA", "2000000002", [["999.33", "SYNTHETIC OFFENSE GAMMA"]]]
    ]);
    // The site settings, the list, three details, then the list again.
    expect(source.requests).toHaveLength(6);
    const search = source.requests[1]!;
    expect(search.url).toBe(`${HENNEPIN_COUNTY_CURRENT_SOURCE_URL}?subscription-key=${KEY}`);
    expect(JSON.parse(search.body ?? "{}")).toMatchObject({ custodyStatus: 1 });
  });

  it("drops ages, agencies, case numbers, bail options, and inmate numbers", async () => {
    const result = await runSourceAdapter(adapter(server()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "SYNTHETIC PD",
      "SYNTHETIC-CASE",
      "SYNTHETIC BAIL",
      "SYNTHETIC-INMATE-NUMBER",
      "SYNTHETIC OFFENSE BETA"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("starts over when someone is released during the crawl, then fails closed", async () => {
    const recovered = await runSourceAdapter(
      adapter(
        server(inmates, {
          detail: (id, call) =>
            call === 1 && id === 1
              ? json(detailBody({ ...inmates[0]!, custodyStatus: 2 }))
              : undefined
        })
      ),
      context()
    );
    expect(recovered.ok).toBe(true);

    const failed = await runSourceAdapter(
      adapter(
        server(inmates, {
          list: (call) => (call % 2 === 0 ? listBody(inmates.slice(0, 2)) : undefined)
        })
      ),
      context()
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.failure.diagnosticCode).toBe("HENNEPIN_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
  });

  it("fails closed on changed settings, a partial list, a wrong identity, or an empty jail", async () => {
    const cases: [Server, string][] = [
      [
        server(inmates, {
          config: { serverBaseUrl: "https://example.test/api", serverSubscriptionKey: KEY }
        }),
        "CONFIG_CHANGED"
      ],
      [
        server(inmates, {
          list: () => ({ ...listBody(inmates), pagination: { totalRecords: 9, totalPages: 1 } })
        }),
        "LIST_INCOMPLETE"
      ],
      [
        server(inmates, {
          list: () => {
            const body = listBody(inmates);
            body.data[0]!.custodyStatus = 2;
            return body;
          }
        }),
        "LIST_SCOPE_CHANGED"
      ],
      [
        server(inmates, {
          detail: (id) =>
            id === 2 ? json(detailBody({ ...inmates[1]!, fullName: "SOMEONE, ELSE" })) : undefined
        }),
        "INVALID_RECORD_IDENTITY"
      ],
      [
        server(inmates, { detail: (id) => (id === 2 ? json({ cases: "x" }) : undefined) }),
        "DETAIL_STRUCTURE_CHANGED"
      ],
      [server([inmates[2]!]), "ROSTER_EMPTY"]
    ];
    for (const [source, code] of cases) {
      const result = await runSourceAdapter(adapter(source), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`HENNEPIN_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved search", async () => {
    const result = await runSourceAdapter(
      adapter(server()),
      context("https://jailroster.hennepin.us/")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("HENNEPIN_COUNTY_SOURCE_URL_MISMATCH");
  });
});
