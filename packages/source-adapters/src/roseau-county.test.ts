import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  ROSEAU_COUNTY_ADAPTER_KEY,
  ROSEAU_COUNTY_CURRENT_SOURCE_URL,
  createRoseauCountySourceAdapter,
  formatRoseauCharge,
  type RoseauPdfPage,
  type RoseauPdfTextItem
} from "./roseau-county.js";

type SyntheticPerson = Readonly<{
  jailId: string;
  name: string;
  // Each charge is its printed lines; the first carries the level and the bail.
  charges: readonly (readonly string[])[];
}>;

const PRINT_DATE = "01/01/00";

function context(sourceUrl: string = ROSEAU_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000501",
    source: {
      id: "00000000-0000-4000-8000-000000000502",
      officialInstitutionId: "00000000-0000-4000-8000-000000000503",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.roseaucountymn.gov/",
      relationshipEvidenceUrl: "https://www.roseaucountymn.gov/offices/sheriff/index.php",
      evidenceDescription: "Synthetic Roseau County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: ROSEAU_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-roseau-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function item(text: string, x: number, y: number): RoseauPdfTextItem {
  return { text, x, y };
}

/** Prints people top-down from y, the way the county's report lays them out. */
function personItems(person: SyntheticPerson, top: number): RoseauPdfTextItem[] {
  const items = [
    item("Jail ID", 190.8, top),
    item("Name", 259.2, top),
    item("SID#", 430.2, top),
    item("Attorney", 532.8, top),
    item(person.jailId, 190.8, top - 12.5),
    item(person.name, 259.2, top - 12.5),
    item("999", 430.2, top - 12.5),
    item("Book Date", 190.8, top - 25),
    item("Release Date", 259.2, top - 25),
    item("Age", 430.2, top - 25),
    item("Arresting Agency", 532.8, top - 25),
    item("01/01/00", 190.8, top - 37.5),
    item("**/**/**", 259.2, top - 37.5),
    item("199", 430.2, top - 37.5),
    item("Synthetic Arresting Agency", 532.8, top - 37.5),
    item("Charges", 184.3, top - 96),
    item("Court", 379.7, top - 96),
    item("Current Disposition", 477.4, top - 96),
    item("Total Bail", 640.3, top - 96)
  ];
  let y = top - 108;
  for (const lines of person.charges) {
    items.push(item("Synthetic District Court", 379.7, y), item("0.00", 640.3, y));
    for (const line of lines) {
      items.push(item(line, 184.3, y));
      y -= 12;
    }
  }
  return items;
}

function pages(
  perPage: readonly (readonly SyntheticPerson[])[],
  options: { agency?: string; dates?: readonly string[]; endMarker?: boolean } = {}
): RoseauPdfPage[] {
  return perPage.map((people, index) => {
    const items: RoseauPdfTextItem[] = [
      item("rpjlciol.x1so", 54, 56.8),
      item(options.dates?.[index] ?? PRINT_DATE, 706.9, 56.8)
    ];
    if (index === 0) {
      items.push(
        item(options.agency ?? "Roseau County Sheriff's Office", 126, 539.2),
        item("Current Inmate Offense List, by Name", 126, 519.6)
      );
    } else {
      items.push(item("Current Inmate Offense List, by Name", 54, 549.4));
    }
    if (perPage.length > 1 && index > 0) {
      items.push(item(`Page ${index + 1} of ${perPage.length}`, 687.3, 549.4));
    }
    let top = 476;
    for (const person of people) {
      items.push(...personItems(person, top));
      top -= 108 + person.charges.flat().length * 12 + 40;
    }
    if (index === perPage.length - 1 && options.endMarker !== false) {
      items.push(
        item("Report Includes:", 54, 103),
        item("All location types, All synthetic classes", 54, 91)
      );
    }
    return items;
  });
}

const alpha: SyntheticPerson = {
  jailId: "00BK00001",
  name: "TESTER, ALPHA S",
  charges: [
    ["F - Synthetic Assault-2nd Degree-Dangerous", "Weapon; Felony"],
    ["M - Synthetic Revocation of Stay"]
  ]
};
const beta: SyntheticPerson = {
  jailId: "00BK00002",
  name: "TESTER-DOE, BETA",
  charges: [["GM - Synthetic Tamper With Motor Vehicle; Gross", "Misdemeanor"]]
};

function adapter(roster: readonly RoseauPdfPage[]) {
  const requested: string[] = [];
  let sequence = 0;
  const source = createRoseauCountySourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), { status: 200 });
    },
    facilityId: "00000000-0000-4000-8000-000000000504",
    createId: () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`,
    extractPdfPages: () => Promise.resolve(roster)
  });
  return { source, requested };
}

async function failureCode(roster: readonly RoseauPdfPage[], runContext = context()) {
  const result = await runSourceAdapter(adapter(roster).source, runContext);
  expect(result.ok).toBe(false);
  return result.ok ? null : result.failure.diagnosticCode;
}

describe("Roseau County, Minnesota source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(ROSEAU_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("joins wrapped charges, keeps the jail ID, and drops ages, agencies, courts, and bail", async () => {
    const { source, requested } = adapter(pages([[alpha], [beta]]));
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(requested).toEqual([ROSEAU_COUNTY_CURRENT_SOURCE_URL]);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.bookingIdentifier?.value,
        booking.person.displayName,
        booking.charges.map((charge) => charge.description),
        booking.bondEntries.length
      ])
    ).toEqual([
      [
        "00BK00001",
        "TESTER, ALPHA S",
        [
          "Synthetic Assault-2nd Degree-Dangerous Weapon (Felony)",
          "Synthetic Revocation of Stay (Misdemeanor)"
        ],
        0
      ],
      [
        "00BK00002",
        "TESTER-DOE, BETA",
        ["Synthetic Tamper With Motor Vehicle (Gross Misdemeanor)"],
        0
      ]
    ]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "199",
      "Synthetic Arresting Agency",
      "Synthetic District Court",
      "999"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed on a cut-off list, a missing page, or another office's report", async () => {
    expect(await failureCode(pages([[alpha]], { endMarker: false }))).toBe(
      "ROSEAU_COUNTY_LIST_TRUNCATED"
    );
    const missing = pages([[alpha], [beta], [alpha]]);
    expect(await failureCode([missing[0]!, missing[2]!])).toBe("ROSEAU_COUNTY_PAGES_MISSING");
    expect(await failureCode(pages([[alpha]], { agency: "Synthetic Sheriff's Office" }))).toBe(
      "ROSEAU_COUNTY_SOURCE_IDENTITY_MISMATCH"
    );
  });

  it("fails closed when pages disagree on the print date or the print is old", async () => {
    expect(await failureCode(pages([[alpha], [beta]], { dates: [PRINT_DATE, "01/02/00"] }))).toBe(
      "ROSEAU_COUNTY_PRINT_DATES_INCONSISTENT"
    );
    const later = { ...context(), requestedAt: "2000-01-05T18:00:00.000Z" };
    expect(await failureCode(pages([[alpha]]), later)).toBe("ROSEAU_COUNTY_SOURCE_LIST_STALE");
  });

  it("fails closed on unreadable rows, a repeated jail ID, or an empty list", async () => {
    expect(await failureCode(pages([[{ ...alpha, jailId: "12345" }]]))).toBe(
      "ROSEAU_COUNTY_JAIL_ID_UNREADABLE"
    );
    expect(await failureCode(pages([[{ ...alpha, charges: [["Synthetic no level"]] }]]))).toBe(
      "ROSEAU_COUNTY_CHARGE_UNREADABLE"
    );
    expect(await failureCode(pages([[alpha, alpha]]))).toBe("ROSEAU_COUNTY_DUPLICATE_JAIL_ID");
    expect(await failureCode(pages([[]]))).toBe("ROSEAU_COUNTY_ROSTER_EMPTY");
  });

  it("allows a few people without charges, but not many", async () => {
    const blank = (index: number): SyntheticPerson => ({
      jailId: `00BK0010${index}`,
      name: `TESTER, BLANK ${"ABC"[index - 1]!}`,
      charges: []
    });
    const few = await runSourceAdapter(
      adapter(pages([[alpha, beta], [blank(1)]])).source,
      context()
    );
    expect(few.ok ? null : few.failure.diagnosticCode).toBeNull();
    expect(
      await failureCode(
        pages([
          [alpha, blank(1)],
          [blank(2), blank(3)]
        ])
      )
    ).toBe("ROSEAU_COUNTY_CHARGES_MISSING");
  });

  it("refuses a source URL other than the approved list", async () => {
    expect(await failureCode(pages([[alpha]]), context("https://example.test/list.pdf"))).toBe(
      "ROSEAU_COUNTY_SOURCE_URL_MISMATCH"
    );
  });

  it("prints the offense level after the description", () => {
    expect(formatRoseauCharge("F", "Synthetic offense; Felony")).toBe("Synthetic offense (Felony)");
    expect(formatRoseauCharge("PM", "Synthetic speeding")).toBe(
      "Synthetic speeding (Petty Misdemeanor)"
    );
    expect(formatRoseauCharge("M", "Synthetic; Drives; Misdemeanor")).toBe(
      "Synthetic; Drives (Misdemeanor)"
    );
  });
});
