import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  MOBILE_COUNTY_AL_ADAPTER_KEY,
  MOBILE_COUNTY_AL_CURRENT_SOURCE_URL,
  createMobileCountySourceAdapter,
  formatMobileCharge,
  parseMobileRosterHtml
} from "./mobile-county-al.js";
import { sourceAdapterRegistry } from "./registry.js";
import { runSourceAdapter } from "./runner.js";

type Row = readonly [name: string, date: string, charges: readonly string[]];

function page(rows: readonly Row[], { closed = true } = {}): string {
  const body = rows
    .map(
      ([name, date, charges], index) => `
      <tr class="${index % 2 ? "odd" : ""}">
        <td>${name}</td>
        <td>${date}</td>
        <td>${charges.join("<br/>")}</td>
        <td align="right" style="width:80px;">${charges.map(() => " 0").join("<br/>")}</td>
      </tr>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><title></title></head><body>
<form name="form1" method="post" action="CurrentInmates.aspx" id="form1">
  <div><table width="840">
    <tr><th> NAME </th><th> DATE </th><th> CHARGES </th><th> BONDS </th></tr>${body}
  </table></div>
</form></body>${closed ? "</html>" : ""}`;
}

// Fills the roster past the size floor with numbered synthetic people.
function filler(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => [
    `TESTER, FILLER ${index} — TEST ONLY`,
    "1/1/2000",
    ["SYNTHETIC OFFENSE"]
  ]);
}

function context(): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000201",
    source: {
      id: "00000000-0000-4000-8000-000000000202",
      officialInstitutionId: "00000000-0000-4000-8000-000000000203",
      sourceUrl: MOBILE_COUNTY_AL_CURRENT_SOURCE_URL,
      sourceType: "official_sheriff",
      officialInstitutionUrl: "https://official.example.test/mobile/",
      relationshipEvidenceUrl: "https://official.example.test/mobile/jail/",
      evidenceDescription: "Synthetic Mobile County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: MOBILE_COUNTY_AL_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-mobile-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

describe("Mobile County roster adapter", () => {
  it("is not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(MOBILE_COUNTY_AL_ADAPTER_KEY)).toBe(false);
  });

  it("drops a leading case or warrant number but keeps the offense", () => {
    expect(formatMobileCharge("CC21-1775.71 PROBATION REVOCATION")).toBe("PROBATION REVOCATION");
    expect(formatMobileCharge("M24-11-0809 DOMESTIC VIOLENCE 1ST")).toBe("DOMESTIC VIOLENCE 1ST");
    expect(formatMobileCharge("HC0035494 THEFT OF PROPERTY 3RD DEGREE (MISD)")).toBe(
      "THEFT OF PROPERTY 3RD DEGREE (MISD)"
    );
    expect(formatMobileCharge("3RD DEGREE BURGLARY")).toBe("3RD DEGREE BURGLARY");
    expect(formatMobileCharge("REASONABLE &amp; PRUDENT SPEED")).toBe(
      "REASONABLE &amp; PRUDENT SPEED"
    );
  });

  it("reads each person once with every charge line", async () => {
    const rows: Row[] = [
      [
        "TESTER, ALPHA — TEST ONLY",
        "9/4/2026",
        ["SYNTHETIC OFFENSE A", "CC26-0549 SYNTHETIC OFFENSE B"]
      ],
      [
        "TESTER, ALPHA — TEST ONLY",
        "9/4/2026",
        ["SYNTHETIC OFFENSE A", "CC26-0549 SYNTHETIC OFFENSE B"]
      ],
      ["TESTER, BETA — TEST ONLY", "1/20/2024", ["REASONABLE &amp; PRUDENT SPEED"]],
      ...filler(200)
    ];
    const result = await runSourceAdapter(
      createMobileCountySourceAdapter({
        fetch: async () => new Response(page(rows)),
        facilityId: "00000000-0000-4000-8000-000000000204",
        createId: () => crypto.randomUUID()
      }),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [alpha, beta] = result.snapshot.bookings;
    expect(result.snapshot.recordCount).toBe(202);
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC OFFENSE A",
      "SYNTHETIC OFFENSE B"
    ]);
    expect(beta?.charges[0]?.description).toBe("REASONABLE & PRUDENT SPEED");
    expect(JSON.stringify(result.snapshot)).not.toContain("9/4/2026");
  });

  it("fails closed on a cut-off, reshaped, or near-empty report", () => {
    expect(() => parseMobileRosterHtml(page(filler(250), { closed: false }))).toThrow(
      "RESPONSE_TRUNCATED"
    );
    expect(() =>
      parseMobileRosterHtml(page(filler(250)).replace("<th> BONDS </th>", "<th> BAIL </th>"))
    ).toThrow("ROSTER_COLUMNS_CHANGED");
    expect(() => parseMobileRosterHtml(page(filler(5)))).toThrow();
  });
});
