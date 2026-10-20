import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  NOBLES_COUNTY_ADAPTER_KEY,
  NOBLES_COUNTY_CURRENT_SOURCE_URL,
  createNoblesCountySourceAdapter,
  type NoblesRosterIdFactory
} from "./nobles-county.js";

type SyntheticCharge = readonly [agency: string, type: string, description: string];
type SyntheticInmate = Readonly<{
  name: string;
  bookingDate: string;
  charges: readonly SyntheticCharge[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    name: "Tester, Alpha Test",
    bookingDate: "1/2/2000",
    charges: [
      ["SYNTHETIC SHERIFF'S OFFICE", "Felony", "Synthetic Offense Alpha"],
      ["SYNTHETIC POLICE DEPARTMENT", "Unknown", "Holding for Another Agency"]
    ]
  },
  {
    name: "Tester-Doe, Beta",
    bookingDate: "1/3/2000",
    charges: [["SYNTHETIC POLICE DEPARTMENT", "Gross Misdemeanor", "Synthetic Offense Beta"]]
  }
];

const STAMP = "1/4/2000 6:00 AM";

function record(person: SyntheticInmate, stamp: string): string {
  const rows = person.charges
    .map(
      ([agency, type, description]) => `<tr class="inmate_detail_charge_row">
	<td class="inmate_detail_charge_agency">${agency}</td>
	<td class="inmate_detail_charge_type">${type}</td>
	<td class="inmate_detail_charge_description">${description}</td>
</tr>`
    )
    .join("\n");
  return `<div class="inmate_detail_row">
<div class="inmate_detail_picture"><img src="images/99999.jpg" /></div>
<div class="inmate_detail_name">${person.name}</div>
<div class="inmate_detail_booking_date">${person.bookingDate}</div>
<div class="inmate_detail_charges_title">Charges:</div>
<table class="inmate_detail_charges">
	<tr class="inmate_detail_charges_headers"><td>Agency</td><td>Type</td><td>Description</td></tr>
${rows}
</table>
<div class="clear">&nbsp;</div>
</div>

<div id="last_updated">Last Updated: <strong>${stamp}</strong></div>
</body>
</html>
`;
}

function listing(people: readonly SyntheticInmate[] = inmates, stamp: string = STAMP): string {
  const records = people.map((person) => record(person, stamp)).join("\n");
  return `<html><head><style>.inmate_detail_row {}</style></head>
<body>
<h3 class="page_header">Inmate Listing</h3>

${records || `<div id="last_updated">Last Updated: <strong>${stamp}</strong></div>\n</body>\n</html>\n`}`;
}

function context(sourceUrl: string = NOBLES_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.co.nobles.mn.us/departments/sheriff/nobles-county-jail/",
      relationshipEvidenceUrl: "https://www.co.nobles.mn.us/departments/sheriff/inmate-listing/",
      evidenceDescription: "Synthetic Nobles County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: NOBLES_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-04T18:00:00.000Z",
    traceId: "synthetic-nobles-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): NoblesRosterIdFactory {
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
  return createNoblesCountySourceAdapter({
    fetch: async () => new Response(html),
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Nobles County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(NOBLES_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every person with each charge and its level", async () => {
    const result = await runSourceAdapter(adapter(listing()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.charges.map((charge) => charge.description)
      ])
    ).toEqual([
      ["Tester, Alpha Test", ["Synthetic Offense Alpha (Felony)", "Holding for Another Agency"]],
      ["Tester-Doe, Beta", ["Synthetic Offense Beta (Gross Misdemeanor)"]]
    ]);
  });

  it("drops photos, booking dates, and arresting agencies", async () => {
    const result = await runSourceAdapter(adapter(listing()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["99999", "1/2/2000", "SYNTHETIC SHERIFF'S OFFICE"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed on a stale, cut-off, mixed, changed, duplicate, or empty listing", async () => {
    const mixed = listing().replace(STAMP, "1/4/2000 5:45 AM");
    const cases: [string, string][] = [
      [listing(inmates, "1/1/2000 6:00 AM"), "SOURCE_LISTING_STALE"],
      [
        listing()
          .trimEnd()
          .replace(/<\/html>$/, ""),
        "LISTING_TRUNCATED"
      ],
      [mixed, "LISTING_STAMPS_INCONSISTENT"],
      [listing().replace("Inmate Listing</h3>", "Other</h3>"), "SOURCE_IDENTITY_MISMATCH"],
      [listing().replace("<td>Type</td>", "<td>Level</td>"), "CHARGE_COLUMNS_CHANGED"],
      [
        listing([{ ...inmates[1]!, charges: [["X", "Petty", "Synthetic"]] }]),
        "CHARGE_ROW_UNREADABLE"
      ],
      [listing([{ ...inmates[1]!, charges: [] }]), "CHARGES_MISSING"],
      [listing([inmates[0]!, inmates[0]!]), "DUPLICATE_LISTING_ENTRY"],
      [listing([]), "ROSTER_EMPTY"]
    ];
    for (const [html, code] of cases) {
      const result = await runSourceAdapter(adapter(html), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`NOBLES_COUNTY_${code}`);
    }
  });

  it("refuses a source URL other than the approved listing", async () => {
    const result = await runSourceAdapter(
      adapter(listing()),
      context("https://www.co.nobles.mn.us/departments/sheriff/inmate-listing/")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("NOBLES_COUNTY_SOURCE_URL_MISMATCH");
  });
});
