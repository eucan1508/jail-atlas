import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  HUBBARD_COUNTY_LOCATOR,
  KANABEC_COUNTY_LOCATOR,
  PROPHOENIX_LOCATORS,
  createProPhoenixLocatorAdapter,
  formatProPhoenixCharge,
  type ProPhoenixLocatorConfig
} from "./prophoenix-locator.js";

type SyntheticCharge = Readonly<{ statute: string; description: string; severity: string }>;
type SyntheticPerson = Readonly<{
  last: string;
  first: string;
  middle?: string;
  booking: string;
  charges: readonly SyntheticCharge[];
}>;

const LIST_KEYS = [
  "LastName",
  "FirstName",
  "MiddleName",
  "NameSuffix",
  "CourtDate",
  "BookId",
  "BookingNbr",
  "FullName",
  "DOB",
  "Age"
];
const CHARGE_KEYS = ["CaseNbr", "Charge", "Description", "Severity", "BailAmt", "CourtBranchInfo"];

function context(
  config: ProPhoenixLocatorConfig,
  sourceUrl: string = config.sourceUrl
): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000601",
    source: {
      id: "00000000-0000-4000-8000-000000000602",
      officialInstitutionId: "00000000-0000-4000-8000-000000000603",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.example.test/",
      relationshipEvidenceUrl: "https://www.example.test/sheriff",
      evidenceDescription: "Synthetic ProPhoenix locator adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: config.adapterKey,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-prophoenix-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

const quote = (value: string) => `&quot;${value}&quot;`;

function grid(id: string, keys: readonly string[], rows: readonly Record<string, string | null>[]) {
  const headers = keys
    .map(
      (key, index) =>
        `<th data-ig="x:1.15:adr:${index}:idx:${index}:key:${key}:hdr:1:skp:" id="${id}_columnheader_${index}">${key}</th>`
    )
    .join("");
  const body = rows
    .map(
      (row, adr) =>
        `<tr data-ig="x:1.17:adr:${adr}:tag:" role="row" adr="${adr}" idx="${adr}">` +
        keys
          .map((key, index) => {
            const value = row[key];
            // The real grid prints never-filled columns without any value attribute.
            const ig =
              key === "CourtDate"
                ? ""
                : ` data-ig="x:1.18:val:${value === null || value === undefined ? "null" : quote(value)}"`;
            return `<td${ig} role="gridcell" aria-describedby="${id}_columnheader_${index}">${value ?? ""}</td>`;
          })
          .join("") +
        "</tr>"
    )
    .join("");
  return `<table><tr>${headers}</tr></table><table><tbody>${body}</tbody></table>`;
}

function page(
  config: ProPhoenixLocatorConfig,
  people: readonly SyntheticPerson[],
  detail?: { person: SyntheticPerson; echo?: string; name?: string }
) {
  const list = people.map((person, index) => ({
    LastName: person.last,
    FirstName: person.first,
    MiddleName: person.middle ?? null,
    NameSuffix: null,
    CourtDate: null,
    BookId: String(900_000 + index),
    BookingNbr: `${person.booking}          `,
    FullName: `${person.last},${person.first}`,
    DOB: "1900~1~1~0~0~0~0",
    Age: "199"
  }));
  const charges = (detail?.person.charges ?? []).map((charge) => ({
    CaseNbr: "SYN-1",
    Charge: `${charge.statute}      `,
    Description: charge.description,
    Severity: `${charge.severity}   `,
    BailAmt: "98765",
    CourtBranchInfo: "Synthetic Court"
  }));
  return `<!DOCTYPE HTML><html><head><title> :: ${config.countyName} :: Inmate Locator </title></head><body>
<form name="aspnetForm" method="post" action="./" id="aspnetForm">
<input type="hidden" name="__VIEWSTATE" value="SYNTHETIC" />
<input type="hidden" name="_ctl0_CpnlMain_ctrlUsrSrchRslt_grdSrchResults_clientState" value="" />
<input name="_ctl0:CpnlMain:ctrlUsrSrchTools:txtLastName" type="text" />
<input type="submit" name="_ctl0:CpnlMain:ctrlUsrSrchTools:cmdSearch" value="Search" />
<input name="_ctl0:hdnBookNbr" type="hidden" value="${detail ? (detail.echo ?? `${detail.person.booking}   `) : ""}" />
<input name="_ctl0:hdnSelectedCellIndex" type="hidden" value="" />
${grid("grdSrchResults", LIST_KEYS, list)}
<span id="_ctl0_CpnlMain_ctrlUsrInmateDtl_lblInmateName">${detail ? (detail.name ?? `${detail.person.last},${detail.person.first}`) : ""} &nbsp;</span>
${detail ? grid("grdInmateCharge", CHARGE_KEYS, charges) : ""}
</form></body></html>`;
}

const alpha: SyntheticPerson = {
  last: "Tester",
  first: "Alpha",
  middle: "Synthetic",
  booking: "2000000001",
  charges: [
    { statute: "609.222.1", description: "F-Synthetic Assault-2nd Degree", severity: "F" },
    { statute: "609.14", description: "(Misdemeanor) Synthetic Revocation", severity: "M" }
  ]
};
const beta: SyntheticPerson = {
  last: "Tester-Doe",
  first: "Beta",
  booking: "2000000002",
  charges: [{ statute: "169A.20.1(2)", description: "Synthetic DWI", severity: "GM" }]
};

function adapter(
  config: ProPhoenixLocatorConfig,
  people: readonly SyntheticPerson[],
  overrides: { echo?: (index: number) => string; name?: string } = {}
) {
  const posts: URLSearchParams[] = [];
  const source = createProPhoenixLocatorAdapter(config, {
    fetch: async (input, init) => {
      expect(input).toBe(config.sourceUrl);
      const body = init?.body instanceof URLSearchParams ? init.body : null;
      if (!body) return new Response(page(config, config.searchFirst ? [] : people));
      posts.push(body);
      if (body.has("_ctl0:CpnlMain:ctrlUsrSrchTools:cmdSearch")) {
        return new Response(page(config, people));
      }
      const index = Number(body.get("_ctl0:hdnSelectedCellIndex"));
      return new Response(
        page(config, people, {
          person: people[index]!,
          echo: overrides.echo?.(index),
          name: overrides.name
        })
      );
    },
    facilityId: "00000000-0000-4000-8000-000000000604",
    createId: (() => {
      let sequence = 0;
      return () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    })()
  });
  return { source, posts };
}

describe("ProPhoenix inmate locator adapter (Hubbard and Kanabec counties, Minnesota)", () => {
  it("keeps every locator out of the default registry", () => {
    for (const config of PROPHOENIX_LOCATORS) {
      expect(sourceAdapterRegistry.has(config.adapterKey)).toBe(false);
    }
  });

  it("selects each person's row, reads their charges, and keeps only names, bookings, and charges", async () => {
    const { source, posts } = adapter(HUBBARD_COUNTY_LOCATOR, [alpha, beta]);
    const result = await runSourceAdapter(source, context(HUBBARD_COUNTY_LOCATOR));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(posts.map((post) => post.get("_ctl0:hdnSelectedCellIndex"))).toEqual(["0", "1"]);
    expect(posts[1]!.get("_ctl0_CpnlMain_ctrlUsrSrchRslt_grdSrchResults_clientState")).toContain(
      '"rowIDPair":{"index":1,"key":[1]}'
    );
    expect(
      result.snapshot.bookings.map((booking) => [
        booking.bookingIdentifier?.value,
        booking.person.displayName,
        booking.charges.map((charge) => [charge.statuteCode, charge.description])
      ])
    ).toEqual([
      [
        "2000000001",
        "Tester, Alpha Synthetic",
        [
          ["609.222.1", "Synthetic Assault-2nd Degree (Felony)"],
          ["609.14", "Synthetic Revocation (Misdemeanor)"]
        ]
      ],
      ["2000000002", "Tester-Doe, Beta", [["169A.20.1(2)", "Synthetic DWI (Gross Misdemeanor)"]]]
    ]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["1900", "199", "98765", "Synthetic Court", "SYN-1"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("submits the blank search first where the locator opens empty", async () => {
    const { source, posts } = adapter(KANABEC_COUNTY_LOCATOR, [alpha]);
    const result = await runSourceAdapter(source, context(KANABEC_COUNTY_LOCATOR));
    expect(result.ok).toBe(true);
    expect(posts[0]!.has("_ctl0:CpnlMain:ctrlUsrSrchTools:cmdSearch")).toBe(true);
    expect(posts).toHaveLength(2);
  });

  it("fails closed when a detail page is not the selected person's", async () => {
    for (const overrides of [{ echo: () => "2000000009" }, { name: "Someone,Else" }]) {
      const result = await runSourceAdapter(
        adapter(HUBBARD_COUNTY_LOCATOR, [alpha, beta], overrides).source,
        context(HUBBARD_COUNTY_LOCATOR)
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.failure.diagnosticCode).toBe("HUBBARD_COUNTY_DETAIL_MISMATCH");
      }
    }
  });

  it("fails closed on an empty locator, a repeated booking, another county, or a bad URL", async () => {
    const cases: [ProPhoenixLocatorConfig, readonly SyntheticPerson[], string, string?][] = [
      [HUBBARD_COUNTY_LOCATOR, [], "HUBBARD_COUNTY_ROSTER_EMPTY"],
      [
        HUBBARD_COUNTY_LOCATOR,
        [alpha, { ...beta, booking: alpha.booking }],
        "HUBBARD_COUNTY_DUPLICATE_BOOKING"
      ],
      [
        HUBBARD_COUNTY_LOCATOR,
        [{ ...alpha, booking: "12345" }],
        "HUBBARD_COUNTY_BOOKING_NUMBER_UNREADABLE"
      ],
      [
        HUBBARD_COUNTY_LOCATOR,
        [alpha],
        "HUBBARD_COUNTY_SOURCE_URL_MISMATCH",
        "https://example.test/"
      ]
    ];
    for (const [config, people, code, url] of cases) {
      const result = await runSourceAdapter(adapter(config, people).source, context(config, url));
      expect(result.ok, code).toBe(false);
      if (!result.ok) expect(result.failure.diagnosticCode, code).toBe(code);
    }
    const other = { ...HUBBARD_COUNTY_LOCATOR, countyName: "Synthetic County" };
    const wrongCounty = createProPhoenixLocatorAdapter(other, {
      fetch: async () => new Response(page(HUBBARD_COUNTY_LOCATOR, [alpha])),
      facilityId: "00000000-0000-4000-8000-000000000604",
      createId: () => "00000000-0000-4000-8000-000000000605"
    });
    const result = await runSourceAdapter(wrongCounty, context(other));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.diagnosticCode).toBe("HUBBARD_COUNTY_SOURCE_IDENTITY_MISMATCH");
    }
  });

  it("allows a few people without charges, but not many", async () => {
    const blank = (letter: string, booking: string): SyntheticPerson => ({
      last: "Blank",
      first: letter,
      booking,
      charges: []
    });
    const few = await runSourceAdapter(
      adapter(HUBBARD_COUNTY_LOCATOR, [alpha, beta, blank("A", "2000000101")]).source,
      context(HUBBARD_COUNTY_LOCATOR)
    );
    expect(few.ok).toBe(true);
    const many = await runSourceAdapter(
      adapter(HUBBARD_COUNTY_LOCATOR, [
        alpha,
        blank("A", "2000000101"),
        blank("B", "2000000102"),
        blank("C", "2000000103")
      ]).source,
      context(HUBBARD_COUNTY_LOCATOR)
    );
    expect(many.ok).toBe(false);
    if (!many.ok) expect(many.failure.diagnosticCode).toBe("HUBBARD_COUNTY_CHARGES_MISSING");
  });

  it("prints the offense level once, after the description", () => {
    expect(formatProPhoenixCharge("F-Synthetic offense", "F")).toBe("Synthetic offense (Felony)");
    expect(formatProPhoenixCharge("(Felony) Synthetic offense", "F")).toBe(
      "Synthetic offense (Felony)"
    );
    expect(formatProPhoenixCharge("(MS) Synthetic offense", "M")).toBe(
      "(MS) Synthetic offense (Misdemeanor)"
    );
    expect(formatProPhoenixCharge("Synthetic offense", "X")).toBe("Synthetic offense");
  });
});
