import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  CROW_WING_COUNTY_ADAPTER_KEY,
  CROW_WING_COUNTY_CURRENT_SOURCE_URL,
  createCrowWingCountySourceAdapter,
  type CrowWingRosterIdFactory
} from "./crow-wing-county.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";

type SyntheticPerson = Readonly<{
  name: string;
  bookingNumber: string;
  charges: readonly Readonly<{ statute: string; description: string }>[];
}>;

const header = ["Photo", "MNI", "Name", "Sex", "Age", "Booking #", "Intake Date", "Charges"];

// Mirrors the official "In Custody" export: one DataGrid row per person with a nested charge table.
function rosterPage(
  people: readonly SyntheticPerson[],
  options: { stamp?: string; columns?: readonly string[] } = {}
): string {
  const stamp = options.stamp ?? "01-01-2000 12:00";
  const columns = options.columns ?? header;
  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" >
<HTML><HEAD><title>Custody</title></HEAD><body>
<center><table border="0"><tr><td><img src="x.jpg"></td>
<td>Crow Wing County Jail<br>In Custody ${stamp}</td></tr></table></center>
<form name="Form1"><table class="smallText" id="PopulationReport1_DataGrid1">
<tr class="headerClass">${columns.map((column) => `<td><b>${column}</b></td>`).join("")}</tr>
${people
  .map(
    (person) => `<tr><td><img src="p.jpg"></td><td>999999</td><td>${person.name}</td><td>M</td>
<td><span>99</span></td><td>${person.bookingNumber}</td><td><span>01-01-2000 08:00</span></td>
<td><table>${person.charges
      .map(
        (
          charge
        ) => `<tr><td>M</td><td>-</td><td>BOND/BAIL SET</td><td>-</td><td>${charge.statute}</td><td></td></tr>
<tr><td colspan="6">${charge.description}</td></tr><tr><td style="HEIGHT: 1px"></td></tr>`
      )
      .join("")}</table></td></tr>`
  )
  .join("\n")}
</table></form></body>
</HTML>
`;
}

function context(sourceUrl = CROW_WING_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000161",
    source: {
      id: "00000000-0000-4000-8000-000000000162",
      officialInstitutionId: "00000000-0000-4000-8000-000000000163",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.crowwing.gov/396/Jail",
      relationshipEvidenceUrl: "https://www.crowwing.gov/1747/In-Custody-List",
      evidenceDescription: "Synthetic Crow Wing County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: CROW_WING_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T20:00:00.000Z",
    traceId: "synthetic-crow-wing-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): CrowWingRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 170;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function adapter(html: string, onRequest?: (init?: RequestInit) => void) {
  return createCrowWingCountySourceAdapter({
    fetch: async (_input, init) => {
      onRequest?.(init);
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    },
    facilityId: "00000000-0000-4000-8000-000000000164",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

const people: readonly SyntheticPerson[] = [
  {
    name: "Tester, Alpha Test Only",
    bookingNumber: "10001",
    charges: [
      { statute: "999.11.1(a)", description: "Synthetic Offense Alpha" },
      { statute: "999.22", description: "Synthetic Offense Beta" }
    ]
  },
  {
    name: "Tester, Beta Test Only",
    bookingNumber: "10002",
    charges: [{ statute: "609.14", description: "Synthetic Violation" }]
  }
];

describe("Crow Wing County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(CROW_WING_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads each person, the booking number, and statute-coded charges", async () => {
    let requestInit: RequestInit | undefined;
    const result = await runSourceAdapter(
      adapter(rosterPage(people), (init) => (requestInit = init)),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(requestInit?.redirect).toBe("error");
    expect(result.snapshot.recordCount).toBe(2);
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("Tester, Alpha Test Only");
    expect(alpha?.bookingIdentifier?.value).toBe("10001");
    expect(alpha?.charges.map((charge) => [charge.statuteCode, charge.description])).toEqual([
      ["999.11.1(a)", "Synthetic Offense Alpha"],
      ["999.22", "Synthetic Offense Beta"]
    ]);
    expect(beta?.charges).toHaveLength(1);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["999999", "BOND/BAIL SET", "01-01-2000 08:00"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the download is cut off", async () => {
    const html = rosterPage(people);
    const result = await runSourceAdapter(
      adapter(html.slice(0, html.indexOf("Tester, Beta"))),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CROW_WING_COUNTY_RESPONSE_TRUNCATED");
  });

  it("fails closed when the export has stopped updating", async () => {
    const result = await runSourceAdapter(
      adapter(rosterPage(people, { stamp: "12-25-1999 12:00" })),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CROW_WING_COUNTY_SOURCE_STALE");
  });

  it("fails closed when the column layout changes", async () => {
    const result = await runSourceAdapter(
      adapter(rosterPage(people, { columns: header.filter((column) => column !== "MNI") })),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CROW_WING_COUNTY_ROSTER_COLUMNS_CHANGED");
  });

  it("fails closed on an empty or duplicated roster", async () => {
    const empty = await runSourceAdapter(adapter(rosterPage([])), context());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.failure.diagnosticCode).toBe("CROW_WING_COUNTY_ROSTER_EMPTY");

    const duplicate = await runSourceAdapter(
      adapter(rosterPage([people[0]!, { ...people[1]!, bookingNumber: "10001" }])),
      context()
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.failure.diagnosticCode).toBe("CROW_WING_COUNTY_DUPLICATE_BOOKING_NUMBER");
    }
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter(rosterPage(people)),
      context("https://www3.crowwing.us/letg/Sheriff/Jail/custody.html")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CROW_WING_COUNTY_SOURCE_URL_MISMATCH");
  });
});
