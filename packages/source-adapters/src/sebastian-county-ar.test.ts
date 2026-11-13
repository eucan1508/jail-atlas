import {
  syntheticDallasAlphaDetail,
  syntheticDallasBetaDetail,
  syntheticDallasListPageOne,
  syntheticDallasListPageTwo,
  syntheticId
} from "@jail-atlas/test-fixtures";
import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import { runSourceAdapter } from "./runner.js";
import { sourceAdapterRegistry } from "./registry.js";
import {
  SEBASTIAN_COUNTY_AR_ADAPTER_KEY,
  SEBASTIAN_COUNTY_AR_CURRENT_SOURCE_URL,
  createSebastianCountySourceAdapter,
  type SebastianIdFactory
} from "./sebastian-county-ar.js";

// The Dallas County fixtures use the same NewWorld inquiry markup; these rewrite them into the
// Sebastian County shape: its own path and heading, an "Inmate Search" / "Inmate Detail - NAME"
// title, no disclaimer block, and descriptions that end with "*".
function sebastian(html: string, title: string): string {
  return html
    .replaceAll("/NewWorld.InmateInquiry/dallas", "/NewWorld.InmateInquiry/AR0660000")
    .replace("<title>Dallas County Inmate Inquiry</title>", `<title>${title}</title>`)
    .replace("<h1>Dallas County Inmate Inquiry</h1>", "<h1>Sebastian County AR Inmate Inquiry</h1>")
    .replace(/<p class="disclaimer">[^<]*<\/p>/, "")
    .replaceAll("TEST ONLY</td>", "TEST ONLY*</td>");
}

const base = "https://inmate.sebastiancountyar.gov/NewWorld.InmateInquiry/AR0660000";
const documents = new Map([
  [SEBASTIAN_COUNTY_AR_CURRENT_SOURCE_URL, sebastian(syntheticDallasListPageOne, "Inmate Search")],
  [
    `${SEBASTIAN_COUNTY_AR_CURRENT_SOURCE_URL}&Page=2`,
    sebastian(syntheticDallasListPageTwo, "Inmate Search")
  ],
  [
    `${base}/Inmate/Detail/synthetic-alpha-test-only`,
    sebastian(syntheticDallasAlphaDetail, "Inmate Detail - SYNTHETIC ALPHA — TEST ONLY")
  ],
  [
    `${base}/Inmate/Detail/synthetic-beta-test-only`,
    sebastian(syntheticDallasBetaDetail, "Inmate Detail - SYNTHETIC BETA — TEST ONLY")
  ]
]);

function context(): AdapterContext {
  return {
    runId: syntheticId(8_101),
    source: {
      id: syntheticId(8_102),
      officialInstitutionId: syntheticId(8_103),
      sourceUrl: SEBASTIAN_COUNTY_AR_CURRENT_SOURCE_URL,
      sourceType: "official_sheriff",
      officialInstitutionUrl: "https://official.example.test/sebastian-county/",
      relationshipEvidenceUrl: "https://official.example.test/sebastian-county/custody/",
      evidenceDescription: "Synthetic Sebastian adapter contract evidence for tests only.",
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: SEBASTIAN_COUNTY_AR_ADAPTER_KEY,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T12:00:00.000Z",
    traceId: "synthetic-sebastian-adapter-test",
    signal: new AbortController().signal,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function idFactory(): SebastianIdFactory {
  let sequence = 9_100;
  const ids = new Map<string, string>();
  return (kind, key) => {
    const existing = ids.get(`${kind}|${key}`);
    if (existing) return existing;
    const id = syntheticId(sequence++);
    ids.set(`${kind}|${key}`, id);
    return id;
  };
}

function adapter(pages: ReadonlyMap<string, string>) {
  return createSebastianCountySourceAdapter({
    fetch: async (input) => {
      const html = pages.get(input);
      return html === undefined
        ? new Response("missing", { status: 404, headers: { "content-type": "text/plain" } })
        : new Response(html, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" }
          });
    },
    facilityId: syntheticId(8_104),
    createId: idFactory(),
    currency: "USD",
    nowMs: () => 1_000
  });
}

describe("Sebastian County source adapter", () => {
  it("is exported for review but is not activated in the default registry", () => {
    expect(sourceAdapterRegistry.has(SEBASTIAN_COUNTY_AR_ADAPTER_KEY)).toBe(false);
  });

  it("reads the current bookings and drops the trailing asterisk from charges", async () => {
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

  it("rejects a page without the Sebastian County heading", async () => {
    const pages = new Map(documents);
    pages.set(
      SEBASTIAN_COUNTY_AR_CURRENT_SOURCE_URL,
      (pages.get(SEBASTIAN_COUNTY_AR_CURRENT_SOURCE_URL) ?? "").replace(
        "Sebastian County AR Inmate Inquiry",
        "Other County Inmate Inquiry"
      )
    );
    const result = await runSourceAdapter(adapter(pages), context());
    expect(result.ok).toBe(false);
  });
});
