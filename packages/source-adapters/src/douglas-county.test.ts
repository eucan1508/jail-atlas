import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  DOUGLAS_COUNTY_ADAPTER_KEY,
  DOUGLAS_COUNTY_CURRENT_SOURCE_URL,
  createDouglasCountySourceAdapter,
  type DouglasRosterIdFactory
} from "./douglas-county.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";

type SyntheticPerson = Readonly<{ name: string; charges: readonly string[] }>;

// Mirrors the official roster markup: one result item per person, one <hr>-separated block per charge.
function rosterPage(people: readonly SyntheticPerson[], resultLine?: string): string {
  const count = people.length;
  const line = resultLine ?? `Results 1 - ${count} of ${count}`;
  return `<!doctype html><html><head><title>Douglas County | Inmate Roster</title></head><body>
    <h2>Inmate Roster sorted by Name as of 01/01/2000</h2>
    <span id="cphBody_ctl01_paginationtop"><div>${line}</div></span>
    ${people
      .map(
        (person) => `<div class="news-results-view-item">
          <h3>${person.name}</h3>
          ${person.charges
            .map(
              (charge) =>
                `<p><strong>Booking Date:</strong> 1/1/2000</p><p><strong>Booking Time:</strong> 8:00:00 PM</p><p><strong>Charges:</strong> ${charge}</p><p><strong>Arresting Agency:</strong> Synthetic Agency</p><p><strong>Status:</strong> Bail Set</p><hr>`
            )
            .join("")}
          <!--p class="summary"><p><strong>Arresting Agency:</strong>&nbsp;Synthetic Agency</p></p-->
        </div>`
      )
      .join("\n")}
    <span id="cphBody_ctl01_paginationbtm"><div>${line}</div></span>
  </body></html>`;
}

function context(sourceUrl = DOUGLAS_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000101",
    source: {
      id: "00000000-0000-4000-8000-000000000102",
      officialInstitutionId: "00000000-0000-4000-8000-000000000103",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.douglascountymn.gov/jail",
      relationshipEvidenceUrl: "https://www.douglascountymn.gov/jail",
      evidenceDescription: "Synthetic Douglas County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: DOUGLAS_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-douglas-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): DouglasRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 110;
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
  return createDouglasCountySourceAdapter({
    fetch: async (_input, init) => {
      onRequest?.(init);
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    },
    facilityId: "00000000-0000-4000-8000-000000000104",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

const people: readonly SyntheticPerson[] = [
  {
    name: "Tester, Alpha — Test Only",
    charges: ["Synthetic Offense Alpha", "Synthetic Offense Alpha", "Synthetic Offense Beta"]
  },
  { name: "Tester, Beta — Test Only", charges: ["Probation Violation"] }
];

describe("Douglas County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(DOUGLAS_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("reads every person and every charge block, keeping repeated counts", async () => {
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
    expect(alpha?.person.displayName).toBe("Tester, Alpha — Test Only");
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "Synthetic Offense Alpha",
      "Synthetic Offense Alpha",
      "Synthetic Offense Beta"
    ]);
    expect(beta?.charges.map((charge) => charge.description)).toEqual(["Probation Violation"]);
  });

  it("publishes no booking number and drops agency, status, and booking time", async () => {
    const result = await runSourceAdapter(adapter(rosterPage(people)), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.bookings[0]?.bookingIdentifier).toBeNull();
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["Synthetic Agency", "Bail Set", "8:00:00 PM"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the page shows only part of the roster", async () => {
    const result = await runSourceAdapter(
      adapter(rosterPage(people, "Results 1 - 2 of 41")),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("DOUGLAS_COUNTY_ROSTER_PAGINATED");
  });

  it("fails closed when the item count does not match the result total", async () => {
    const result = await runSourceAdapter(
      adapter(rosterPage(people, "Results 1 - 3 of 3")),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("DOUGLAS_COUNTY_RECORD_COUNT_MISMATCH");
  });

  it("fails closed when the page has neither results nor a result count", async () => {
    const html = rosterPage([]).replace(/<span id="[^"]+"><div>Results[^<]*<\/div><\/span>/g, "");
    const result = await runSourceAdapter(adapter(html), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("DOUGLAS_COUNTY_ROSTER_STRUCTURE_MISSING");
  });

  it("rejects a page that is not the Douglas County roster", async () => {
    const result = await runSourceAdapter(
      adapter(rosterPage(people).replace("Douglas County | Inmate Roster", "Example County")),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("DOUGLAS_COUNTY_SOURCE_IDENTITY_MISMATCH");
  });

  it("refuses a source URL other than the approved roster", async () => {
    const result = await runSourceAdapter(
      adapter(rosterPage(people)),
      context("https://www.douglascountymn.gov/jail")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("DOUGLAS_COUNTY_SOURCE_URL_MISMATCH");
  });
});
