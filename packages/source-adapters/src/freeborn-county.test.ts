import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  FREEBORN_COUNTY_ADAPTER_KEY,
  FREEBORN_COUNTY_CURRENT_SOURCE_URL,
  createFreebornCountySourceAdapter,
  type FreebornPdfPage,
  type FreebornPdfTextItem,
  type FreebornRosterIdFactory
} from "./freeborn-county.js";

type SyntheticInmate = Readonly<{
  name: string;
  intakeDate: string;
  intakeTime: string;
  // Each charge is printed as one or more wrapped lines.
  charges: readonly (readonly string[])[];
}>;

const inmates: readonly SyntheticInmate[] = [
  {
    name: "Tester, Alpha Test",
    intakeDate: "January 02, 2000",
    intakeTime: "3:04 am",
    charges: [["Synthetic Offense Alpha -", "Second Line of Alpha"], ["Synthetic Offense Beta"]]
  },
  {
    name: "Tester-Doe, Beta",
    intakeDate: "January 03, 2000",
    intakeTime: "9:00 pm",
    charges: [["Synthetic Offense Gamma"]]
  }
];

const LIST_PATH = "/DocumentCenter/View/99999/January-4-2000";

/** Lays each person out as the county's list does: name at x=174, charges at x=390. */
function block(person: SyntheticInmate, top: number): FreebornPdfTextItem[] {
  const items: FreebornPdfTextItem[] = [
    { text: "Charge(s)", x: 390, y: top },
    { text: person.name, x: 174, y: top - 0.5 },
    { text: "Intake Date:", x: 177.75, y: top - 52 },
    { text: person.intakeDate, x: 246, y: top - 52 },
    { text: "Intake Time:", x: 177.75, y: top - 76 },
    { text: person.intakeTime, x: 247.85, y: top - 76 }
  ];
  let y = top - 21.5;
  for (const charge of person.charges) {
    for (const line of charge) {
      items.push({ text: line, x: 390, y });
      y -= 11.4;
    }
    y -= 3.5;
  }
  return items;
}

function pages(
  people: readonly SyntheticInmate[] = inmates,
  options: { asOf?: string; total?: number; title?: string } = {}
): FreebornPdfPage[] {
  const header: FreebornPdfTextItem[] = [
    { text: options.title ?? "Freeborn Co Adult Detenton Center", x: 201, y: 762 },
    { text: "In Custody List", x: 259, y: 742 },
    { text: "**Current as of:", x: 376.5, y: 730 },
    { text: "**Total Inmates does not include ICE Detainees", x: 20, y: 730 },
    { text: "Total Inmates:", x: 20.25, y: 714 },
    { text: String(options.total ?? people.length), x: 134.83, y: 713 },
    { text: options.asOf ?? "January 04, 2000", x: 378, y: 715 },
    { text: "6:16 am", x: 488.23, y: 715 }
  ];
  // One person per page keeps the synthetic layout simple; the real list fits about five.
  const body = people.map((person, index) => [
    ...block(person, index === 0 ? 672 : 756),
    { text: `Page ${index + 1} of ${people.length}`, x: 284.5, y: 14 }
  ]);
  const [first = [], ...rest] = body;
  return [[...header, ...first], ...rest];
}

function jailRosterPage(href: string = LIST_PATH, heading = "Jail Roster"): string {
  return `<html><body><div id="moduleContent">
<h1 id="versionHeadLine" class="headline">
${heading}		</h1>
<ul><li class="widgetItem"><a target="_blank" href="${href}" class="fileType pdf" aria-label="January 4, 2000 pdf file">January 4, 2000</a></li></ul>
<h2 class="headline ">Ice Detainee Information</h2>
</div></body></html>`;
}

