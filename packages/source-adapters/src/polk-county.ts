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

export const POLK_COUNTY_ADAPTER_KEY = "polk-county-iowa-current-roster" as const;
export const POLK_COUNTY_CURRENT_SOURCE_URL =
  "https://polkinmates.polkcountyiowa.gov/Inmates/Current" as const;
export const POLK_COUNTY_PARSER_VERSION = "1.0.0" as const;
/** Holding location code for the Polk County Jail; people held elsewhere are not kept. */
export const POLK_COUNTY_JAIL_LOCATION = "PCJ" as const;

const DETAIL_BASE = "https://polkinmates.polkcountyiowa.gov/Inmates/Detail/";
const MAX_RECORDS = 3_000;
const MAX_PAGE_BYTES = 3_000_000;
// The list is re-read after the details; new bookings found then are fetched in another round.
const MAX_ROUNDS = 4;
const DETAIL_CONCURRENCY = 6;
const LIST_COLUMNS = ["Name", "Age", "Book Date"];
const BOOK_DATE = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} [AP]M$/;
const DETAIL_TOKEN = /^\/Inmates\/Detail\/([A-Za-z0-9_-]{20,600})$/;
// "F FELD 724.26(1)  DOMINION/CONTROL..." = level, optional class, Iowa Code section, text.
const CHARGE_TEXT = /^[A-Z](?:\s+[A-Z]{1,6})?\s+(\d[0-9A-Za-z.()/-]*)\s+(\S.*)$/;

const PolkChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const PolkRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/),
  charges: z.array(PolkChargeSchema).max(200)
});
const PolkRosterSchema = z.object({
  records: z.array(PolkRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type PolkRoster = z.infer<typeof PolkRosterSchema>;
export type PolkRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type PolkRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface PolkRosterAdapterOptions {
  readonly fetch: PolkRosterFetch;
  readonly facilityId: string;
  readonly createId: PolkRosterIdFactory;
  readonly nowMs?: () => number;
}

/** One list row. The detail token changes on every list request, so name and book date identify it. */
type ListedInmate = Readonly<{ key: string; token: string; displayName: string }>;
/** A detail read: the record, or null for someone held outside the Polk County Jail. */
type DetailRead = z.infer<typeof PolkRecordSchema> | null;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
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
    publicMessage:
      "The approved Polk County, Iowa current inmate list could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `POLK_COUNTY_${code}`.slice(0, 100)
  };
}

async function requestHtml(
  options: PolkRosterAdapterOptions,
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

/** Reads the Current Inmates table: a detail link, then name, age, and book date per row. */
export function parsePolkCurrentList(html: string): ListedInmate[] {
  const $ = load(html);
  if (normalizeText($("title").first().text()) !== "Current Inmates - Polk Inmates") {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const tables = $("table").toArray();
  if (tables.length !== 1) throw new Error("ROSTER_COLUMNS_CHANGED");
  const rows = $(tables[0]).find("tr").toArray();
  const header = rows[0] ? cellTexts($, rows[0]) : [];
  if (JSON.stringify(header.slice(1)) !== JSON.stringify(LIST_COLUMNS)) {
    throw new Error("ROSTER_COLUMNS_CHANGED");
  }
  const listed: ListedInmate[] = [];
  const keys = new Set<string>();
  for (const row of rows.slice(1)) {
    const cells = cellTexts($, row);
    const href = $(row).find("a[href]").attr("href") ?? "";
    const token = href.match(DETAIL_TOKEN)?.[1];
    const [, displayName, , bookDate] = cells;
    if (cells.length !== 4 || !token || !displayName || !bookDate || !BOOK_DATE.test(bookDate)) {
      throw new Error("ROW_STRUCTURE_CHANGED");
    }
    const key = `${displayName}|${bookDate}`;
    if (keys.has(key)) throw new Error("DUPLICATE_LIST_ENTRY");
    keys.add(key);
    listed.push({ key, token, displayName });
  }
  if (listed.length > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  return listed;
}

function labelledValues($: CheerioAPI, table: Parameters<CheerioAPI>[0]): Map<string, string> {
  const values = new Map<string, string>();
  for (const row of $(table).find("tr").toArray()) {
    const label = normalizeText($(row).children("th").first().text());
    if (label) values.set(label, normalizeText($(row).children("td").first().text()));
  }
  return values;
}

function readCharge(text: string): z.infer<typeof PolkChargeSchema> {
  const raw = (text ?? "").replace(/\u00a0/g, " ").trim();
  const match = raw.match(CHARGE_TEXT);
  if (match) return { statuteCode: match[1]!, description: normalizeText(match[2]) };
  const description = normalizeText(raw);
  if (!description) throw new Error("EMPTY_CHARGE");
  return { statuteCode: null, description };
}

/**
 * Reads one Inmate Details page: the person table, then one card per case with its bail type and
 * charges. A case whose bail type reads CLEARED is closed and its charges are not kept.
 */
export function parsePolkDetail(html: string, listed: ListedInmate): DetailRead {
  const $ = load(html);
  if (normalizeText($("title").first().text()) !== "Inmate Details - Polk Inmates") {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const person = $("table.table-sm")
    .toArray()
    .map((table) => labelledValues($, table))
    .find((values) => values.has("Booking Number") && values.has("Holding Location"));
  if (!person) throw new Error("DETAIL_STRUCTURE_CHANGED");
  if ((person.get("Name") ?? "").toUpperCase() !== listed.displayName.toUpperCase()) {
    throw new Error("INVALID_RECORD_IDENTITY");
  }
  if (person.get("Holding Location") !== POLK_COUNTY_JAIL_LOCATION) return null;

  const charges: z.infer<typeof PolkChargeSchema>[] = [];
  const cases = $("div.card")
    .toArray()
    // Titles read "Case <number>", sometimes with spaces ("Case DALLAS CO 123") or no number.
    .filter((card) => /^Case\b/.test(normalizeText($(card).find("h2").first().text())));
  for (const card of cases) {
    const caseValues = labelledValues($, $(card).find("table.table-sm").first().get(0));
    const bailType = caseValues.get("Bail Type");
    if (!bailType) throw new Error("CASE_STRUCTURE_CHANGED");
    // A cleared case is closed; its charges are not kept.
    if (bailType === "CLEARED") continue;
    const chargeTables = $(card).find("table.w-100");
    // Some open cases list no charges yet; there is nothing to read from them.
    if (chargeTables.length === 0) continue;
    if (chargeTables.length !== 1) throw new Error("CASE_STRUCTURE_CHANGED");
    const head = cellTexts($, chargeTables.find("thead tr").first().get(0));
    if (
      JSON.stringify(head) !== JSON.stringify(["Charge Number", "Charge Count", "Charge Details"])
    ) {
      throw new Error("CASE_STRUCTURE_CHANGED");
    }
    for (const row of chargeTables.find("tbody tr").toArray()) {
      const cells = $(row).children("td").toArray();
      if (cells.length !== 3) throw new Error("CASE_STRUCTURE_CHANGED");
      charges.push(readCharge($(cells[2]).text()));
    }
  }
  return PolkRecordSchema.parse({
    displayName: listed.displayName,
    bookingNumber: person.get("Booking Number"),
    charges
  });
}

async function readList(
  options: PolkRosterAdapterOptions,
  context: AdapterContext
): Promise<ListedInmate[]> {
  return parsePolkCurrentList(
    await readHtml(await requestHtml(options, context, POLK_COUNTY_CURRENT_SOURCE_URL))
  );
}

async function readDetails(
  options: PolkRosterAdapterOptions,
  context: AdapterContext,
  pending: readonly ListedInmate[],
  reads: Map<string, DetailRead>
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, pending.length) }, async () => {
      while (next < pending.length) {
        const listed = pending[next]!;
        next += 1;
        const response = await requestHtml(options, context, `${DETAIL_BASE}${listed.token}`);
        // Someone released after the list was read may no longer have a detail page; the next
        // list read decides whether they are still needed.
        if (response.status === 404) continue;
        reads.set(listed.key, parsePolkDetail(await readHtml(response), listed));
      }
    })
  );
}

async function crawlRoster(
  options: PolkRosterAdapterOptions,
  context: AdapterContext
): Promise<PolkRoster> {
  const reads = new Map<string, DetailRead>();
  let listed = await readList(options, context);
  await readDetails(options, context, listed, reads);
  // Re-read the list until every listed person has a detail read; the last list is the roster.
  for (let round = 1; ; round += 1) {
    const current = await readList(options, context);
    const missing = current.filter((entry) => !reads.has(entry.key));
    if (missing.length === 0) {
      listed = current;
      break;
    }
    if (round >= MAX_ROUNDS) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    await readDetails(options, context, missing, reads);
  }

  const records = listed
    .map((entry) => reads.get(entry.key))
    .filter((record): record is z.infer<typeof PolkRecordSchema> => Boolean(record));
  const bookingNumbers = records.map((record) => record.bookingNumber);
  if (new Set(bookingNumbers).size !== bookingNumbers.length) {
    throw new Error("DUPLICATE_BOOKING_NUMBER");
  }
  // The county jail is never empty; an empty result means the list broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return PolkRosterSchema.parse({ records, validEmptyMarker: false });
}

async function requestRoster(
  options: PolkRosterAdapterOptions,
  context: AdapterContext
): Promise<PolkRoster> {
  if (context.source.sourceUrl !== POLK_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  return crawlRoster(options, context);
}

export function createPolkCountySourceAdapter(
  options: PolkRosterAdapterOptions
): SourceAdapter<PolkRoster, PolkRoster, PolkRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: POLK_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: POLK_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<PolkRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<PolkRoster>> {
      const result = PolkRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<PolkRoster>> {
      const result = PolkRosterSchema.safeParse(payload);
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
              evidence: "The official Polk County current inmate list reported zero people."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingNumber);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId(
              "charge",
              `${record.bookingNumber}|${sequence}|${charge.description}`
            ),
            bookingId,
            sequence,
            description: charge.description,
            sourceLabel: "Charge Details",
            statuteCode: charge.statuteCode,
            disposition: null
          }));
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", `${record.bookingNumber}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            bookingIdentifier: {
              value: record.bookingNumber,
              sourceLabel: "Booking Number",
              sourceIdentifiesAsBookingIdentifier: true
            },
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
        await readList(options, context);
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
