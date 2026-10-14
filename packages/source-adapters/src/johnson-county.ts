import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
import { load, type CheerioAPI } from "cheerio/slim";
import { z } from "zod";

import type {
  AdapterContext,
  AdapterStage,
  EmptyResultInterpretation,
  FailureClassification,
  FetchResult,
  NormalizationResult,
  ParseResult,
  SourceAdapter,
  SourceHealth,
  ValidationResult
} from "./contracts.js";

export const JOHNSON_COUNTY_ADAPTER_KEY = "johnson-county-iowa-current-roster" as const;
export const JOHNSON_COUNTY_CURRENT_SOURCE_URL =
  "https://ww1.johnsoncountyiowa.gov/Sheriff/jailroster/list" as const;
export const JOHNSON_COUNTY_PARSER_VERSION = "1.0.0" as const;
/** The roster also lists people the Sheriff boards in other counties' jails; only these are kept. */
export const JOHNSON_COUNTY_JAIL_HOUSING = "JOHNSON COUNTY" as const;

const DETAIL_BASE = "https://ww1.johnsoncountyiowa.gov/Sheriff/jailroster/details/";
const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;
const MAX_CRAWL_ATTEMPTS = 3;
const DETAIL_CONCURRENCY = 4;
const LIST_COLUMNS = ["Date Booked", "Name", "Age", "Date Released", "Housing Facility", "Details"];
const BOOKED_TEXT = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}(?::\d{2})? [AP]M$/;

const JohnsonChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const JohnsonRecordSchema = z.object({
  recordKey: z.string().regex(/^\d{1,12}$/),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(JohnsonChargeSchema).max(100)
});
const JohnsonRosterSchema = z.object({
  records: z.array(JohnsonRecordSchema).max(MAX_RECORDS),
  listedTotal: z.number().int().nonnegative(),
  validEmptyMarker: z.boolean()
});

export type JohnsonRoster = z.infer<typeof JohnsonRosterSchema>;
export type JohnsonRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type JohnsonRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface JohnsonRosterAdapterOptions {
  readonly fetch: JohnsonRosterFetch;
  readonly facilityId: string;
  readonly createId: JohnsonRosterIdFactory;
  readonly nowMs?: () => number;
}

type ListedInmate = Readonly<{ detailId: string; displayName: string }>;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage: "The approved Johnson County, Iowa jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `JOHNSON_COUNTY_${code}`.slice(0, 100)
  };
}

async function requestHtml(
  options: JohnsonRosterAdapterOptions,
  context: AdapterContext,
  url: string
): Promise<Response> {
  return options.fetch(url, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
}

async function readHtml(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return html;
}

function cellTexts($: CheerioAPI, row: Parameters<CheerioAPI>[0]): string[] {
  return $(row)
    .children("th, td")
    .toArray()
    .map((cell) => normalizeText($(cell).text()));
}

/**
 * Reads the roster list. Each person is one row (booked, name, age, released, housing, details
 * link) followed by a charges row. Released rows and people housed in other counties are counted
 * but not kept.
 */
export function parseJohnsonRosterList(html: string): {
  kept: ListedInmate[];
  listedTotal: number;
} {
  const $ = load(html);
  if (!normalizeText($("title").first().text()).startsWith("Johnson County Iowa Jail Roster")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const table = $("table")
    .toArray()
    .find((element) => {
      const header = $(element).find("tr").first();
      return JSON.stringify(cellTexts($, header.get(0))) === JSON.stringify(LIST_COLUMNS);
    });
  if (!table) throw new Error("ROSTER_COLUMNS_CHANGED");

  const kept: ListedInmate[] = [];
  const seen = new Set<string>();
  let listedTotal = 0;
  for (const row of $(table).find("tr").toArray()) {
    const links = $(row).find("a[href*='/jailroster/details/']");
    if (links.length === 0) continue;
    const cells = cellTexts($, row);
    if (cells.length !== LIST_COLUMNS.length || links.length !== 1) {
      throw new Error("ROW_STRUCTURE_CHANGED");
    }
    const [booked, name, , released, housing] = cells;
    const detailId = links.attr("href")?.match(/\/jailroster\/details\/(\d{1,12})$/)?.[1];
    if (!detailId || !name || !booked || !BOOKED_TEXT.test(booked)) {
      throw new Error("INVALID_RECORD_IDENTITY");
    }
    if (seen.has(detailId)) throw new Error("DUPLICATE_DETAIL_ID");
    seen.add(detailId);
    listedTotal += 1;
    // The list also shows people released in the last 48 hours; a release date drops them.
    if (released) continue;
    if (housing === JOHNSON_COUNTY_JAIL_HOUSING) kept.push({ detailId, displayName: name });
  }
  if (listedTotal > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  return { kept, listedTotal };
}

/**
 * Reads one person's detail page. Each charge is its own table: offense, code section, and level,
 * then cause number, bond, and "Charge Released". Charges with a release date are resolved and are
 * not kept; open charges read "PENDING".
 */
export function parseJohnsonDetail(html: string, listed: ListedInmate) {
  const $ = load(html);
  const heading = normalizeText($("h4").first().text()).match(/^Inmate Information for (.+)$/)?.[1];
  if (!heading || heading.toUpperCase() !== listed.displayName.toUpperCase()) {
    throw new Error("INVALID_RECORD_IDENTITY");
  }
  const tables = $("table").toArray();
  const housing = tables
    .map((element) => $(element).find("tr").toArray())
    .find((rows) => cellTexts($, rows[0])[1] === "Housing Facility");
  if (!housing || cellTexts($, housing[housing.length - 1])[1] !== JOHNSON_COUNTY_JAIL_HOUSING) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }
  const charges: z.infer<typeof JohnsonChargeSchema>[] = [];
  for (const element of tables) {
    const rows = $(element).find("tr").toArray();
    if (cellTexts($, rows[0])[0] !== "Offense") continue;
    const head = cellTexts($, rows[0]);
    const offense = rows[1] ? cellTexts($, rows[1]) : [];
    const statusHead = rows[2] ? cellTexts($, rows[2]) : [];
    const status = rows[3] ? cellTexts($, rows[3]) : [];
    if (
      JSON.stringify(head) !== JSON.stringify(["Offense", "Code Section", "Level of Offense"]) ||
      statusHead[3] !== "Charge Released" ||
      offense.length !== 3 ||
      status.length !== 4
    ) {
      throw new Error("CHARGE_STRUCTURE_CHANGED");
    }
    const released = status[3]!;
    if (released !== "PENDING" && !/^\d{4}-\d{2}-\d{2}$/.test(released)) {
      throw new Error("CHARGE_STATUS_UNREADABLE");
    }
    if (released !== "PENDING") continue;
    const statuteCode = offense[1] || null;
    const description = offense[0] || statuteCode;
    if (!description) throw new Error("EMPTY_CHARGE");
    charges.push({ description, statuteCode });
  }
  return JohnsonRecordSchema.parse({
    recordKey: listed.detailId,
    displayName: listed.displayName,
    charges
  });
}

async function crawlRoster(
  options: JohnsonRosterAdapterOptions,
  context: AdapterContext
): Promise<JohnsonRoster> {
  const list = parseJohnsonRosterList(
    await readHtml(await requestHtml(options, context, JOHNSON_COUNTY_CURRENT_SOURCE_URL))
  );
  const records = new Array<z.infer<typeof JohnsonRecordSchema>>(list.kept.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, list.kept.length) }, async () => {
      while (next < list.kept.length) {
        const index = next;
        next += 1;
        const listed = list.kept[index]!;
        const response = await requestHtml(options, context, `${DETAIL_BASE}${listed.detailId}`);
        // A person released between the list and their detail request is no longer found.
        if (response.status === 404) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
        records[index] = parseJohnsonDetail(await readHtml(response), listed);
      }
    })
  );

  // The list must be unchanged once every detail has been read, or someone may be missing.
  const after = parseJohnsonRosterList(
    await readHtml(await requestHtml(options, context, JOHNSON_COUNTY_CURRENT_SOURCE_URL))
  );
  const kept = new Set(list.kept.map((item) => item.detailId));
  if (
    after.kept.length !== list.kept.length ||
    after.kept.some((item) => !kept.has(item.detailId))
  ) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  // The jail is never empty; an empty list means the roster broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return JohnsonRosterSchema.parse({
    records,
    listedTotal: list.listedTotal,
    validEmptyMarker: false
  });
}

