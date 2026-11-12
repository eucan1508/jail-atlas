import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  PULASKI_COUNTY_AR_ADAPTER_KEY,
  PULASKI_COUNTY_AR_CURRENT_SOURCE_URL,
  createPulaskiCountyArSourceAdapter,
  formatPulaskiCharge
} from "./pulaski-county-ar.js";

const INSTANCE = "01SYNTHETICINSTANCE0000000";

function context(sourceUrl: string = PULASKI_COUNTY_AR_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000801",
    source: {
      id: "00000000-0000-4000-8000-000000000802",
      officialInstitutionId: "00000000-0000-4000-8000-000000000803",
      sourceUrl,
      sourceType: "officially_linked_vendor",
      officialInstitutionUrl: "https://pcso.org/",
      relationshipEvidenceUrl: "https://pcso.org/",
      evidenceDescription: "Synthetic Pulaski County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: PULASKI_COUNTY_AR_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-pulaski-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

type SyntheticInmate = Readonly<{
  so: string;
  name: string;
  charges: readonly (readonly [string, string | null])[];
}>;

function inmate(entry: SyntheticInmate) {
  return {
    id: entry.so,
    soNumber: entry.so,
    IsReleased: false,
    dateOfBirth: "1900-01-01",
    race: "Synthetic Race",
    name: { fullName: entry.name },
    arrests: [
      {
        arrestingAgency: "Synthetic Agency",
        charges: entry.charges.map(([description, degree]) => ({
          caseNumber: "SYN-1",
          statute: { description, degree }
        }))
      }
    ],
    bonds: [{ type: "Surety Bond", amount: 98765 }]
  };
}

function adapter(
  pages: readonly (readonly SyntheticInmate[])[],
  options: { total?: number; totals?: readonly number[]; siteTitle?: string } = {}
) {
  const requested: string[] = [];
  let call = 0;
  const total = options.total ?? pages.flat().length;
  const source = createPulaskiCountyArSourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      if (input === PULASKI_COUNTY_AR_CURRENT_SOURCE_URL) {
        return new Response(
          JSON.stringify({
            instanceId: INSTANCE,
            alias: "arpulaskicounty",
            branding: { siteTitle: options.siteTitle ?? "Pulaski County Regional Detention Center" }
          })
        );
      }
      const pageNumber = Number(new URL(input).searchParams.get("page-number"));
      const pageTotal = options.totals?.[call] ?? total;
      call += 1;
      return new Response(
        JSON.stringify({
          inmates: (pages[pageNumber - 1] ?? []).map(inmate),
          pagination: { total: pageTotal, pageSize: 100, pageNumber }
        })
      );
    },
    facilityId: "00000000-0000-4000-8000-000000000804",
    createId: (() => {
      let sequence = 0;
      return () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    })()
  });
  return { source, requested };
}

const alpha: SyntheticInmate = {
  so: "900001",
  name: "TESTER, ALPHA SYNTHETIC",
  charges: [
    ["SYNTHETIC THEFT BY RECEIVING(FD)", "FD"],
    [
      "Warrant: FAILURE TO APPEAR- FELONY warrant SYN-24-1 issued by Synthetic Sheriff's Office, A",
      "Z"
    ],
    ["SYNTHETIC FAILURE TO APPEAR (MISDEMEANOR)", "M"]
  ]
};
const beta: SyntheticInmate = {
  so: "900002",
  name: "TESTER, BETA",
  charges: [["HOLD FOR COURT", "Z"]]
};

describe("Pulaski County, Arkansas source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(PULASKI_COUNTY_AR_ADAPTER_KEY)).toBe(false);
  });

  it("reads every page and keeps names and charges, not birth dates, agencies, or bonds", async () => {
    const { source, requested } = adapter([[alpha], [beta]], { total: 2 });
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(requested).toHaveLength(3);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.charges.map((charge) => charge.description),
        booking.bondEntries.length
      ])
    ).toEqual([
      [
        "TESTER, ALPHA SYNTHETIC",
        [
          "SYNTHETIC THEFT BY RECEIVING (Class D Felony)",
          "FAILURE TO APPEAR- FELONY warrant",
          "SYNTHETIC FAILURE TO APPEAR (MISDEMEANOR)"
        ],
        0
      ],
      ["TESTER, BETA", ["HOLD FOR COURT"], 0]
    ]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "1900-01-01",
      "Synthetic Race",
      "Synthetic Agency",
      "98765",
      "SYN-24-1"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("starts over when the total changes mid-crawl, then fails closed if it keeps changing", async () => {
    const recovered = await runSourceAdapter(
      adapter([[alpha], [beta]], { total: 2, totals: [2, 3, 2, 2] }).source,
      context()
    );
    expect(recovered.ok).toBe(true);
    const failed = await runSourceAdapter(
      adapter([[alpha], [beta]], { totals: [2, 3, 2, 3, 2, 3] }).source,
      context()
    );
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.failure.diagnosticCode).toBe("PULASKI_COUNTY_AR_ROSTER_CHANGED_DURING_CRAWL");
    }
  });

  it("fails closed on a short list, another instance, an empty list, or a bad URL", async () => {
    const cases: [ReturnType<typeof adapter>, string, AdapterContext?][] = [
      [adapter([[alpha]], { total: 2 }), "PULASKI_COUNTY_AR_ROSTER_TOTAL_MISMATCH"],
      [
        adapter([[alpha]], { siteTitle: "Synthetic Jail" }),
        "PULASKI_COUNTY_AR_SOURCE_IDENTITY_MISMATCH"
      ],
      [adapter([[]]), "PULASKI_COUNTY_AR_ROSTER_EMPTY"],
      [
        adapter([[alpha]]),
        "PULASKI_COUNTY_AR_SOURCE_URL_MISMATCH",
        context("https://example.test/")
      ]
    ];
    for (const [{ source }, code, runContext] of cases) {
      const result = await runSourceAdapter(source, runContext ?? context());
      expect(result.ok, code).toBe(false);
      if (!result.ok) expect(result.failure.diagnosticCode, code).toBe(code);
    }
  });

  it("names the offense class once and keeps only a warrant's type", () => {
    expect(formatPulaskiCharge("SYNTHETIC OFFENSE(FB)", "FB")).toBe(
      "SYNTHETIC OFFENSE (Class B Felony)"
    );
    expect(formatPulaskiCharge("SYNTHETIC OFFENSE (FELONY)", "F")).toBe(
      "SYNTHETIC OFFENSE (FELONY)"
    );
    expect(formatPulaskiCharge("SYNTHETIC HOLD", "Z")).toBe("SYNTHETIC HOLD");
    expect(formatPulaskiCharge("Warrant: PROBATION REVOCATION warrant SYN-1", "Z")).toBe(
      "PROBATION REVOCATION warrant"
    );
    expect(() => formatPulaskiCharge("SYNTHETIC OFFENSE", "QQ")).toThrow("CHARGE_DEGREE_UNKNOWN");
  });
});
