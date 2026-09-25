import { syntheticId } from "@jail-atlas/test-fixtures";
import { describe, expect, it } from "vitest";

import type { AdapterContext } from "./contracts.js";
import {
  BLACK_HAWK_COUNTY_ADAPTER_KEY,
  BLACK_HAWK_COUNTY_CURRENT_SOURCE_URL,
  CEDAR_COUNTY_ADAPTER_KEY,
  CEDAR_COUNTY_CURRENT_SOURCE_URL,
  createIowaCurrentRosterAdapter,
  type IowaRosterIdFactory,
  type IowaRosterSource
} from "./iowa-current-roster.js";
import { runSourceAdapter } from "./runner.js";

const cedarHtml = `<!doctype html><html><head><title>Inmate Roster - Sheriff's Office - Cedar County, Iowa</title></head><body><div class="jailInmate header"></div><div class="jailInmate"><div class="inmateDate">9/11/26</div><div class="inmateName">SYNTHETIC CEDAR — TEST ONLY</div><div class="inmateInfo">Age: 30<br>Sex: M<br>Booked: Warrant<br>Bond: $5,100</div></div></body></html>`;
const blackHawkHtml = `<!doctype html><html><head><title>Who's In Jail | Black Hawk County Sheriff's Office</title></head><body><ul class="row list"><li class="jsListItem"><span class="jsName" data-charges='[{"charge":"SYNTHETIC BLACK HAWK CHARGE — TEST ONLY","bond_amount":"$300.00"}]'>SYNTHETIC BLACK HAWK — TEST ONLY</span><span class="jsTimestamp">09/11/2026</span><span class="jsBond" data-bond="300.00">$300.00</span></li></ul></body></html>`;

function context(source: IowaRosterSource): AdapterContext {
  const key = source === "cedar" ? CEDAR_COUNTY_ADAPTER_KEY : BLACK_HAWK_COUNTY_ADAPTER_KEY;
  const url =
    source === "cedar" ? CEDAR_COUNTY_CURRENT_SOURCE_URL : BLACK_HAWK_COUNTY_CURRENT_SOURCE_URL;
  return {
    runId: syntheticId(9_001),
    source: {
      id: syntheticId(9_002),
      officialInstitutionId: syntheticId(9_003),
      sourceUrl: url,
      sourceType: "official_county",
      officialInstitutionUrl: "https://official.example.test/iowa/",
      relationshipEvidenceUrl: "https://official.example.test/iowa/evidence/",
      evidenceDescription: "Synthetic Iowa source contract for tests only.",
      verifiedAt: "2000-01-01T00:00:00.000Z",
      lastCheckedAt: null,
      lastSuccessAt: null,
      lastError: null,
      parserVersion: "1.0.0",
      sourceStatus: "verification_pending",
      custodyDataScope: ["current_custody"],
      retentionScope: { kind: "current_only", description: "Synthetic current-only scope." },
      adapterKey: key,
      publicationApproved: false
    },
    requestedAt: "2000-01-01T00:00:00.000Z",
    traceId: "synthetic-iowa-roster-test",
    signal: new AbortController().signal,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function ids(): IowaRosterIdFactory {
  let sequence = 9_100;
  const values = new Map<string, string>();
  return (kind, key) => {
    const mapKey = `${kind}|${key}`;
    const existing = values.get(mapKey);
    if (existing) return existing;
    const value = syntheticId(sequence++);
    values.set(mapKey, value);
    return value;
  };
}

function adapter(source: IowaRosterSource, html: string) {
  const url =
    source === "cedar" ? CEDAR_COUNTY_CURRENT_SOURCE_URL : BLACK_HAWK_COUNTY_CURRENT_SOURCE_URL;
  return createIowaCurrentRosterAdapter({
    source,
    fetch: async (input) =>
      new Response(input === url ? html : "missing", {
        status: input === url ? 200 : 404,
        headers: { "content-type": "text/html" }
      }),
    facilityId: syntheticId(9_004),
    createId: ids()
  });
}

describe("Iowa current roster adapters", () => {
  it("parses Cedar's official roster shape without exposing demographics", async () => {
    const result = await runSourceAdapter(adapter("cedar", cedarHtml), context("cedar"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(1);
    expect(result.snapshot.bookings[0]?.person.displayName).toBe("SYNTHETIC CEDAR — TEST ONLY");
    expect(result.snapshot.bookings[0]?.charges.map((charge) => charge.description)).toEqual([
      "Warrant"
    ]);
    expect(result.snapshot.bookings[0]?.bondEntries).toEqual([]);
    expect(JSON.stringify(result.snapshot)).not.toContain("Age");
    expect(JSON.stringify(result.snapshot)).not.toContain('"Sex"');
  });

  it("parses Black Hawk's source-labelled charge payload", async () => {
    const result = await runSourceAdapter(
      adapter("black_hawk", blackHawkHtml),
      context("black_hawk")
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.recordCount).toBe(1);
    expect(result.snapshot.bookings[0]?.charges[0]?.description).toBe(
      "SYNTHETIC BLACK HAWK CHARGE — TEST ONLY"
    );
    expect(result.snapshot.bookings[0]?.bondEntries).toEqual([]);
  });
});