function context(sourceUrl: string = FREEBORN_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000901",
    source: {
      id: "00000000-0000-4000-8000-000000000902",
      officialInstitutionId: "00000000-0000-4000-8000-000000000903",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.freeborncountymn.gov/296/Adult-Detention-Center",
      relationshipEvidenceUrl: "https://www.freeborncountymn.gov/438/Jail-Roster",
      evidenceDescription: "Synthetic Freeborn County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: FREEBORN_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-04T18:00:00.000Z",
    traceId: "synthetic-freeborn-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): FreebornRosterIdFactory {
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

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function adapter(
  report: readonly FreebornPdfPage[],
  options: { html?: string; body?: Uint8Array; requests?: string[] } = {}
) {
  return createFreebornCountySourceAdapter({
    fetch: async (input) => {
      options.requests?.push(input);
      return input === FREEBORN_COUNTY_CURRENT_SOURCE_URL
        ? new Response(options.html ?? jailRosterPage())
        : new Response(options.body ?? PDF_BYTES);
    },
    facilityId: "00000000-0000-4000-8000-000000000904",
    createId: idFactory(),
    extractPdfPages: async () => report,
    nowMs: () => 1_000
  });
}

describe("Freeborn County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(FREEBORN_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("follows the day's list and joins each wrapped charge", async () => {
    const requests: string[] = [];
    const result = await runSourceAdapter(adapter(pages(), { requests }), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(requests).toEqual([
      FREEBORN_COUNTY_CURRENT_SOURCE_URL,
      `https://www.freeborncountymn.gov${LIST_PATH}`
    ]);
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.person.displayName,
        booking.charges.map((charge) => charge.description),
        booking.bondEntries
      ])
    ).toEqual([
      [
        "Tester, Alpha Test",
        ["Synthetic Offense Alpha - Second Line of Alpha", "Synthetic Offense Beta"],
        []
      ],
      ["Tester-Doe, Beta", ["Synthetic Offense Gamma"], []]
    ]);
  });

  it("drops intake dates and times", async () => {
    const result = await runSourceAdapter(adapter(pages()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["January 02, 2000", "3:04 am", "Intake"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed on a stale, mismatched, moved, duplicate, or empty list", async () => {
    // A new field, such as a bail amount, would appear between the intake and charge columns.
    const moved = pages();
    moved[0] = [...moved[0]!, { text: "$100.00", x: 300, y: 620 }];
    const split = pages();
    split[1] = [{ text: "Synthetic continued charge", x: 390, y: 770 }, ...split[1]!];
    const cases: [readonly FreebornPdfPage[], string][] = [
      [pages(inmates, { asOf: "December 20, 1999" }), "SOURCE_LIST_STALE"],
      [pages(inmates, { total: 3 }), "ROSTER_TOTAL_MISMATCH"],
      [pages(inmates, { title: "Other County Jail" }), "SOURCE_IDENTITY_MISMATCH"],
      [moved, "LAYOUT_CHANGED"],
      [split, "RECORD_SPLIT_ACROSS_PAGES"],
      [pages([{ ...inmates[0]!, name: "Tester Alpha" }]), "NAME_UNREADABLE"],
      [pages([{ ...inmates[0]!, intakeTime: "sometime" }]), "INTAKE_UNREADABLE"],
      [pages([inmates[0]!, inmates[0]!]), "DUPLICATE_ROSTER_ENTRY"],
      [
        pages(
          ["A", "B", "C"].map((letter) => ({
            ...inmates[1]!,
            name: `Tester, ${letter}`,
            charges: []
          }))
        ),
        "CHARGES_MISSING"
      ],
      [pages([]), "ROSTER_EMPTY"]
    ];
    for (const [report, code] of cases) {
      const result = await runSourceAdapter(adapter(report), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`FREEBORN_COUNTY_${code}`);
    }
  });

  it("fails closed when the Jail Roster page changes", async () => {
    const cases: [string, string][] = [
      [jailRosterPage(LIST_PATH, "Something Else"), "SOURCE_IDENTITY_MISMATCH"],
      [jailRosterPage("https://example.test/list.pdf"), "LIST_LINK_CHANGED"],
      [
        jailRosterPage().replace(
          "</ul>",
          `<li><a href="/DocumentCenter/View/99998/January-3-2000" class="fileType pdf">x</a></li></ul>`
        ),
        "LIST_LINK_CHANGED"
      ]
    ];
    for (const [html, code] of cases) {
      const result = await runSourceAdapter(adapter(pages(), { html }), context());
      expect(result.ok, code).toBe(false);
      if (result.ok) continue;
      expect(result.failure.diagnosticCode).toBe(`FREEBORN_COUNTY_${code}`);
    }
  });

  it("refuses a body that is not a PDF and a source URL other than the approved page", async () => {
    const notPdf = await runSourceAdapter(
      adapter(pages(), { body: new TextEncoder().encode("<html>") }),
      context()
    );
    expect(notPdf.ok).toBe(false);
    if (!notPdf.ok) {
      expect(notPdf.failure.diagnosticCode).toBe("FREEBORN_COUNTY_INVALID_PDF_SIGNATURE");
    }

    const wrongUrl = await runSourceAdapter(
      adapter(pages()),
      context("https://www.freeborncountymn.gov/296/Adult-Detention-Center")
    );
    expect(wrongUrl.ok).toBe(false);
    if (!wrongUrl.ok) {
      expect(wrongUrl.failure.diagnosticCode).toBe("FREEBORN_COUNTY_SOURCE_URL_MISMATCH");
    }
  });
});
