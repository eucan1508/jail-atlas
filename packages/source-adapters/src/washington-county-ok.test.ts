import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  WASHINGTON_COUNTY_OK_ADAPTER_KEY,
  WASHINGTON_COUNTY_OK_CURRENT_SOURCE_URL,
  createWashingtonCountyOkSourceAdapter,
  parseWashingtonOkCharges,
  type WashingtonOkRosterIdFactory
} from "./washington-county-ok.js";

type SyntheticBooking = Readonly<{
  bookingId: string;
  fullName: string;
  charges: string | null;
}>;

const bookings: readonly SyntheticBooking[] = [
  {
    bookingId: "2000-00000001",
    fullName: "TESTER, ALPHA ONLY",
    charges: "SYNTHETIC OFFENSE ALPHA<br> &bull; SYNTHETIC OFFENSE BETA"
  },
  { bookingId: "2000-00000002", fullName: "TESTER, BETA", charges: null }
];

function context(sourceUrl = WASHINGTON_COUNTY_OK_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: "00000000-0000-4000-8000-000000000401",
    source: {
      id: "00000000-0000-4000-8000-000000000402",
      officialInstitutionId: "00000000-0000-4000-8000-000000000403",
      sourceUrl,
      sourceType: "official_county",
      officialInstitutionUrl: "https://www.washingtoncosheriff.com/",
      relationshipEvidenceUrl: "https://www.washingtoncosheriff.com/inmate-search",
      evidenceDescription: "Synthetic Washington County, Oklahoma adapter test evidence.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: WASHINGTON_COUNTY_OK_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T18:00:00.000Z",
    traceId: "synthetic-washington-ok-adapter-test",
    signal: new AbortController().signal,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function idFactory(): WashingtonOkRosterIdFactory {
  const ids = new Map<string, string>();
  let sequence = 610;
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
  const source = createWashingtonCountyOkSourceAdapter({
    fetch: async (input) => {
      requested.push(input);
      if (new URL(input).pathname.endsWith("/Read2.php")) {
        return json({
          queryCount: (overrides.idList ?? roster.map((booking) => booking.bookingId)).map(
            (id) => ({
              BookingID: id
            })
          )
        });
      }
      return json({
        querybookings: {
          offset: 0,
          limit: 200,
          total: overrides.total ?? roster.length,
          data: roster.map((booking) => ({
            BookingID: booking.bookingId,
            bookieID: "-1",
            fullName: booking.fullName,
            fName: "TESTER",
            mName: "",
            lName: "SYNTHETIC",
            Race: "Synthetic Race",
            Gender: "Synthetic Gender",
            Age: "199",
            Locale: "SYNTHVILLE",
            bondTotal: "98765.00",
            bookieImg: "synthetic-photo.jpg",
            BookingDate: "2000-01-01 08:00:00",
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

describe("Washington County, Oklahoma source adapter", () => {
  it("is reviewable but not enabled in the default registry", () => {
    expect(sourceAdapterRegistry.has(WASHINGTON_COUNTY_OK_ADAPTER_KEY)).toBe(false);
  });

  it("reads names and bulleted charges, shows no booking number, and keeps no personal details", async () => {
    const { source, requested } = adapter(bookings);
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(requested).toHaveLength(2);
    expect(result.snapshot.recordCount).toBe(2);
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.bookingIdentifier).toBeNull();
    expect(alpha?.person.displayName).toBe("TESTER, ALPHA ONLY");
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC OFFENSE ALPHA",
      "SYNTHETIC OFFENSE BETA"
    ]);
    expect(beta?.charges).toEqual([]);
    const serialized = JSON.stringify(result.snapshot);
    for (const excluded of [
      "Synthetic Race",
      "Synthetic Gender",
      "199",
      "SYNTHVILLE",
      "98765",
      "synthetic-photo",
      "2000-01-01 08:00"
    ]) {
      expect(serialized).not.toContain(excluded);
    }
  });

  it("fails closed when the list total and its rows disagree", async () => {
    const result = await runSourceAdapter(adapter(bookings, { total: 3 }).source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_OK_RECORD_COUNT_MISMATCH");
  });

  it("retries, then fails closed, when the two official lists keep disagreeing", async () => {
    const { source, requested } = adapter(bookings, { idList: ["2000-00000001"] });
    const result = await runSourceAdapter(source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_OK_ROSTER_CHANGED_DURING_CRAWL");
    expect(requested.filter((url) => url.endsWith("Read2.php"))).toHaveLength(3);
  });

  it("fails closed when a booking ID is not in the county's year-number form", async () => {
    const result = await runSourceAdapter(
      adapter([{ ...bookings[0]!, bookingId: "12345" }]).source,
      context()
    );
    expect(result.ok).toBe(false);
  });

  it("fails closed on an empty roster or a person listed twice", async () => {
    const empty = await runSourceAdapter(adapter([]).source, context());
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_OK_ROSTER_EMPTY");

    const twice = await runSourceAdapter(
      adapter([bookings[0]!, { ...bookings[1]!, bookingId: bookings[0]!.bookingId }], {
        idList: [bookings[0]!.bookingId, bookings[1]!.bookingId]
      }).source,
      context()
    );
    expect(twice.ok).toBe(false);
    if (!twice.ok) {
      expect(twice.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_OK_DUPLICATE_BOOKING_ID");
    }
  });

  it("fails closed when too many people have no charges listed", async () => {
    const blank = ["2000-00000003", "2000-00000004", "2000-00000005"].map((bookingId) => ({
      bookingId,
      fullName: `TESTER, BLANK ${bookingId}`,
      charges: null
    }));
    const result = await runSourceAdapter(adapter([bookings[0]!, ...blank]).source, context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_OK_CHARGES_MISSING");
  });

  it("refuses a source URL other than the approved inmate search", async () => {
    const result = await runSourceAdapter(
      adapter(bookings).source,
      context("https://www.washingtoncosheriff.com/dmxConnect/api/Booking/Other.php")
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WASHINGTON_COUNTY_OK_SOURCE_URL_MISMATCH");
  });

  it("splits charges at line breaks and drops the bullets and empty entries", () => {
    expect(parseWashingtonOkCharges(null)).toEqual([]);
    expect(parseWashingtonOkCharges("<br> &bull; SYNTHETIC WARRANT ")).toEqual([
      "SYNTHETIC WARRANT"
    ]);
    expect(parseWashingtonOkCharges("SYNTHETIC OFFENSE<br> &bull; ")).toEqual([
      "SYNTHETIC OFFENSE"
    ]);
    expect(parseWashingtonOkCharges("ONE<br/>&bull; TWO<BR> &bull;  THREE ")).toEqual([
      "ONE",
      "TWO",
      "THREE"
    ]);
  });
});
