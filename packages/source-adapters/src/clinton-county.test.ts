import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  CLINTON_COUNTY_ADAPTER_KEY,
  CLINTON_COUNTY_CURRENT_SOURCE_URL,
  CLINTON_COUNTY_LIST_URL,
  CLINTON_COUNTY_TOKEN_URL,
  createClintonCountySourceAdapter,
  parseClintonHoldReason,
  type ClintonRosterIdFactory
} from "./clinton-county.js";

type SyntheticRecord = {
  name: string;
  hold_reasons: string;
  is_juvenile: boolean;
  release_date: string | null;
  arrest_date: string | null;
  dob: number;
  mugshot: string;
  race: string;
  sex: string;
  cell_block: string;
  held_for_agency: string;
};

function record(overrides: Partial<SyntheticRecord> = {}): SyntheticRecord {
  return {
    name: "TESTER, ALPHA SYNTHETIC",
    hold_reasons:
      "Charge: 714.2(5) - Synthetic Theft 5th (Completed); Arrest Date 01/02/2000; Bond - Cash Only, $300.00; Set By Judge;",
    is_juvenile: false,
    release_date: null,
    arrest_date: "Sun, 02 Jan 2000 03:04:00 GMT",
    dob: 99,
    mugshot: "c3ludGhldGlj",
    race: "Unknown",
    sex: "Unknown",
    cell_block: "",
    held_for_agency: "Synthetic Police Department",
    ...overrides
  };
}

const roster: SyntheticRecord[] = [
  record(),
  record({
    name: "TESTER-DOE, BETA",
    arrest_date: "Mon, 03 Jan 2000 09:00:00 GMT",
    hold_reasons: [
      "Warrant: Bench warrant W0000001 issued by Clinton, IA (908.11 - Violation Of Probation - 1985); Arrest Date 01/03/2000; Bond - No Bond, $0.00; Set By Warrant;",
      "Warrant: Arrest warrant  (321J.2(2)(a) - Synthetic Operating (SRMS)); Bond - Cash / Multiple Cases; Set By Judge;",
      "Sentenced: Serving 4 days - Concurrent; Arrest Date 01/03/2000; Bond - $0.00;",
      "Hold-Out of County for SYNTHETIC COUNTY SHERIFF&#39;S OFFICE; Arrest Date 01/03/2000; Bond - No Bond;"
    ].join("<br />")
  }),
  record({ name: "TESTER, RELEASED", release_date: "Tue, 04 Jan 2000 13:11:00 GMT" }),
  record({ name: "TESTER, JUVENILE", is_juvenile: true })
];

