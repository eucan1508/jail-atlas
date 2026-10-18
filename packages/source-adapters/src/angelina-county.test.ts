import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  ANGELINA_COUNTY_ADAPTER_KEY,
  ANGELINA_COUNTY_CURRENT_SOURCE_URL,
  createAngelinaCountySourceAdapter,
  type AngelinaRosterIdFactory
} from "./angelina-county.js";

type SyntheticCharge = readonly [offense: string, degree: string, bond: string];
type SyntheticInmate = Readonly<{
  jailId: string;
  listName: string;
  detailName: string;
  charges: readonly SyntheticCharge[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    jailId: "900001",
    listName: "TESTER, ALPHA TEST",
    detailName: "ALPHA TEST TESTER",
    charges: [
      ["SYNTHETIC OFFENSE ALPHA", "Third Degree Felony", "$20,000 (Bail/Attorney)"],
      ["SYNTHETIC WARRANT", "Not Applicable", "$0"]
    ]
  },
  {
    jailId: "900002",
    listName: "TESTER, BETA, Jr.",
    detailName: "BETA TESTER",
    charges: [["SYNTHETIC OFFENSE BETA", "Class C Misdemeanor", "$500 (Misd Class C)"]]
  }
];

function listPage(people: readonly SyntheticInmate[], total: number = people.length): string {
  const rows = people
    .map(
      (person) =>
        `<tr onclick="location.href='/injail/inmate/?jailid=${person.jailId}'"><td>${person.listName}</td><td>X</td><td>5 Ft.</td><td>100 Lbs.</td><td>X</td><td>X</td><td>01/02/2000</td></tr>`
    )
    .join("");
  return `<html><head><title>Jail Roster &#8211; Angelina County</title></head><body>
    <div class="jail-roster"><div class="wrap"><h2>Total Inmates: ${total}</h2><table class="table">
    <thead><tr><th>Name</th><th>Sex</th><th>Height</th><th>Weight</th><th>Eye Color</th><th>Hair Color</th><th>Booking Date</th></tr></thead>
    <tbody>${rows}</tbody></table></div></div></body></html>`;
}

function detailPage(person: SyntheticInmate | null): string {
  const rows = (person?.charges ?? [])
    .map(
      ([offense, degree, bond]) =>
        `<tr><td>${offense}</td><td>${degree}</td><td>${bond}</td><td>Local Warrant</td><td>Synthetic Agency</td></tr>`
    )
    .join("");
  return `<html><body><div class="inmate-information"><div class="inmate-details"><h2>${person?.detailName ?? ""}</h2>
    <p>Age: 99<br>Race: Synthetic<br></p></div></div>
    <table class="table table-mobile-full"><thead><tr><th>Offense</th><th>Degree</th><th>Bond Amount</th><th>Hold Reason</th><th>Arresting Agency</th></tr><tr></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
}

function context(sourceUrl: string = ANGELINA_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.angelinacounty.net/sheriff/",
      relationshipEvidenceUrl: "https://www.angelinacounty.net/sheriff/",
      evidenceDescription: "Synthetic Angelina County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: ANGELINA_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-angelina-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): AngelinaRosterIdFactory {
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
  requests: string[];
};

function server(
  people: readonly SyntheticInmate[] = inmates,
  overrides: {
    list?: (call: number) => string | undefined;
    detail?: (jailId: string, call: number) => string | undefined;
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
      if (url.pathname === "/injail/") {
        listCalls += 1;
        return new Response(overrides.list?.(listCalls) ?? listPage(people));
      }
      detailCalls += 1;
      const jailId = url.searchParams.get("jailid") ?? "";
      const custom = overrides.detail?.(jailId, detailCalls);
      if (custom) return new Response(custom);
      return new Response(detailPage(people.find((person) => person.jailId === jailId) ?? null));
    }
  };
}

function adapter(source: Server) {
  return createAngelinaCountySourceAdapter({
    fetch: source.fetch,
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Angelina County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(ANGELINA_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every listed person's charges with each charge's bond", async () => {
    const source = server();
    const result = await runSourceAdapter(adapter(source), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(2);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier,
        booking.charges.map((charge) => charge.description),
        booking.bondEntries.map((bond) =>
          bond.state === "monetary" ? [bond.amountMinor, bond.note] : bond.state
        )
      ])
    ).toEqual([
      [
        "TESTER, ALPHA TEST",
        null,
        ["SYNTHETIC OFFENSE ALPHA (Third Degree Felony)", "SYNTHETIC WARRANT"],
        [
          [2_000_000, "Bail/Attorney"],
          [0, "The source displays $0; this is not interpreted as no bond."]
        ]
      ],
      [
        "TESTER, BETA, Jr.",
        null,
        ["SYNTHETIC OFFENSE BETA (Class C Misdemeanor)"],
        [[50_000, "Misd Class C"]]
      ]
    ]);
    // List, two details, then the list again to confirm nothing changed.
    expect(source.requests).toHaveLength(4);
  });

  it("drops ages, races, physical descriptions, hold reasons, and agencies", async () => {
    const result = await runSourceAdapter(adapter(server()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["Synthetic Agency", "Local Warrant", "Age", "100 Lbs.", "01/02/2000"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("starts over when someone is released during the crawl, then fails closed", async () => {
    const recovered = await runSourceAdapter(
      adapter(
        server(inmates, {
          detail: (jailId, call) =>
            call === 1 && jailId === "900001" ? detailPage(null) : undefined
        })
      ),
      context()
    );
    expect(recovered.ok).toBe(true);

    const failed = await runSourceAdapter(
      adapter(
        server(inmates, {
          list: (call) => (call % 2 === 0 ? listPage(inmates.slice(0, 1)) : undefined)
        })
      ),
      context()
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.failure.diagnosticCode).toBe("ANGELINA_COUNTY_ROSTER_CHANGED_DURING_CRAWL");
  });

  it("fails closed on a changed page, a wrong total, a mismatched name, or an empty roster", async () => {
    const cases: [Server, string][] = [
      [
        server(inmates, { list: () => "<html><body>Maintenance</body></html>" }),
        "SOURCE_IDENTITY_MISMATCH"
      ],
      [server(inmates, { list: () => listPage(inmates, 3) }), "ROSTER_TOTAL_MISMATCH"],
      [server([inmates[0]!, inmates[0]!]), "DUPLICATE_JAIL_ID"],
      [
        server(inmates, {
          detail: (jailId) =>
            jailId === "900002"
              ? detailPage({ ...inmates[1]!, detailName: "SOMEONE ELSE" })
              : undefined
        }),
        "INVALID_RECORD_IDENTITY"
      ],
      [
        server([{ ...inmates[1]!, charges: [["SYNTHETIC", "Class C Misdemeanor", "Unknown"]] }]),
        "BOND_UNREADABLE"
      ],
      [
        server(inmates, {
          detail: () => detailPage(inmates[0]!).replace("<th>Degree</th>", "<th>Level</th>")
        }),
        "CHARGE_COLUMNS_CHANGED"
      ],
      [server([]), "ROSTER_EMPTY"]
    ];
    for (const [source, code] of cases) {
      const result = await runSourceAdapter(adapter(source), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`ANGELINA_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter(server()),
      context("https://www.angelinacounty.net/sheriff/")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("ANGELINA_COUNTY_SOURCE_URL_MISMATCH");
  });
});
