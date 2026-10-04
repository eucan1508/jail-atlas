import { describe, expect, it } from "vitest";

import {
  ARKANSAS_ROSTER_SITES,
  CLEBURNE_COUNTY_AR_ROSTER,
  JEFFERSON_COUNTY_AR_ROSTER
} from "./arkansas-rosters.js";
import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  createSheriffRosterSiteAdapter,
  type SheriffRosterIdFactory,
  type SheriffRosterSiteConfig
} from "./sheriff-roster-site.js";

type SyntheticRecord = Readonly<{
  bookingNumber: string;
  name: string;
  charges: readonly string[];
  bond?: string;
}>;

function context(config: SheriffRosterSiteConfig, sourceUrl = config.sourceUrl): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000081",
    source: {
      id: "00000000-0000-4000-8000-000000000082",
      officialInstitutionId: "00000000-0000-4000-8000-000000000083",
      sourceUrl,
      sourceType: "official_agency",
      officialInstitutionUrl: new URL("/", config.sourceUrl).href,
      relationshipEvidenceUrl: new URL("/", config.sourceUrl).href,
      evidenceDescription: "Synthetic sheriff roster adapter test evidence.",
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
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-sheriff-roster-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): SheriffRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 90;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function adapter(config: SheriffRosterSiteConfig, documents: ReadonlyMap<string, string>) {
  return createSheriffRosterSiteAdapter(config, {
    fetch: async (input) => {
      const html = documents.get(input);
      return new Response(html ?? "Synthetic missing response", { status: html ? 200 : 404 });
    },
    facilityId: "00000000-0000-4000-8000-000000000084",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

// Mirrors the roster.php card markup (Jefferson County layout).
function rosterPhpPage(
  county: string,
  count: number,
  records: readonly SyntheticRecord[],
  links: readonly string[] = []
): string {
  return `<!doctype html><html><head><title>${county} Sheriff</title></head><body>
    <h1>Inmate Roster (${count})</h1>
    ${records
      .map(
        (record) => `<div class="card">
          <img alt="Mugshot of ${record.name}">
          <p>Booking #:</p><p>${record.bookingNumber}</p>
          <p>Booking Date:</p><p>01-01-2000 - 12:00 pm</p>
          <p>Charges:</p><p>${record.charges.join("<br>")}</p>
          ${record.bond ? `<p>Bond:</p><p>${record.bond}</p>` : ""}
          <a href="/roster_view.php?booking_num=${record.bookingNumber}">View Profile &gt;&gt;&gt;</a>
        </div>`
      )
      .join("\n")}
    ${links.map((href, index) => `<a href="${href}">${index + 2}</a>`).join(" ")}
    <a href="https://www.example.com/elsewhere">Elsewhere</a>
  </body></html>`;
}

// Mirrors the /inmate-roster/ card markup (Greene and Cleburne County layout).
function rosterPathPage(
  county: string,
  count: number,
  records: readonly (SyntheticRecord & { profileId: string })[],
  links: readonly string[] = []
): string {
  return `<!doctype html><html><head><title>Inmate Roster | ${county} AR Sheriff's Office</title></head><body>
    <h1 class="ptitles">Inmate Roster (${count})</h1>
    <a href="/inmate-roster/filters/current/name=asc/1">Name</a>
    <a href="/inmate-roster/filters/released/release_time=desc/1">Released</a>
    <div class="row">
    ${records
      .map(
        (record) => `<div class="col-lg-6"><div class="row">
          <div class="inmate_mugshot"><img src="/x.jpg" alt="${record.name}"></div>
          <div class="inmate_data">
            <div class="roster_name">${record.name}</div>
            <div><div class="inmate_data_bold"><strong>Booking #: </strong></div>
              <div class="inmate_data_content">${record.bookingNumber}</div></div>
            <div><div class="inmate_data_bold"><strong>Age: </strong></div>
              <div class="inmate_data_content">99</div></div>
            <div><div class="inmate_data_bold"><strong>Booking Date: </strong></div>
              <div class="inmate_data_content">01-01-2000 12:00 PM</div></div>
            ${
              record.charges.length > 0
                ? `<div><div class="inmate_data_bold"><strong>Charges: </strong></div>
              <div class="inmate_data_content">${record.charges.join("<br> ")}</div></div>`
                : ""
            }
            ${
              record.bond
                ? `<div><div class="inmate_data_bold"><strong>Bond: </strong></div>
              <div class="inmate_data_content">${record.bond}</div></div>`
                : ""
            }
            <em><a aria-label="View Profile ${record.name}" href="/inmate-roster/${record.profileId}"><strong>View Profile &gt;&gt;&gt;</strong></a></em>
          </div>
        </div></div>`
      )
      .join("\n")}
    </div>
    ${links.map((href, index) => `<a href="${href}">${index + 2}</a>`).join(" ")}
  </body></html>`;
}

const jeffersonPage = (offset: number) => `${JEFFERSON_COUNTY_AR_ROSTER.sourceUrl}?grp=${offset}`;
const cleburnePage = (page: number) =>
  `https://www.cleburnearso.gov/inmate-roster/filters/current/booking_time=desc/${page}`;

describe("sheriff roster site adapter", () => {
  it("keeps every Arkansas roster out of the default registry", () => {
    for (const site of ARKANSAS_ROSTER_SITES) {
      expect(sourceAdapterRegistry.has(site.adapterKey)).toBe(false);
    }
  });

  it("follows roster.php pager links that repeat the page parameter", async () => {
    const config = JEFFERSON_COUNTY_AR_ROSTER;
    const result = await runSourceAdapter(
      adapter(
        config,
        new Map([
          [
            config.sourceUrl,
            rosterPhpPage(
              "Jefferson County",
              3,
              [
                {
                  bookingNumber: "900001",
                  name: "TESTER, ALPHA — TEST ONLY",
                  charges: ["SYNTHETIC OFFENSE ALPHA", "SYNTHETIC OFFENSE BETA"],
                  bond: "$1,500.00"
                }
              ],
              ["roster.php?grp=20"]
            )
          ],
          [
            jeffersonPage(20),
            rosterPhpPage(
              "Jefferson County",
              3,
              [{ bookingNumber: "900002", name: "TESTER, BETA — TEST ONLY", charges: ["HOLD"] }],
              ["roster.php?grp=20&grp=40"]
            )
          ],
          [
            jeffersonPage(40),
            rosterPhpPage("Jefferson County", 3, [
              { bookingNumber: "900003", name: "TESTER, GAMMA — TEST ONLY", charges: ["HOLD"] }
            ])
          ]
        ])
      ),
      context(config)
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(3);
    const [alpha] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("TESTER, ALPHA — TEST ONLY");
    expect(alpha?.bookingIdentifier?.value).toBe("900001");
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC OFFENSE ALPHA",
      "SYNTHETIC OFFENSE BETA"
    ]);
    expect(alpha?.bondEntries[0]?.amountMinor).toBe(150_000);
  });

  it("reads path-style rosters, including cards without charges, and skips other filters", async () => {
    const config = CLEBURNE_COUNTY_AR_ROSTER;
    const requested: string[] = [];
    const documents = new Map([
      [
        cleburnePage(1),
        rosterPathPage(
          "Cleburne County",
          2,
          [
            {
              bookingNumber: "00-B-00001",
              name: "ALPHA TESTER",
              profileId: "0123456789abcdef01234567",
              charges: ["SYNTHETIC OFFENSE ALPHA", "SYNTHETIC OFFENSE BETA"],
              bond: "$790.00"
            }
          ],
          ["/inmate-roster/filters/current/booking_time=desc/2"]
        )
      ],
      [
        cleburnePage(2),
        rosterPathPage("Cleburne County", 2, [
          {
            bookingNumber: "00-B-00002",
            name: "BETA TESTER",
            profileId: "0123456789abcdef01234568",
            charges: []
          }
        ])
      ]
    ]);
    const result = await runSourceAdapter(
      createSheriffRosterSiteAdapter(config, {
        fetch: async (input) => {
          requested.push(input);
          const html = documents.get(input);
          return new Response(html ?? "missing", { status: html ? 200 : 404 });
        },
        facilityId: "00000000-0000-4000-8000-000000000084",
        createId: idFactory()
      }),
      context(config)
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(requested).toEqual([cleburnePage(1), cleburnePage(2)]);
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("ALPHA TESTER");
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC OFFENSE ALPHA",
      "SYNTHETIC OFFENSE BETA"
    ]);
    expect(alpha?.bondEntries[0]?.amountMinor).toBe(79_000);
    expect(beta?.person.displayName).toBe("BETA TESTER");
    expect(beta?.bookingIdentifier?.value).toBe("00-B-00002");
    expect(beta?.charges).toEqual([]);
    expect(JSON.stringify(result.snapshot)).not.toContain("01-01-2000");
  });

  it("fails closed when the crawl collects fewer records than the roster heading", async () => {
    const config = JEFFERSON_COUNTY_AR_ROSTER;
    const result = await runSourceAdapter(
      adapter(
        config,
        new Map([
          [
            config.sourceUrl,
            rosterPhpPage("Jefferson County", 21, [
              { bookingNumber: "900001", name: "TESTER, ALPHA — TEST ONLY", charges: ["HOLD"] }
            ])
          ]
        ])
      ),
      context(config)
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("JEFFERSON_COUNTY_AR_RECORD_COUNT_MISMATCH");
  });

  it("accepts an explicit zero heading as a valid empty roster", async () => {
    const config = CLEBURNE_COUNTY_AR_ROSTER;
    const result = await runSourceAdapter(
      adapter(config, new Map([[cleburnePage(1), rosterPathPage("Cleburne County", 0, [])]])),
      context(config)
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emptyResult.kind).toBe("valid_empty");
  });

  it("rejects a page that is not the named county's roster", async () => {
    const config = JEFFERSON_COUNTY_AR_ROSTER;
    const result = await runSourceAdapter(
      adapter(
        config,
        new Map([
          [
            config.sourceUrl,
            rosterPhpPage("Lincoln County", 1, [
              { bookingNumber: "900001", name: "TESTER, ALPHA — TEST ONLY", charges: ["HOLD"] }
            ])
          ]
        ])
      ),
      context(config)
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("JEFFERSON_COUNTY_AR_SOURCE_IDENTITY_MISMATCH");
  });

  it("refuses a source URL other than the approved roster", async () => {
    const config = CLEBURNE_COUNTY_AR_ROSTER;
    const result = await runSourceAdapter(
      adapter(config, new Map()),
      context(
        config,
        "https://www.cleburnearso.gov/inmate-roster/filters/released/release_time=desc/1"
      )
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("CLEBURNE_COUNTY_AR_SOURCE_URL_MISMATCH");
  });
});