function context(sourceUrl: string = CLINTON_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000a01",
    source: {
      id: "00000000-0000-4000-8000-000000000a02",
      officialInstitutionId: "00000000-0000-4000-8000-000000000a03",
      sourceUrl,
      sourceType: "officially_linked_vendor",
      officialInstitutionUrl: "https://www.clintoncounty-ia.gov/sheriff/jail",
      relationshipEvidenceUrl: "https://www.clintoncounty-ia.gov/sheriff/jail",
      evidenceDescription: "Synthetic Clinton County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: CLINTON_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    // 03:00 UTC is still the evening before in Clinton, Iowa.
    requestedAt: "2000-01-05T03:00:00.000Z",
    traceId: "synthetic-clinton-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): ClintonRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 0xa10;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${(sequence++).toString(16).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

type Request = { url: string; init: RequestInit | undefined };

function adapter(
  records: unknown[] = roster,
  options: { total?: number; token?: unknown; requests?: Request[] } = {}
) {
  return createClintonCountySourceAdapter({
    fetch: async (input, init) => {
      options.requests?.push({ url: input, init });
      if (input === CLINTON_COUNTY_TOKEN_URL) {
        return new Response(JSON.stringify(options.token ?? { message: "CSRF token set" }));
      }
      return new Response(
        JSON.stringify({ records, total_record_count: options.total ?? records.length })
      );
    },
    facilityId: "00000000-0000-4000-8000-000000000a04",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Clinton County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(CLINTON_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("asks for today's custody list after setting the session token", async () => {
    const requests: Request[] = [];
    const result = await runSourceAdapter(adapter(roster, { requests }), context());
    expect(result.ok).toBe(true);
    expect(requests.map((request) => request.url)).toEqual([
      CLINTON_COUNTY_TOKEN_URL,
      CLINTON_COUNTY_LIST_URL
    ]);
    expect(requests[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(requests[1]?.init?.body))).toEqual({
      paging: { start: 0, count: 900 },
      sorting: { sort_by_column_tag: "name", sort_descending: false },
      in_custody: "2000-01-04"
    });
  });

  it("keeps people still held with every hold reason and its bond", async () => {
    const result = await runSourceAdapter(adapter(), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.charges.map((charge) => [
          charge.sourceLabel,
          charge.statuteCode,
          charge.description
        ]),
        booking.bondEntries.map((bond) => [
          bond.sequence,
          bond.state,
          bond.state === "monetary" ? bond.amountMinor : null,
          bond.note
        ])
      ])
    ).toEqual([
      [
        "TESTER, ALPHA SYNTHETIC",
        [["Charge", "714.2(5)", "Synthetic Theft 5th (Completed)"]],
        [[0, "monetary", 30_000, "Cash Only"]]
      ],
      [
        "TESTER-DOE, BETA",
        [
          ["Bench warrant", "908.11", "Violation Of Probation - 1985"],
          ["Arrest warrant", "321J.2(2)(a)", "Synthetic Operating (SRMS)"],
          ["Sentenced", null, "Serving 4 days - Concurrent"],
          ["Hold", null, "Held for SYNTHETIC COUNTY SHERIFF'S OFFICE"]
        ],
        [
          [0, "no_bond", null, null],
          [1, "unknown", null, "Cash / Multiple Cases"],
          [2, "monetary", 0, "The source displays $0.00; this is not interpreted as no bond."],
          [3, "no_bond", null, null]
        ]
      ]
    ]);
  });

  it("drops age, photo, arrest dates, and other personal fields", async () => {
    const result = await runSourceAdapter(adapter(), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "c3ludGhldGlj",
      "01/02/2000",
      "02 Jan 2000",
      "Synthetic Police Department",
      "Arrest Date",
      "Set By",
      "W0000001",
      "TESTER, RELEASED",
      "TESTER, JUVENILE"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("reads each kind of hold reason and refuses one it does not know", () => {
    expect(
      parseClintonHoldReason(
        "Warrant: Failure to Appear warrant W2600576 issued by Clinton, IA (321.561 - DRIVING WHILE BARRED); Arrest Date 10/24/2026; Bond - Cash/Surety, $2000.00; Set By Judge;"
      )
    ).toEqual({
      label: "Failure to Appear warrant",
      statuteCode: "321.561",
      description: "DRIVING WHILE BARRED",
      bond: { type: "Cash/Surety", noBond: false, amountMinor: 200_000 }
    });
    expect(
      parseClintonHoldReason("Charge: 453B.12 - Synthetic Stamp (Completed) - 4 Counts")
    ).toEqual({
      label: "Charge",
      statuteCode: "453B.12",
      description: "Synthetic Stamp (Completed) - 4 Counts",
      bond: null
    });
    for (const entry of [
      "Detainer: Synthetic; Bond - No Bond;",
      "Charge: Synthetic without a statute;",
      "Charge: 714.2(5) - Synthetic; Court Date 01/02/2000;",
      "Charge: 714.2(5) - Synthetic; Bond - No Bond, $500.00;",
      "Charge: 714.2(5) - Synthetic; Bond - Cash Only, $1,000.00;"
    ]) {
      expect(() => parseClintonHoldReason(entry), entry).toThrow();
    }
  });

  it("fails closed on a short, empty, duplicated, or reshaped list", async () => {
    const cases: [ReturnType<typeof adapter>, string][] = [
      [adapter(roster, { total: roster.length + 1 }), "ROSTER_COUNT_MISMATCH"],
      [adapter([]), "ROSTER_EMPTY"],
      [adapter([record({ release_date: "Tue, 04 Jan 2000 13:11:00 GMT" })]), "ROSTER_EMPTY"],
      [adapter([record(), record()]), "DUPLICATE_ROSTER_ENTRY"],
      [adapter([record({ name: "TESTER ALPHA" })]), "NAME_UNREADABLE"],
      [adapter([{ name: "TESTER, ALPHA" }]), "RECORD_SHAPE_CHANGED"],
      [adapter([record({ hold_reasons: "Detainer: Synthetic;" })]), "HOLD_REASON_UNREADABLE"],
      [
        adapter(
          ["A", "B", "C"].map((letter) => record({ name: `TESTER, ${letter}`, hold_reasons: "" }))
        ),
        "HOLD_REASONS_MISSING"
      ],
      [adapter(roster, { token: { message: "Something else" } }), "SESSION_TOKEN_MISSING"]
    ];
    for (const [source, code] of cases) {
      const result = await runSourceAdapter(source, context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`CLINTON_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved portal page", async () => {
    const result = await runSourceAdapter(
      adapter(),
      context("https://www.clintoncounty-ia.gov/sheriff/jail")
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.diagnosticCode).toBe("CLINTON_COUNTY_SOURCE_URL_MISMATCH");
    }
  });
});
