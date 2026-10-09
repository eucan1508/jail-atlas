import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  LINCOLN_COUNTY_OK_ADAPTER_KEY,
  LINCOLN_COUNTY_OK_CURRENT_SOURCE_URL,
  createLincolnCountyOkSourceAdapter,
  parseLincolnCharges,
  type LincolnRosterIdFactory
} from "./lincoln-county-ok.js";

type SyntheticBooking = Readonly<{
  inmateId: string;
  bookingNum: string;
  fullName: string;
  charges: string | null;
  releaseDate?: string;
}>;

const bookings: readonly SyntheticBooking[] = [
  {
    inmateId: "90001",
    bookingNum: "2000-000001",
    fullName: "TESTER, ALPHA ONLY",
    charges: "SYNTHETIC OFFENSE ALPHA<br> &bull; SYNTHETIC OFFENSE BETA"
  },
  { inmateId: "90002", bookingNum: "2000-000002", fullName: "TESTER, BETA", charges: null }
];

function context(sourceUrl = LINCOLN_COUNTY_OK_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000401",
    source: {
      id: "00000000-0000-4000-8000-000000000402",
      officialInstitutionId: "00000000-0000-4000-8000-000000000403",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://lincolncountysheriffok.gov/",
      relationshipEvidenceUrl: "https://lincolncountysheriffok.gov/inmate-search",
      evidenceDescription: "Synthetic Lincoln County adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: LINCOLN_COUNTY_OK_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-lincoln-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): LincolnRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 410;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing) return existing;
    const id = `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`;
    ids.set(key, id);
    return id;
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function adapter(
  roster: readonly SyntheticBooking[],
  overrides: { total?: number; idList?: readonly string[] } = {}
) {
  const requested: string[] = [];
  const source = createLincolnCountyOkSourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      if (new URL(input).pathname.endsWith("/Read2.php")) {
        return json({
          query: (overrides.idList ?? roster.map((booking) => booking.inmateId)).map((id) => ({
            InmateId: id
          }))
        });
      }
      return json({
        querybookings: {
          offset: 0,
          limit: 200,
          total: overrides.total ?? roster.length,
          data: roster.map((booking) => ({
            BookingID: "1",
            InmateID: booking.inmateId,
            BookingNum: booking.bookingNum,
            BookingDate: "2000-01-01T08:00:00",
            ReleaseDate: booking.releaseDate ?? "",
            FullName: booking.fullName,
            DOB: "1900-01-01 00:00:00",
            Address: "1 SYNTHETIC STREET",
            City: "SYNTHVILLE",
            Classification: "Held for Court",
            Charges: booking.charges
          }))
        }
      });
    },
    facilityId: "00000000-0000-4000-8000-000000000404",
    createId: idFactory()
  });
  return { source, requested };
}

describe("Lincoln County, Oklahoma source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(LINCOLN_COUNTY_OK_ADAPTER_KEY)).toBe(false);
  });

  it("reads names, booking numbers, and bulleted charges, and keeps no personal details", async () => {
    const { source, requested } = adapter(bookings);
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(requested).toHaveLength(2);
    expect(result.snapshot.recordCount).toBe(2);
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.bookingIdentifier?.value).toBe("2000-000001");
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC OFFENSE ALPHA",
      "SYNTHETIC OFFENSE BETA"
    ]);
    expect(beta?.charges).toEqual([]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of ["1900-01-01", "SYNTHETIC STREET", "SYNTHVILLE", "Held for Court"]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the list total and its rows disagree", async () => {
    const result = await runSourceAdapter(adapter(bookings, { total: 3 }).source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("LINCOLN_COUNTY_OK_RECORD_COUNT_MISMATCH");
  });

  it("retries, then fails closed, when the two official lists keep disagreeing", async () => {
    const { source, requested } = adapter(bookings, { idList: ["90001"] });
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("LINCOLN_COUNTY_OK_ROSTER_CHANGED_DURING_CRAWL");
    expect(requested.filter((url) => url.endsWith("Read2.php"))).toHaveLength(3);
  });

  it("fails closed when the list includes a released booking", async () => {
    const result = await runSourceAdapter(
      adapter([{ ...bookings[0]!, releaseDate: "2000-01-01T09:00:00" }]).source,
      context()
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("LINCOLN_COUNTY_OK_RELEASED_BOOKING_LISTED");
  });

  it("fails closed on an empty roster or a duplicate booking number", async () => {
    const empty = await runSourceAdapter(adapter([]).source, context());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.failure.diagnosticCode).toBe("LINCOLN_COUNTY_OK_ROSTER_EMPTY");

    const duplicate = await runSourceAdapter(
      adapter([bookings[0]!, { ...bookings[1]!, bookingNum: "2000-000001" }]).source,
      context()
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.failure.diagnosticCode).toBe("LINCOLN_COUNTY_OK_DUPLICATE_BOOKING_NUMBER");
    }
  });

  it("refuses a source URL other than the approved inmate search", async () => {
    const result = await runSourceAdapter(
      adapter(bookings).source,
      context("https://lincolncountysheriffok.gov/dmxConnect/api/Booking/Other.php")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("LINCOLN_COUNTY_OK_SOURCE_URL_MISMATCH");
  });

  it("splits charges at line breaks and drops the bullets", () => {
    expect(parseLincolnCharges(null)).toEqual([]);
    expect(parseLincolnCharges("ONE<br/>&bull; TWO<BR> &bull;  THREE ")).toEqual([
      "ONE",
      "TWO",
      "THREE"
    ]);
  });
});