async function checkListEndpoint(
  options: JohnsonRosterAdapterOptions,
  context: AdapterContext
): Promise<void> {
  parseJohnsonRosterList(
    await readHtml(await requestHtml(options, context, JOHNSON_COUNTY_CURRENT_SOURCE_URL))
  );
}

async function requestRoster(
  options: JohnsonRosterAdapterOptions,
  context: AdapterContext
): Promise<JohnsonRoster> {
  if (context.source.sourceUrl !== JOHNSON_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  // Bookings and releases can land while the details are being read; start over when they do.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(options, context);
    } catch (error) {
      const changed = error instanceof Error && error.message === "ROSTER_CHANGED_DURING_CRAWL";
      if (!changed || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

export function createJohnsonCountySourceAdapter(
  options: JohnsonRosterAdapterOptions
): SourceAdapter<JohnsonRoster, JohnsonRoster, JohnsonRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: JOHNSON_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: JOHNSON_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<JohnsonRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<JohnsonRoster>> {
      const result = JohnsonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<JohnsonRoster>> {
      const result = JohnsonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.records.length === 0 && payload.validEmptyMarker
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: "The official Johnson County inmate search reported zero people in custody."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.recordKey);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId("charge", `${record.recordKey}|${sequence}|${charge.description}`),
            bookingId,
            sequence,
            description: charge.description,
            sourceLabel: "Charges",
            statuteCode: charge.statuteCode,
            disposition: null
          }));
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", `${record.recordKey}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The roster's detail ID is an internal page number, not a booking number.
            bookingIdentifier: null,
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            bondEntries: [],
            sourceOrder
          };
        });
        return Promise.resolve({
          ok: true,
          value: NormalizedCustodySnapshotSchema.parse({
            id: snapshotId,
            sourceId: context.source.id,
            ingestRunId: context.runId,
            capturedAt: context.requestedAt,
            sourceLastUpdatedAt: null,
            custodyScope: "current_custody",
            recordCount: bookings.length,
            validEmptyResult: emptyResult.kind === "valid_empty",
            stale: false,
            expiresAt: null,
            bookings
          })
        });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "normalize", error) });
      }
    },
    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        await checkListEndpoint(options, context);
        return {
          status: "healthy",
          checkedAt: context.requestedAt,
          latencyMs: Math.max(0, nowMs() - started),
          failure: null
        };
      } catch (error) {
        return {
          status: "unavailable",
          checkedAt: context.requestedAt,
          latencyMs: Math.max(0, nowMs() - started),
          failure: classify(context, "health_check", error)
        };
      }
    },
    classifyFailure(error, stage, context) {
      return classify(context, stage, error);
    }
  };
}
