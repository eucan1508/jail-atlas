import {
  syntheticDallasAlphaDetail,
  syntheticDallasBetaDetail,
  syntheticDallasListPageOne,
  syntheticDallasListPageTwo,
  syntheticId
} from "@jail-atlas/test-fixtures";
import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  NEWWORLD_INQUIRY_SITES,
  WALTON_COUNTY_FL_INQUIRY,
  createNewWorldInquiryAdapter,
  newWorldInquirySite,
  newWorldInquirySourceUrl,
  type NewWorldIdFactory,
  type NewWorldInquiryConfig
} from "./newworld-inquiry.js";
import { sourceAdapterRegistry } from "./registry.js";
import { runSourceAdapter } from "./runner.js";

// The Dallas County fixtures carry the shared NewWorld inquiry markup under their own path and
// heading; this test-only county points the generic reader at them.
const config: NewWorldInquiryConfig = {
  ...WALTON_COUNTY_FL_INQUIRY,
  sourceHost: "nw.example.test",
  sourcePath: "/NewWorld.InmateInquiry/dallas",
  heading: "Dallas County Inmate Inquiry",
  listHeaders: ["Name", "In Custody", "Multiple Bookings"],
  requestDelayMs: 0
};
const sourceUrl = newWorldInquirySourceUrl(config);
const base = `https://${config.sourceHost}${config.sourcePath}`;

function page(html: string, title: string): string {
  return html.replace("<title>Dallas County Inmate Inquiry</title>", `<title>${title}</title>`);
}

const documents = new Map([
  [sourceUrl, page(syntheticDallasListPageOne, "Inmate Search")],
  [`${sourceUrl}&Page=2`, page(syntheticDallasListPageTwo, "Inmate Search")],
  [
    `${base}/Inmate/Detail/synthetic-alpha-test-only`,
    page(syntheticDallasAlphaDetail, "Inmate Detail - SYNTHETIC ALPHA — TEST ONLY")
  ],
  [
    `${base}/Inmate/Detail/synthetic-beta-test-only`,
    page(syntheticDallasBetaDetail, "Inmate Detail - SYNTHETIC BETA — TEST ONLY")
  ]
]);

function context(site: NewWorldInquiryConfig = config): AdapterContext {
  return {
    runId: syntheticId(8_201),
    source: {
      id: syntheticId(8_202),
      officialInstitutionId: syntheticId(8_203),
      sourceUrl: newWorldInquirySourceUrl(site),
      sourceType: "official_sheriff",
      officialInstitutionUrl: "https://official.example.test/county/",
      relationshipEvidenceUrl: "https://official.example.test/county/custody/",
      evidenceDescription: "Synthetic NewWorld adapter contract evidence for tests only.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: site.parserVersion,
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: site.adapterKey,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-newworld-adapter-test",
    signal: new AbortController().signal,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function idFactory(): NewWorldIdFactory {
  let sequence = 9_300;
  const ids = new Map<string, string>();
  return (kind, key) => {
    const existing = ids.get(`${kind}|${key}`);
    if (existing) return existing;
    const id = syntheticId(sequence++);
    ids.set(`${kind}|${key}`, id);
    return id;
  };
}

function adapter(pages: ReadonlyMap<string, string>, site: NewWorldInquiryConfig = config) {
  return createNewWorldInquiryAdapter(site, {
    fetch: async (input) => {
      const html = pages.get(input);
      return html === undefined
        ? new Response("missing", { status: 404, headers: { "content-type": "text/plain" } })
        : new Response(html, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" }
          });
    },
    facilityId: syntheticId(8_204),
    createId: idFactory(),
    currency: "USD",
    nowMs: () => 1_000
  });
}

describe("NewWorld inquiry adapter", () => {
  it("keeps every Florida inquiry out of the default registry and finds it by key", () => {
    for (const site of NEWWORLD_INQUIRY_SITES) {
      expect(sourceAdapterRegistry.has(site.adapterKey)).toBe(false);
      expect(newWorldInquirySite(site.adapterKey)).toBe(site);
      expect(newWorldInquirySourceUrl(site)).toMatch(
        /^https:\/\/[^/]+\/NewWorld\.\w+\/\w+\?InCustody=True$/
      );
    }
    expect(newWorldInquirySite("unknown-county-current-roster")).toBeNull();
  });

  it("reads the current booking's charges from each detail page", async () => {
    const result = await runSourceAdapter(adapter(documents), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [alpha] = result.snapshot.bookings;
    expect(result.snapshot.bookings).toHaveLength(2);
    expect(alpha?.charges.map((charge) => charge.description)).toEqual([
      "SYNTHETIC CHARGE ALPHA — TEST ONLY",
      "SYNTHETIC CHARGE BETA — TEST ONLY"
    ]);
  });

  it("treats the checked custody filter as custody evidence when the list has no custody column", async () => {
    const site = { ...config, listHasCustodyColumn: false, listHeaders: ["Name"] };
    const result = await runSourceAdapter(adapter(documents, site), context(site));
    expect(result.ok).toBe(true);
  });

  it("rejects a page without the county's heading, under the county's diagnostic prefix", async () => {
    const pages = new Map(documents);
    pages.set(
      sourceUrl,
      (pages.get(sourceUrl) ?? "").replace("Dallas County Inmate Inquiry", "Other Inmate Inquiry")
    );
    const result = await runSourceAdapter(adapter(pages), context());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.diagnosticCode).toBe("WALTON_COUNTY_FL_IDENTITY_MISSING");
  });
});
