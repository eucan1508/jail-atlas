import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  MEEKER_COUNTY_ADAPTER_KEY,
  MEEKER_COUNTY_CURRENT_SOURCE_URL,
  createMeekerCountySourceAdapter,
  type MeekerPdfPage,
  type MeekerPdfTextItem
} from "./meeker-county.js";

type SyntheticPerson = Readonly<{
  name: readonly string[];
  arrest: string;
  charges: readonly string[];
}>;

function context(sourceUrl: string = MEEKER_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000701",
    source: {
      id: "00000000-0000-4000-8000-000000000702",
      officialInstitutionId: "00000000-0000-4000-8000-000000000703",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.meekercountymn.gov/",
      relationshipEvidenceUrl: "https://www.meekercountymn.gov/306/Jail-Roster-PDF",
      evidenceDescription: "Synthetic Meeker County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: MEEKER_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-meeker-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

const item = (text: string, x: number, y: number): MeekerPdfTextItem => ({ text, x, y });
const HEADER = [
  item("Mugshot", 61.2, 463.4),
  item("Name & Address", 127.2, 463.4),
  item("Age", 229.2, 463.4),
  item("Sex", 265.2, 463.4),
  item("Race", 301.2, 463.4),
  item("Arrest Date/Time", 349.2, 463.4),
  item("Held For", 445.2, 463.4),
  item("Charges", 571.2, 463.4)
];

function block(person: SyntheticPerson, top: number): MeekerPdfTextItem[] {
  return [
    ...person.name.map((line, index) => item(line, 127.2, top - index * 9.6)),
    item("1 SYNTHETIC STREET", 127.2, top - 24),
    item("SYNTHVILLE", 127.2, top - 36),
    item("MN", 205.2, top - 36),
    item("199", 231.2, top),
    item("Synthetic Sex", 265.2, top),
    item("Synthetic Race", 301.2, top),
    item(person.arrest, 355.2, top),
    item("Synthetic Agency", 445.2, top),
    ...person.charges.map((line, index) => item(line, 565.2, top - index * 9.6))
  ];
}

function pages(
  perPage: readonly (readonly SyntheticPerson[])[],
  options: {
    total?: number;
    printed?: string;
    title?: string;
    extraFirstPage?: MeekerPdfTextItem[];
  } = {}
): MeekerPdfPage[] {
  const total = options.total ?? perPage.flat().length;
  return perPage.map((people, index) => {
    const items: MeekerPdfTextItem[] = [
      ...HEADER,
      item(`Page ${index + 1} of ${perPage.length}`, 686.3, 39)
    ];
    if (index === 0) {
      items.push(
        item(options.title ?? "Internet Daily Jail Roster", 49.2, 490.4),
        item(options.printed ?? "Printed on January 1, 2000", 593, 490.4),
        ...(options.extraFirstPage ?? [])
      );
    }
    people.forEach((person, position) => items.push(...block(person, 443.4 - position * 84)));
    if (index === perPage.length - 1) items.push(item(`Total Records: ${total}`, 49.2, 60));
    return items;
  });
}

const alpha: SyntheticPerson = {
  name: ["TESTER, ALPHA", "SYNTHETIC"],
  arrest: "01/01/00 09:00",
  charges: [
    "609.222.1 - Synthetic Assault-2nd Degree-",
    "Dangerous Weapon - Arrest of Adult",
    "609.2242.3(c) - Synthetic Court Determines"
  ]
};
const beta: SyntheticPerson = {
  name: ["TESTER-DOE, BETA"],
  arrest: "01/01/00 10:00",
  charges: ["152.025.2(a)(1) - Synthetic Drugs - Possess", "10 grams - Arrest of Adult"]
};

function adapter(roster: readonly MeekerPdfPage[]) {
  const requested: string[] = [];
  let sequence = 0;
  const source = createMeekerCountySourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), { status: 200 });
    },
    facilityId: "00000000-0000-4000-8000-000000000704",
    createId: () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`,
    extractPdfPages: () => Promise.resolve(roster)
  });
  return { source, requested };
}

async function failureCode(roster: readonly MeekerPdfPage[], runContext = context()) {
  const result = await runSourceAdapter(adapter(roster).source, runContext);
  expect(result.ok).toBe(false);
  return result.ok ? null : result.failure.diagnosticCode;
}

describe("Meeker County, Minnesota source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(MEEKER_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads names and wrapped charges and keeps no address, age, race, or agency", async () => {
    const { source, requested } = adapter(pages([[alpha], [beta]]));
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(requested).toEqual([MEEKER_COUNTY_CURRENT_SOURCE_URL]);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.bookingIdentifier,
        booking.charges.map((charge) => [charge.statuteCode, charge.description])
      ])
    ).toEqual([
      [
        "TESTER, ALPHA SYNTHETIC",
        null,
        [
          ["609.222.1", "Synthetic Assault-2nd Degree- Dangerous Weapon"],
          ["609.2242.3(c)", "Synthetic Court Determines"]
        ]
      ],
      ["TESTER-DOE, BETA", null, [["152.025.2(a)(1)", "Synthetic Drugs - Possess 10 grams"]]]
    ]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "SYNTHETIC STREET",
      "SYNTHVILLE",
      "199",
      "Synthetic Race",
      "Synthetic Agency"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed on a total mismatch, a missing page, a stale print, or another report", async () => {
    expect(await failureCode(pages([[alpha, beta]], { total: 3 }))).toBe(
      "MEEKER_COUNTY_ROSTER_TOTAL_MISMATCH"
    );
    const three = pages([[alpha], [beta], [alpha]]);
    expect(await failureCode([three[0]!, three[1]!])).toBe("MEEKER_COUNTY_PAGES_MISSING");
    expect(await failureCode(pages([[alpha]], { printed: "Printed on December 20, 1999" }))).toBe(
      "MEEKER_COUNTY_SOURCE_REPORT_STALE"
    );
    expect(await failureCode(pages([[alpha]], { title: "Synthetic Roster" }))).toBe(
      "MEEKER_COUNTY_SOURCE_IDENTITY_MISMATCH"
    );
  });

  it("fails closed on unreadable rows, a stray column, a repeated person, or an empty print", async () => {
    expect(await failureCode(pages([[{ ...alpha, charges: ["Synthetic no statute"] }]]))).toBe(
      "MEEKER_COUNTY_CHARGE_UNREADABLE"
    );
    expect(await failureCode(pages([[{ ...alpha, name: ["NOCOMMA"] }]]))).toBe(
      "MEEKER_COUNTY_NAME_UNREADABLE"
    );
    expect(
      await failureCode(pages([[alpha]], { extraFirstPage: [item("Synthetic", 700, 400)] }))
    ).toBe("MEEKER_COUNTY_LAYOUT_CHANGED");
    expect(await failureCode(pages([[alpha, alpha]]))).toBe("MEEKER_COUNTY_DUPLICATE_ROSTER_ENTRY");
    expect(await failureCode(pages([[]]))).toBe("MEEKER_COUNTY_ROSTER_EMPTY");
  });

  it("refuses a source URL other than the approved roster", async () => {
    expect(await failureCode(pages([[alpha]]), context("https://example.test/roster.pdf"))).toBe(
      "MEEKER_COUNTY_SOURCE_URL_MISMATCH"
    );
  });
});
