import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  BENTON_COUNTY_ADAPTER_KEY,
  BENTON_COUNTY_CURRENT_SOURCE_URL,
  BENTON_COUNTY_LOOKUP_URL,
  cleanBentonDescription,
  createBentonCountySourceAdapter,
  type BentonRosterIdFactory
} from "./benton-county.js";

const INSTANCE = "SYNTHETICINSTANCE0000000001";

type SyntheticInmate = Readonly<{
  soNumber: string;
  fullName: string;
  charges: readonly (readonly [description: string, degree: string])[];
  bonds: readonly { type: string; amount?: number }[];
  released?: boolean;
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    soNumber: "00J0001",
    fullName: "TESTER, ALPHA TEST",
    charges: [
      ["Synthetic Offense Alpha", "F"],
      ["Synthetic Offense Beta", "G"]
    ],
    bonds: [{ type: "Conditional", amount: 3000 }, { type: "Not Bondable" }]
  },
  {
    soNumber: "00J0002",
    fullName: "TESTER, BETA",
    charges: [["Synthetic Offense Gamma", "M"]],
    bonds: []
  }
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function inmate(person: SyntheticInmate) {
  const charges = person.charges.map(([description, degree]) => ({
    statute: { description, degree }
  }));
  return {
    id: person.soNumber,
    soNumber: person.soNumber,
    IsReleased: person.released ?? false,
    name: { fullName: person.fullName },
    age: 99,
    race: "Synthetic",
    eyeColor: "Synthetic",
    imageServiceClientId: 999999,
    arrests: [{ charges, arrestingAgency: "Synthetic Police Department", ageAtArrest: 99 }],
    bonds: person.bonds.map((bond) => ({ ...bond, charges }))
  };
}

type Server = { fetch: (input: string) => Promise<Response>; requests: string[] };

function server(
  people: readonly SyntheticInmate[] = inmates,
  overrides: { lookup?: unknown; page?: (pageNumber: number) => unknown; pageSize?: number } = {}
): Server {
  const requests: string[] = [];
  const pageSize = overrides.pageSize ?? 100;
  return {
    requests,
    fetch: async (input) => {
      requests.push(input);
      if (input === BENTON_COUNTY_LOOKUP_URL) {
        return json(
          overrides.lookup ?? {
            instanceId: INSTANCE,
            alias: "bentoncountymn",
            branding: { siteTitle: "Benton County Jail (Minnesota)" }
          }
        );
      }
      const url = new URL(input);
      const pageNumber = Number(url.searchParams.get("page-number"));
      const custom = overrides.page?.(pageNumber);
      if (custom) return json(custom);
      const slice = people.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
      return json({
        inmates: slice.map(inmate),
        pagination: { total: people.length, pageSize: 100, pageNumber }
      });
    }
  };
}

function context(sourceUrl: string = BENTON_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.bentoncountymn.gov/220/Jail-Division",
      relationshipEvidenceUrl: "https://www.bentoncountymn.gov/220/Jail-Division",
      evidenceDescription: "Synthetic Benton County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: BENTON_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-benton-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): BentonRosterIdFactory {
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
  return createBentonCountySourceAdapter({
    fetch: source.fetch,
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Benton County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(BENTON_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every listed person with charge levels and bonds", async () => {
    const source = server();
    const result = await runSourceAdapter(adapter(source), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.charges.map((charge) => charge.description),
        booking.bondEntries.map((bond) =>
          bond.state === "monetary" ? [bond.state, bond.amountMinor, bond.note] : [bond.state]
        )
      ])
    ).toEqual([
      [
        "TESTER, ALPHA TEST",
        ["Synthetic Offense Alpha (Felony)", "Synthetic Offense Beta (Gross Misdemeanor)"],
        [["monetary", 300_000, "Conditional"], ["no_bond"]]
      ],
      ["TESTER, BETA", ["Synthetic Offense Gamma (Misdemeanor)"], []]
    ]);
    expect(source.requests[1]).toContain(
      `/instances/${INSTANCE}/inmates?page-size=100&page-number=1`
    );
  });

  it("drops ages, demographics, photos, and arresting agencies", async () => {
    const result = await runSourceAdapter(adapter(server()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["Synthetic Police Department", 'Synthetic"', "999999", "00J0001"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("drops a cut-off offense category from a description at the length limit", () => {
    const charge =
      "Drugs - 5th Degree - Possess Schedule 1,2,3,4 or paraphernalia residual - Not cannabis/hemp";
    const cut = `${charge}-Drug/Nar`;
    expect(cut).toHaveLength(100);
    expect(cleanBentonDescription(cut)).toBe(charge);
    expect(cleanBentonDescription("Short Offense-Category")).toBe("Short Offense-Category");
  });

  it("fails closed on a wrong instance, a changed list, released people, or an empty jail", async () => {
    const cases: [Server, string][] = [
      [
        server(inmates, {
          lookup: {
            instanceId: INSTANCE,
            alias: "bentoncountymn",
            branding: { siteTitle: "Other" }
          }
        }),
        "SOURCE_IDENTITY_MISMATCH"
      ],
      [server(inmates, { page: () => ({ inmates: "x" }) }), "LIST_STRUCTURE_CHANGED"],
      [
        server(inmates, {
          page: (pageNumber) => ({
            inmates: pageNumber === 1 ? inmates.map(inmate) : [],
            pagination: { total: 5, pageSize: 100, pageNumber }
          })
        }),
        "ROSTER_TOTAL_MISMATCH"
      ],
      [server([{ ...inmates[0]!, released: true }]), "LIST_SCOPE_CHANGED"],
      [server([{ ...inmates[1]!, charges: [["Synthetic", "Z"]] }]), "CHARGE_DEGREE_UNKNOWN"],
      [server([inmates[0]!, inmates[0]!]), "DUPLICATE_SO_NUMBER"],
      [server([]), "ROSTER_EMPTY"]
    ];
    for (const [source, code] of cases) {
      const result = await runSourceAdapter(adapter(source), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`BENTON_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved list", async () => {
    const result = await runSourceAdapter(
      adapter(server()),
      context("https://correctionsrecordssearch.com/bentoncountymn")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("BENTON_COUNTY_SOURCE_URL_MISMATCH");
  });
});
