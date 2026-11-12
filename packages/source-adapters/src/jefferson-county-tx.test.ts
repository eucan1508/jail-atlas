import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  JEFFERSON_COUNTY_TX_ADAPTER_KEY,
  JEFFERSON_COUNTY_TX_CURRENT_SOURCE_URL,
  createJeffersonCountyTxSourceAdapter,
  type JeffersonPdfPage,
  type JeffersonPdfTextItem
} from "./jefferson-county-tx.js";

type SyntheticPerson = Readonly<{
  name: readonly string[];
  arrest?: string;
  // Each charge is its printed lines; the first carries the bond and degree.
  charges: readonly (readonly string[])[];
}>;

const item = (text: string, x: number, y: number): JeffersonPdfTextItem => ({ text, x, y });
const HEADER = [
  item("Name", 23.6, 654.4),
  item("Race", 138.4, 654.4),
  item("Date / Time", 200.6, 654.4),
  item("Arrest Agency", 497, 654.4),
  item("Age", 23.6, 635.9),
  item("Gender", 138.4, 635.9),
  item("Charge", 200.6, 635.9),
  item("Bond Amount", 366.3, 635.9),
  item("Warrant Num", 451.7, 635.9),
  item("Degree", 532.9, 635.9)
];

function context(sourceUrl: string = JEFFERSON_COUNTY_TX_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.sheriff.jeffersoncountytx.gov/",
      relationshipEvidenceUrl: "https://www.sheriff.jeffersoncountytx.gov/",
      evidenceDescription: "Synthetic Jefferson County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: JEFFERSON_COUNTY_TX_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-jefferson-tx-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function personItems(
  person: SyntheticPerson,
  top: number
): { items: JeffersonPdfTextItem[]; bottom: number } {
  const items: JeffersonPdfTextItem[] = [
    item("Synthetic Race", 138.4, top),
    item("Male", 138.4, top - 13.3)
  ];
  person.name.forEach((line, index) => items.push(item(line, 23.6, top - index * 13.3)));
  items.push(item("199", 23.6, top - person.name.length * 13.3));
  let y = top;
  if (person.arrest) {
    items.push(item(person.arrest, 200.6, top), item("Synthetic Agency", 430, top));
    y = top - 18;
  }
  for (const lines of person.charges) {
    items.push(item("$98,765.00", 391.3, y), item("SYN1 - 1", 450.1, y), item("F2", 559.7, y));
    lines.forEach((line, index) => items.push(item(line, 200.6, y - index * 13.3)));
    y -= (lines.length - 1) * 13.3 + 18;
  }
  return { items, bottom: Math.min(y, top - 30) };
}

function pages(
  perPage: readonly (readonly SyntheticPerson[])[],
  options: { stamps?: readonly string[]; dropLabel?: number } = {}
): JeffersonPdfPage[] {
  return perPage.map((people, index) => {
    const items: JeffersonPdfTextItem[] = [
      item("Jefferson County Corrections Inmate Roster", 82.3, 738.9),
      item(options.stamps?.[index] ?? "01/01/2000 8:00:00 AM", 365.5, 738.9),
      item("All Data Subject to Change. Bond/Fees Must Be Paid With Exact Cash.", 82.2, 720.2)
    ];
    if (options.dropLabel !== index)
      items.push(item(`${index + 1} / ${perPage.length}`, 533.9, 719.1));
    if (index === 0) items.push(...HEADER);
    let top = 618.3;
    for (const person of people) {
      const printed = personItems(person, top);
      items.push(...printed.items);
      top = printed.bottom - 10;
    }
    return items;
  });
}

const alpha: SyntheticPerson = {
  name: ["Tester, Alpha"],
  arrest: "01/01/2000 09:00",
  charges: [["SYNTHETIC RESIST ARREST SEARCH OR", "TRANSP"], ["SYNTHETIC EVADING ARREST"]]
};
const beta: SyntheticPerson = {
  name: ["Tester-Doe, Beta", "Synthetic, JR"],
  charges: [["SYNTHETIC POSS CS PG 1 <1G"]]
};

function adapter(roster: readonly JeffersonPdfPage[]) {
  let sequence = 0;
  return createJeffersonCountyTxSourceAdapter({
    fetch: async () =>
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), { status: 200 }),
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`,
    extractPdfPages: () => Promise.resolve(roster)
  });
}

async function failureCode(roster: readonly JeffersonPdfPage[], runContext = context()) {
  const result = await runSourceAdapter(adapter(roster), runContext);
  expect(result.ok).toBe(false);
  return result.ok ? null : result.failure.diagnosticCode;
}

describe("Jefferson County, Texas source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(JEFFERSON_COUNTY_TX_ADAPTER_KEY)).toBe(false);
  });

  it("joins wrapped names and charges and keeps no race, gender, age, agency, bond, or warrant", async () => {
    const result = await runSourceAdapter(adapter(pages([[alpha], [beta]])), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.charges.map((charge) => charge.description)
      ])
    ).toEqual([
      ["Tester, Alpha", ["SYNTHETIC RESIST ARREST SEARCH OR TRANSP", "SYNTHETIC EVADING ARREST"]],
      ["Tester-Doe, Beta Synthetic, JR", ["SYNTHETIC POSS CS PG 1 <1G"]]
    ]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "Synthetic Race",
      "Male",
      "199",
      "Synthetic Agency",
      "98,765",
      "SYN1"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed on a missing page label, mixed print times, or an old print", async () => {
    expect(await failureCode(pages([[alpha], [beta]], { dropLabel: 1 }))).toBe(
      "JEFFERSON_COUNTY_TX_PAGES_MISSING"
    );
    expect(
      await failureCode(
        pages([[alpha], [beta]], { stamps: ["01/01/2000 8:00:00 AM", "01/01/2000 9:00:00 AM"] })
      )
    ).toBe("JEFFERSON_COUNTY_TX_PRINT_TIMES_INCONSISTENT");
    expect(await failureCode(pages([[alpha]], { stamps: ["12/20/1999 8:00:00 AM"] }))).toBe(
      "JEFFERSON_COUNTY_TX_SOURCE_LIST_STALE"
    );
  });

  it("fails closed on an unreadable name, a repeated person, or an empty list", async () => {
    expect(await failureCode(pages([[{ ...alpha, name: ["NOCOMMA"] }]]))).toBe(
      "JEFFERSON_COUNTY_TX_NAME_UNREADABLE"
    );
    expect(await failureCode(pages([[alpha, alpha]]))).toBe(
      "JEFFERSON_COUNTY_TX_DUPLICATE_ROSTER_ENTRY"
    );
    expect(await failureCode(pages([[]]))).toBe("JEFFERSON_COUNTY_TX_ROSTER_EMPTY");
  });

  it("refuses a source URL other than the approved list", async () => {
    expect(await failureCode(pages([[alpha]]), context("https://example.test/list.pdf"))).toBe(
      "JEFFERSON_COUNTY_TX_SOURCE_URL_MISMATCH"
    );
  });
});
