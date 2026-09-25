import {
  assertSyntheticDallasSourceFixtureSafety,
  syntheticDallasAlphaDetail,
  syntheticDallasBetaDetail,
  syntheticDallasListPageOne,
  syntheticDallasListPageTwo,
  syntheticDallasSourceHtmlFixture,
  syntheticDallasValidEmptyPage,
  syntheticId
} from "@jail-atlas/test-fixtures";
import { describe, expect, it, vi } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  DALLAS_COUNTY_ADAPTER_KEY,
  DALLAS_COUNTY_CURRENT_SOURCE_URL,
  createDallasCountySourceAdapter,
  type DallasIdFactory,
  type DallasSourceFetch
} from "./dallas-county.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";

const pageTwoUrl = `${DALLAS_COUNTY_CURRENT_SOURCE_URL}&Page=2`;
const alphaUrl =
  "https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas/Inmate/Detail/synthetic-alpha-test-only";
const betaUrl =
  "https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas/Inmate/Detail/synthetic-beta-test-only";

function context(sourceUrl = DALLAS_COUNTY_CURRENT_SOURCE_URL): AdapterContext {
  return {
    runId: syntheticId(8_001),
    source: {
      id: syntheticId(8_002),
      officialInstitutionId: syntheticId(8_003),
      sourceUrl,
      sourceType: "officially_linked_vendor",
      officialInstitutionUrl: "https://official.example.test/dallas-county/",
      relationshipEvidenceUrl: "https://official.example.test/dallas-county/custody/",
      evidenceDescription: "Synthetic Dallas adapter contract evidence for tests only.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: {
        kind: "current_only",
        description: "Synthetic current-only adapter test scope."
      },
      adapterKey: DALLAS_COUNTY_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-dallas-adapter-test",
    signal: new AbortController().signal,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function fixtureMap(overrides: Readonly<Record<string, string>> = {}): ReadonlyMap<string, string> {
  return new Map([
    [DALLAS_COUNTY_CURRENT_SOURCE_URL, syntheticDallasListPageOne],
    [pageTwoUrl, syntheticDallasListPageTwo],
    [alphaUrl, syntheticDallasAlphaDetail],
    [betaUrl, syntheticDallasBetaDetail],
    ...Object.entries(overrides)
  ]);
}

function fixtureFetch(
  documents: ReadonlyMap<string, string>,
  calls: string[] = []
): DallasSourceFetch {
  return async (input, init) => {
    calls.push(input);
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("error");
    const html = documents.get(input);
    if (html === undefined) {
      return new Response("Synthetic missing response", {
        status: 404,
        headers: { "content-type": "text/plain" }
      });
    }
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  };
}

function idFactory(): DallasIdFactory {
  const ids = new Map<string, string>();
  let sequence = 9_000;
  return (kind, sourceKey) => {
    const key = `${kind}|${sourceKey}`;
    const existing = ids.get(key);
    if (existing !== undefined) return existing;
    const id = syntheticId(sequence++);
    ids.set(key, id);
    return id;
  };
}

function adapter(documents: ReadonlyMap<string, string>, calls: string[] = []) {
  return createDallasCountySourceAdapter({
    fetch: fixtureFetch(documents, calls),
    facilityId: syntheticId(8_004),
    createId: idFactory(),
    currency: "USD",
    nowMs: () => 1_000
  });
}

describe("Dallas County source adapter", () => {
  it("is exported for review but is not activated in the default registry", () => {
    expect(sourceAdapterRegistry.has(DALLAS_COUNTY_ADAPTER_KEY)).toBe(false);
  });

  it("uses only hand-authored fictional source fixtures", () => {
    expect(assertSyntheticDallasSourceFixtureSafety(syntheticDallasSourceHtmlFixture)).toBe(true);
  });

  it("follows emitted pagination and preserves booking-local charges and bonds", async () => {
    const calls: string[] = [];
    const result = await runSourceAdapter(adapter(fixtureMap(), calls), context());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(calls).toEqual([DALLAS_COUNTY_CURRENT_SOURCE_URL, pageTwoUrl, alphaUrl, betaUrl]);
    expect(result.snapshot).toMatchObject({
      recordCount: 2,
      validEmptyResult: false,
      sourceLastUpdatedAt: null,
      custodyScope: "current_custody"
    });
    const [alpha, beta] = result.snapshot.bookings;
    expect(alpha?.person.displayName).toBe("SYNTHETIC ALPHA — TEST ONLY");
    expect(alpha?.bookedAt).toBeNull();
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC CHARGE ALPHA — TEST ONLY",
      "SYNTHETIC CHARGE BETA — TEST ONLY"
    ]);
    expect(alpha?.charges.every((charge) => charge.bookingId === alpha.id)).toBe(true);
    expect(alpha?.bondEntries.map((bond) => bond.state)).toEqual(["monetary", "no_bond"]);
    expect(alpha?.bondEntries.every((bond) => bond.bookingId === alpha.id)).toBe(true);
    expect(alpha?.bondEntries[0]).toMatchObject({ amountMinor: 12_500, currency: "USD" });
    expect(beta?.bondEntries).toHaveLength(1);
    expect(beta?.bondEntries[0]?.state).toBe("unknown");
  });

  it("accepts the reviewed official title after its harmless title update", async () => {
    const updatedTitle = syntheticDallasListPageOne.replace(
      "<title>Dallas County Inmate Inquiry</title>",
      "<title>Inmate Search</title>"
    );
    const result = await runSourceAdapter(
      adapter(fixtureMap({ [DALLAS_COUNTY_CURRENT_SOURCE_URL]: updatedTitle })),
      context()
    );

    expect(result.ok).toBe(true);
  });

  it("accepts the official inline disclaimer layout", async () => {
    const inlineDisclaimer = syntheticDallasListPageOne
      .replace(
        '<p class="disclaimer">Synthetic structural fixture. Not a real custody record.</p>',
        "Disclaimer: Synthetic structural fixture. Not a real custody record."
      )
      .replace("<title>Dallas County Inmate Inquiry</title>", "<title>Inmate Search</title>");
    const result = await runSourceAdapter(
      adapter(fixtureMap({ [DALLAS_COUNTY_CURRENT_SOURCE_URL]: inlineDisclaimer })),
      context()
    );

    expect(result.ok).toBe(true);
  });

  it("does not retain a released historical booking from a current detail", async () => {
    const result = await runSourceAdapter(adapter(fixtureMap()), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialized = JSON.stringify(result.snapshot);
    expect(serialized).not.toContain("SYNTHETIC-BOOKING-HISTORICAL-A");
    expect(serialized).not.toContain("SYNTHETIC HISTORICAL CHARGE — TEST ONLY");
    expect(result.snapshot.bookings.every((booking) => booking.releasedAt === null)).toBe(true);
  });

  it("recognizes only page-one exact-scope No data as a valid empty roster", async () => {
    const calls: string[] = [];
    const result = await runSourceAdapter(
      adapter(new Map([[DALLAS_COUNTY_CURRENT_SOURCE_URL, syntheticDallasValidEmptyPage]]), calls),
      context()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(calls).toEqual([DALLAS_COUNTY_CURRENT_SOURCE_URL]);
    expect(result.emptyResult.kind).toBe("valid_empty");
    expect(result.snapshot.recordCount).toBe(0);
  });

  it("rejects a source-emitted later page that becomes a false whole-roster zero", async () => {
    const documents = fixtureMap({ [pageTwoUrl]: syntheticDallasValidEmptyPage });
    const result = await runSourceAdapter(adapter(documents), context());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toMatchObject({
      stage: "fetch",
      classification: "validation",
      diagnosticCode: "DALLAS_PAGINATED_EMPTY"
    });
  });

  it("fails closed when the current filter is not checked", async () => {
    const unsafe = syntheticDallasValidEmptyPage.replace(' value="True" checked', ' value="True"');
    const result = await runSourceAdapter(
      adapter(new Map([[DALLAS_COUNTY_CURRENT_SOURCE_URL, unsafe]])),
      context()
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toMatchObject({
      classification: "invalid_response",
      diagnosticCode: "DALLAS_CURRENT_FILTER_MISSING"
    });
  });

  it("fails closed when more than one booking appears active", async () => {
    const ambiguousDetail = syntheticDallasAlphaDetail
      .replace(
        "<dt>Release Date</dt><dd>01/01/2000 02:00 PM</dd>",
        "<dt>Release Date</dt><dd></dd>"
      )
      .replace(
        "<dt>Housing Facility</dt><dd></dd>",
        "<dt>Housing Facility</dt><dd>SYNTHETIC SECOND FACILITY — TEST ONLY</dd>"
      );
    const result = await runSourceAdapter(
      adapter(fixtureMap({ [alphaUrl]: ambiguousDetail })),
      context()
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("DALLAS_ACTIVE_BOOKING_AMBIGUOUS");
  });

  it("does not infer No Bond from zero or an unreviewed bond type", async () => {
    const unknownType = syntheticDallasAlphaDetail.replace("CASH ONLY", "UNREVIEWED TYPE");
    const zeroMonetary = syntheticDallasAlphaDetail.replace("$125.00", "$0.00");
    const positiveNoBond = syntheticDallasAlphaDetail.replace(
      "<td>NO BOND</td><td>$0.00</td>",
      "<td>NO BOND</td><td>$25.00</td>"
    );
    const [unknownResult, zeroResult, contradictoryResult] = await Promise.all([
      runSourceAdapter(adapter(fixtureMap({ [alphaUrl]: unknownType })), context()),
      runSourceAdapter(adapter(fixtureMap({ [alphaUrl]: zeroMonetary })), context()),
      runSourceAdapter(adapter(fixtureMap({ [alphaUrl]: positiveNoBond })), context())
    ]);

    expect(unknownResult.ok).toBe(false);
    expect(zeroResult.ok).toBe(false);
    expect(contradictoryResult.ok).toBe(false);
    if (!unknownResult.ok) expect(unknownResult.failure.diagnosticCode).toBe("DALLAS_BOND_TYPE");
    if (!zeroResult.ok) expect(zeroResult.failure.diagnosticCode).toBe("DALLAS_BOND_AMOUNT");
    if (!contradictoryResult.ok) {
      expect(contradictoryResult.failure.diagnosticCode).toBe("DALLAS_NO_BOND_AMOUNT");
    }
  });

  it("rejects a configured URL outside the exact reviewed current query", async () => {
    const fetchSpy = vi.fn<DallasSourceFetch>();
    const sourceAdapter = createDallasCountySourceAdapter({
      fetch: fetchSpy,
      facilityId: syntheticId(8_004),
      createId: idFactory(),
      currency: "USD"
    });
    const result = await runSourceAdapter(
      sourceAdapter,
      context(`${DALLAS_COUNTY_CURRENT_SOURCE_URL}&Name=SYNTHETIC`)
    );

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("health-checks only the list boundary and does not fan out to details", async () => {
    const calls: string[] = [];
    const sourceAdapter = adapter(fixtureMap(), calls);
    const health = await sourceAdapter.healthCheck(context());

    expect(health).toMatchObject({ status: "healthy", failure: null });
    expect(calls).toEqual([DALLAS_COUNTY_CURRENT_SOURCE_URL]);
  });
});
