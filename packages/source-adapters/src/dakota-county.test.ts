import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  DAKOTA_COUNTY_ADAPTER_KEY,
  DAKOTA_COUNTY_CURRENT_SOURCE_URL,
  createDakotaCountySourceAdapter,
  type DakotaRosterIdFactory
} from "./dakota-county.js";

type SyntheticCharge = readonly [description: string, clearanceReason: string];
type SyntheticInmate = Readonly<{
  bookingNumber: string;
  name: string;
  charges: readonly SyntheticCharge[];
  inJail?: string;
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    bookingNumber: "2000001",
    name: "Tester, Alpha Test",
    charges: [
      ["Synthetic Offense Alpha - FE {999.11.1(1)}", ""],
      ["Synthetic Offense Beta - MS {999.22}", "RPR - Per Judge"],
      ["PAROLE VIOLATION", ""]
    ]
  },
  {
    bookingNumber: "2000002",
    name: "Tester, Beta",
    charges: [["Synthetic Offense Gamma - GM {999.33.2(a)}", ""]]
  },
  {
    bookingNumber: "2000003",
    name: "Tester, Gamma",
    charges: [["Synthetic Offense Delta - MS {999.44}", "Case Dismissed Not Guilty"]]
  }
];

function context(sourceUrl: string = DAKOTA_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://dakotacountymn.gov/residents/public-safety-justice/jail",
      relationshipEvidenceUrl:
        "https://dakotacountymn.gov/residents/public-safety-justice/jail/inmate-search",
      evidenceDescription: "Synthetic Dakota County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: DAKOTA_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-dakota-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): DakotaRosterIdFactory {
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function listBody(people: readonly SyntheticInmate[]) {
  const bookings = people.map((person) => ({
    In_Jail: person.inJail ?? "True",
    Booking_Number: person.bookingNumber,
    Last_Comma_First: person.name,
    DOB: "1/1/1900",
    Sex: "X",
    Race: "X"
  }));
  // The service turns a one-item list into a single object.
  return {
    status: "SUCCESS",
    result: { Bookings: bookings.length === 1 ? bookings[0] : bookings }
  };
}

function detailBody(person: SyntheticInmate) {
  const charges = person.charges.map(([description, clearance]) => ({
    ChargeDescription: description,
    ClearanceReason: clearance,
    ChargeLevel: "XX",
    Court_Number: "SYNTHETIC-COURT-NUMBER",
    ArrestAgency: "Synthetic Agency"
  }));
  return {
    status: "SUCCESS",
    result: {
      Bookings: {
        In_Jail: person.inJail ?? "True",
        Booking_Number: person.bookingNumber,
        Last_Comma_First: person.name,
        DOB: "1/1/1900",
        Arrest_Location: "Synthetic Street",
        colCharges: { Charges: charges.length === 1 ? charges[0] : charges }
      }
    }
  };
}

type Server = {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  requests: string[];
};

function server(
  people: readonly SyntheticInmate[] = inmates,
  overrides: {
    list?: (call: number) => unknown;
    detail?: (bookingNumber: string, call: number) => Response | undefined;
  } = {}
): Server {
  const requests: string[] = [];
  let listCalls = 0;
  let detailCalls = 0;
  return {
    requests,
    fetch: async (input) => {
      requests.push(input);
      const url = new URL(input);
      if (url.searchParams.get("method") === "JailInmateSearch") {
        listCalls += 1;
        return json(overrides.list?.(listCalls) ?? listBody(people));
      }
      detailCalls += 1;
      const bookingNumber = url.searchParams.get("bookingNumber") ?? "";
      const custom = overrides.detail?.(bookingNumber, detailCalls);
      if (custom) return custom;
      const person = people.find((candidate) => candidate.bookingNumber === bookingNumber);
      return person ? json(detailBody(person)) : json({ status: "SUCCESS", result: {} });
    }
  };
}

function adapter(source: Server) {
  return createDakotaCountySourceAdapter({
    fetch: source.fetch,
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Dakota County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(DAKOTA_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every listed booking and keeps only open charges with their statutes", async () => {
    const source = server();
    const result = await runSourceAdapter(adapter(source), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(3);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier?.value,
        booking.charges.map((charge) => [charge.statuteCode, charge.description])
      ])
    ).toEqual([
      [
        "Tester, Alpha Test",
        "2000001",
        [
          ["999.11.1(1)", "Synthetic Offense Alpha - FE"],
          [null, "PAROLE VIOLATION"]
        ]
      ],
      ["Tester, Beta", "2000002", [["999.33.2(a)", "Synthetic Offense Gamma - GM"]]],
      ["Tester, Gamma", "2000003", []]
    ]);
    // List, three details, then the list again to confirm nothing changed.
    expect(source.requests).toHaveLength(5);
  });

  it("drops birth dates, demographics, court numbers, agencies, and addresses", async () => {
    const result = await runSourceAdapter(adapter(server()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "1/1/1900",
      "SYNTHETIC-COURT-NUMBER",
      "Synthetic Agency",
      "Synthetic Street"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("accepts a one-person list sent as a single object", async () => {
    const result = await runSourceAdapter(adapter(server([inmates[1]!])), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(1);
  });

  it("starts over when someone is released during the crawl, then fails closed", async () => {
    const recovering = server(inmates, {
      detail: (bookingNumber, call) =>
        call === 1 && bookingNumber === "2000001"
          ? json({
              status: "SUCCESS",
              result: { Bookings: { ...detailBody(inmates[0]!).result.Bookings, In_Jail: "False" } }
            })
          : undefined
    });
    const recovered = await runSourceAdapter(adapter(recovering), context());
    expect(recovered.ok).toBe(true);

    const shifting = server(inmates, {
      list: (call) => (call % 2 === 0 ? listBody(inmates.slice(0, 2)) : undefined)
    });
    const failed = await runSourceAdapter(adapter(shifting), context());
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.failure.diagnosticCode).toBe("DAKOTA_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
  });

  it("fails closed on a changed list, identity, duplicate, or empty roster", async () => {
    const cases: [Server, string][] = [
      [
        server(inmates, { list: () => ({ status: "ERROR", result: {} }) }),
        "LIST_STRUCTURE_CHANGED"
      ],
      [server([{ ...inmates[0]!, inJail: "False" }, inmates[1]!]), "LIST_SCOPE_CHANGED"],
      [server([inmates[0]!, inmates[0]!]), "DUPLICATE_BOOKING_NUMBER"],
      [
        server(inmates, {
          detail: (bookingNumber) =>
            bookingNumber === "2000002"
              ? json(detailBody({ ...inmates[1]!, name: "Someone, Else" }))
              : undefined
        }),
        "INVALID_RECORD_IDENTITY"
      ],
      [
        server(inmates, {
          detail: (bookingNumber) =>
            bookingNumber === "2000002"
              ? json({ status: "SUCCESS", result: { Bookings: [{}] } })
              : undefined
        }),
        "DETAIL_STRUCTURE_CHANGED"
      ],
      [server([]), "ROSTER_EMPTY"]
    ];
    for (const [source, code] of cases) {
      const result = await runSourceAdapter(adapter(source), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`DAKOTA_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved search", async () => {
    const result = await runSourceAdapter(
      adapter(server()),
      context("https://dakotacountymn.gov/residents/public-safety-justice/jail/inmate-search")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("DAKOTA_COUNTY_SOURCE_URL_MISMATCH");
  });
});
