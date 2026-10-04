import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  KLEBERG_COUNTY_ADAPTER_KEY,
  KLEBERG_COUNTY_CURRENT_SOURCE_URL,
  createKlebergCountySourceAdapter,
  type KlebergRosterFetch,
  type KlebergRosterIdFactory
} from "./kleberg-county.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";

const pageTwoUrl = `${KLEBERG_COUNTY_CURRENT_SOURCE_URL}?grp=20`;

function syntheticPage(
  count: number,
  records: readonly Readonly<{
    bookingNumber: string;
    name: string;
    charge: string;
    bond: string;
  }>[],
  nextUrl?: string
): string {
  return `<!doctype html><html><head><title>Kleberg County Sheriff</title></head><body>
    <h1>Inmate Roster (${count})</h1>
    ${records
      .map(
        (record) => `<article>
          <img alt="Mugshot of ${record.name}">
          <p>Booking #:</p><p>${record.bookingNumber}</p>
          <p>Booking Date:</p><p>01-01-2000 - 12:00 pm</p>
          <p>Charges:</p><p>${record.charge}</p>
          <p>Bond:</p><p>${record.bond}</p>
          <a href="/roster_view.php?booking_num=${record.bookingNumber}">View Profile &gt;&gt;&gt;</a>
        </article>`
      )
      .join("\n")}
    ${nextUrl ? `<a href="${nextUrl}">2</a>` : ""}
  </body></html>`;
}

function context(sourceUrl = KLEBERG_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    source: {
      id: "00000000-0000-4000-8000-000000000002",
      officialInstitutionId: "00000000-0000-4000-8000-000000000003",
      sourceUrl,
      sourceType: "official_agency",
      officialInstitutionUrl: "https://www.klebergcoso.org/",
      relationshipEvidenceUrl: "https://www.klebergcoso.org/",
      evidenceDescription: "Synthetic Kleberg County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: KLEBERG_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-kleberg-adapter-test",
    signal: new AbortController().signal,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function idFactory(): KlebergRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 10;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function adapter(documents: ReadonlyMap<string, string>) {
  const fetch: KlebergRosterFetch = async (input) => {
    const html = documents.get(input);
    return new Response(html ?? "Synthetic missing response", { status: html ? 200 : 404 });
  };
  return createKlebergCountySourceAdapter({
    fetch,
    facilityId: "00000000-0000-4000-8000-000000000004",
    createId: idFactory(),
    nowMs: () => 1_000
  });
}

describe("Kleberg County source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(KLEBERG_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("collects the official roster pagination using fictional fixtures", async () => {
    const result = await runSourceAdapter(
      adapter(
        new Map([
          [
            KLEBERG_COUNTY_CURRENT_SOURCE_URL,
            syntheticPage(
              2,
              [
                {
                  bookingNumber: "SYNTHETIC-001",
                  name: "TESTER, ALPHA — TEST ONLY",
                  charge: "SYNTHETIC CHARGE ALPHA — TEST ONLY",
                  bond: "$0.00"
                }
              ],
              "/roster.php?grp=20&orderby=1"
            )
          ],
          [
            pageTwoUrl,
            syntheticPage(2, [
              {
                bookingNumber: "SYNTHETIC-002",
                name: "TESTER, BETA — TEST ONLY",
                charge: "SYNTHETIC CHARGE BETA — TEST ONLY",
                bond: "$1,250.00"
              }
            ])
          ]
        ])
      ),
      context()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(2);
    expect(result.snapshot.bookings[0]?.bookedAt).toBeNull();
    expect(result.snapshot.bookings[0]?.bondEntries[0]).toMatchObject({
      state: "monetary",
      amountMinor: 0,
      note: "The source displays $0.00; this is not interpreted as no bond."
    });
    expect(result.snapshot.bookings[1]?.bondEntries[0]?.amountMinor).toBe(125_000);
  });

  it("canonicalizes pagination links to the approved current-roster ordering", async () => {
    const result = await runSourceAdapter(
      adapter(
        new Map([
          [
            KLEBERG_COUNTY_CURRENT_SOURCE_URL,
            syntheticPage(
              2,
              [
                {
                  bookingNumber: "SYNTHETIC-003",
                  name: "TESTER, GAMMA — TEST ONLY",
                  charge: "SYNTHETIC CHARGE GAMMA — TEST ONLY",
                  bond: "$25.00"
                }
              ],
              "/roster.php?sort=1&grp=20&orderby=1"
            )
          ],
          [
            pageTwoUrl,
            syntheticPage(2, [
              {
                bookingNumber: "SYNTHETIC-004",
                name: "TESTER, DELTA — TEST ONLY",
                charge: "SYNTHETIC CHARGE DELTA — TEST ONLY",
                bond: "$50.00"
              }
            ])
          ]
        ])
      ),
      context()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(2);
  });

  it("uses the visible inmate name instead of the sheriff office number", async () => {
    const result = await runSourceAdapter(
      adapter(
        new Map([
          [
            KLEBERG_COUNTY_CURRENT_SOURCE_URL,
            `<!doctype html><html><head><title>Kleberg County Sheriff</title></head><body>
              <h1>Inmate Roster (1)</h1>
              <article>
                <p>TESTER, NAME — TEST ONLY</p>
                <p>SO #:</p><p>K25-00656</p>
                <p>Booking #:</p><p>SYNTHETIC-005</p>
                <p>Booking Date:</p><p>01-01-2000 - 12:00 pm</p>
                <p>Charges:</p><p>SYNTHETIC CHARGE — TEST ONLY</p>
                <p>Bond:</p><p>Pending</p>
                <a href="/roster_view.php?booking_num=SYNTHETIC-005">View Profile &gt;&gt;&gt;</a>
              </article>
            </body></html>`
          ]
        ])
      ),
      context()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.bookings[0]?.person.displayName).toBe("TESTER, NAME — TEST ONLY");
    expect(result.snapshot.bookings[0]?.person.displayName).not.toBe("K25-00656");
  });

  it("accepts only an explicit zero-count roster as valid empty", async () => {
    const result = await runSourceAdapter(
      adapter(new Map([[KLEBERG_COUNTY_CURRENT_SOURCE_URL, syntheticPage(0, [])]])),
      context()
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emptyResult.kind).toBe("valid_empty");
    expect(result.snapshot.recordCount).toBe(0);
  });

  it("fails closed for a page that is not the official Kleberg roster", async () => {
    const result = await runSourceAdapter(
      adapter(
        new Map([
          [
            KLEBERG_COUNTY_CURRENT_SOURCE_URL,
            "<html><head><title>Other source</title></head><body><h1>Inmate Roster (0)</h1></body></html>"
          ]
        ])
      ),
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toContain("SOURCE_IDENTITY_MISMATCH");
  });
});
