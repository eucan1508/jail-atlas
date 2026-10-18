import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  CLAY_COUNTY_ADAPTER_KEY,
  CLAY_COUNTY_CURRENT_SOURCE_URL,
  createClayCountySourceAdapter,
  type ClayRosterIdFactory
} from "./clay-county.js";

type SyntheticGroup = readonly [agency: string, charges: readonly string[]];
type SyntheticInmate = Readonly<{
  name: string;
  bookingDate: string;
  holds?: readonly string[];
  groups: readonly SyntheticGroup[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    name: "TESTER , ALPHA TEST",
    bookingDate: "01/02/2000 03:04:05 PM",
    groups: [
      ["SYNTHETIC POLICE DEPARTMENT", ["Synthetic Offense Alpha (FB)", "Synthetic Offense Beta"]],
      ["SYNTHETIC SHERIFF'S OFFICE", ["Synthetic Warrant"]]
    ]
  },
  {
    name: "TESTER-DOE , BETA",
    bookingDate: "01/03/2000 09:00:00 AM",
    holds: ["SYNTHETIC HOLD"],
    groups: [["SYNTHETIC POLICE DEPARTMENT", ["Synthetic Offense Gamma"]]]
  }
];

const STAMP = "01/04/2000 06:00:00";

function entry(person: SyntheticInmate): string {
  const holds = (person.holds ?? []).map((hold) => `\n<br>&nbsp&nbsp&nbsp${hold}`).join("");
  const groups = person.groups
    .map(
      ([agency, charges]) =>
        `\n<br><b>Arresting Agency:</b> ${agency}\n                <br><b>Charges:</b>` +
        charges
          .map((charge, index) => `${index === 0 ? "" : "\n"}<br>&nbsp&nbsp&nbsp${charge}`)
          .join("")
    )
    .join("");
  return `<p><font color=#496C8B><strong>${person.name}</strong></font> <a href=https://files.claycountymn.gov/InmateRoster/img/1_MN0140000_A_0.jpg target=new><img src=https://files.claycountymn.gov/InmateRoster/img/img.png alt='Image' width=15></a></caption>
<br><b>Age:</b> 99
        <br><b>Booking Date:</b> ${person.bookingDate}${holds}${groups}
<hr width=500 align=left color=#496C8B>
`;
}

function page(people: readonly SyntheticInmate[] = inmates, stamp: string = STAMP): string {
  return `<!--Page last generated at ${stamp}-->
    <!--Exported data from ${stamp}-->
    <head></head><body>
    <a href=https://files.claycountymn.gov/InmateRoster/index.htm>All</a>
 <a href=https://files.claycountymn.gov/InmateRoster/Roster_A.htm>A</a>
${people.map(entry).join("")}
    </body>
`;
}

function context(sourceUrl: string = CLAY_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://claycountymn.gov/223/Correctional-Facility",
      relationshipEvidenceUrl: "https://claycountymn.gov/1454/Inmate-Roster",
      evidenceDescription: "Synthetic Clay County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: CLAY_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-04T18:00:00.000Z",
    traceId: "synthetic-clay-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): ClayRosterIdFactory {
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

function adapter(html: string) {
  return createClayCountySourceAdapter({
    fetch: async () => new Response(html),
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Clay County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(CLAY_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every person with the charges from each arresting agency", async () => {
    const result = await runSourceAdapter(adapter(page()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.recordCount).toBe(2);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier,
        booking.charges.map((charge) => charge.description),
        booking.bondEntries
      ])
    ).toEqual([
      [
        "TESTER, ALPHA TEST",
        null,
        ["Synthetic Offense Alpha (FB)", "Synthetic Offense Beta", "Synthetic Warrant"],
        []
      ],
      ["TESTER-DOE, BETA", null, ["Synthetic Offense Gamma"], []]
    ]);
  });

  it("drops ages, booking dates, agencies, mugshots, and holds outside a charge list", async () => {
    const result = await runSourceAdapter(adapter(page()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "SYNTHETIC HOLD",
      "SYNTHETIC POLICE DEPARTMENT",
      "01/02/2000",
      "MN0140000",
      "99"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed on a stale, cut-off, changed, duplicate, or empty roster", async () => {
    const cases: [string, string][] = [
      [page(inmates, "01/01/2000 06:00:00"), "SOURCE_PAGE_STALE"],
      [page().replace("</body>", ""), "ROSTER_TRUNCATED"],
      [page().replace(/<!--Page last generated[^>]*-->/, ""), "SOURCE_IDENTITY_MISMATCH"],
      [page().replace("TESTER , ALPHA TEST", "TESTER ALPHA TEST"), "NAME_UNREADABLE"],
      [page().replace("01/02/2000 03:04:05 PM", "January 2"), "BOOKING_DATE_UNREADABLE"],
      [page([{ ...inmates[0]!, groups: [] }]), "CHARGES_MISSING"],
      [page([inmates[0]!, inmates[0]!]), "DUPLICATE_ROSTER_ENTRY"],
      [page([]), "ROSTER_EMPTY"]
    ];
    for (const [html, code] of cases) {
      const result = await runSourceAdapter(adapter(html), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`CLAY_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter(page()),
      context("https://claycountymn.gov/1454/Inmate-Roster")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CLAY_COUNTY_SOURCE_URL_MISMATCH");
  });
});
