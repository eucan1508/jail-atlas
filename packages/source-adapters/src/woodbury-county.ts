import {
  NormalizedCustodySnapshotSchema,
  type BondEntry,
  type Booking,
  type Charge
} from "@jail-atlas/domain";
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

export const WOODBURY_COUNTY_ADAPTER_KEY = "woodbury-county-iowa-current-roster" as const;
export const WOODBURY_COUNTY_CURRENT_SOURCE_URL = "https://injail.wcicc.com/" as const;
export const WOODBURY_COUNTY_PARSER_VERSION = "1.0.0" as const;

// "All" in the Display # of Lines menu, which shows up to 999 rows on one page.
const ALL_ROWS = "999";
const MAX_RECORDS = 999;
const MAX_PAGE_BYTES = 3_000_000;
const MAX_CRAWL_ATTEMPTS = 3;
// The record count can run ahead of the grid by a row; any larger gap fails closed.
const MAX_COUNT_GAP = 2;
const LIST_COLUMNS = [
  "View Inmate Details",
  "Inmate Name",
  "Date Booked",
  "Time Booked",
  "Charges",
  "Bond Amount"
];
const BOOKED_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
const BOOKED_TIME = /^\d{1,2}:\d{2} [AP]M$/;
const BOND_TEXT = /^\$(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})$/;
const TOTAL_TEXT = /Search Returned (\d+) records\./;
const PAGE_TEXT = /Page (\d+) of (\d+)/;
// The page posts back with these hidden fields; every other form value is sent as the page shows it.
const STATE_FIELDS = [
  "__VIEWSTATE",
  "__VIEWSTATEGENERATOR",
  "__VIEWSTATEENCRYPTED",
  "__EVENTVALIDATION"
] as const;

const WoodburyRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  chargeText: z.string().trim().min(1).max(4_000).nullable(),
  bondAmountMinor: z.number().int().nonnegative().max(100_000_000_000).nullable()
});
const WoodburyRosterSchema = z.object({
  records: z.array(WoodburyRecordSchema).max(MAX_RECORDS),
  listedTotal: z.number().int().nonnegative(),
  validEmptyMarker: z.boolean()
});

export type WoodburyRoster = z.infer<typeof WoodburyRosterSchema>;
export type WoodburyRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type WoodburyRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface WoodburyRosterAdapterOptions {
  readonly fetch: WoodburyRosterFetch;
  readonly facilityId: string;
  readonly createId: WoodburyRosterIdFactory;
  readonly nowMs?: () => number;
}

type WoodburyRow = Readonly<{
  key: string;
  displayName: string;
  chargeText: string | null;
  bondAmountMinor: number | null;
}>;

export type WoodburyPage = Readonly<{
  rows: WoodburyRow[];
  total: number;
  pageNumber: number;
  pageCount: number;
  form: Record<string, string>;
}>;

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
    publicMessage:
      "The approved Woodbury County, Iowa in-jail search could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `WOODBURY_COUNTY_${code}`.slice(0, 100)
  };
}

function bondMinor(text: string): number | null {
  if (text === "No Bond") return null;
  const match = text.match(BOND_TEXT);
  if (!match) throw new Error("BOND_UNREADABLE");
  const amountMinor = Number(match[1]!.replace(/,/g, "")) * 100 + Number(match[2]);
  if (!Number.isSafeInteger(amountMinor)) throw new Error("BOND_UNREADABLE");
  return amountMinor;
}

/**
 * The Charges column joins every charge with ", ", but charge names also contain commas
 * ("POSSESS CON SUB, 2ND OFF"), so the text is kept whole rather than split.
 */
function chargeText(text: string): string | null {
  return normalizeText(text.replace(/^[\s,]+|[\s,]+$/g, "")) || null;
}

function selectedValue($: CheerioAPI, name: string): string {
  const select = $(`select[name='${name}']`);
  if (select.length !== 1) throw new Error("FORM_STATE_MISSING");
  const selected = select.find("option[selected]").attr("value");
  const value = selected ?? select.find("option").first().attr("value");
  if (value === undefined) throw new Error("FORM_STATE_MISSING");
  return value;
}

/** Reads one page of the In Jail Search grid along with the form state needed to post back. */
export function parseWoodburyPage(html: string): WoodburyPage {
  const $ = load(html);
  if (normalizeText($("title").first().text()) !== "Woodbury County In Jail Search") {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const body = normalizeText($("body").text());
  const total = body.match(TOTAL_TEXT);
  const page = body.match(PAGE_TEXT);
  if (!total || !page) throw new Error("ROSTER_TOTAL_MISSING");

  const grid = $("table#GridView1");
  if (grid.length !== 1) throw new Error("ROSTER_COLUMNS_CHANGED");
  const tableRows = grid.find("tr").toArray();
  const header = $(tableRows[0])
    .children("th, td")
    .toArray()
    .map((cell) => normalizeText($(cell).text()));
  if (JSON.stringify(header) !== JSON.stringify(LIST_COLUMNS)) {
    throw new Error("ROSTER_COLUMNS_CHANGED");
  }

  const rows: WoodburyRow[] = [];
  for (const row of tableRows.slice(1)) {
    // The pager row at the foot of the grid has no detail link.
    if ($(row).find("a[id*='lnkSelect']").length === 0) continue;
    const cells = $(row)
      .children("td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()));
    const [, displayName, bookedDate, bookedTime, charges, bond] = cells;
    if (
      cells.length !== LIST_COLUMNS.length ||
      !displayName ||
      !bookedDate ||
      !BOOKED_DATE.test(bookedDate) ||
      !bookedTime ||
      !BOOKED_TIME.test(bookedTime) ||
      bond === undefined
    ) {
      throw new Error("ROW_STRUCTURE_CHANGED");
    }
    rows.push({
      key: `${displayName}|${bookedDate}|${bookedTime}`,
      displayName,
      chargeText: chargeText(charges ?? ""),
      bondAmountMinor: bondMinor(bond)
    });
  }

  const form: Record<string, string> = {};
  for (const name of STATE_FIELDS) {
    const value = $(`input[type='hidden'][name='${name}']`).attr("value");
    if (value === undefined) throw new Error("FORM_STATE_MISSING");
    form[name] = value;
  }
  for (const name of ["txtName", "txtFrom", "txtTo", "txtCharge"]) {
    form[name] = $(`input[name='${name}']`).attr("value") ?? "";
  }
  if ($(`select[name='ddDisplayRows'] option[value='${ALL_ROWS}']`).text().trim() !== "All") {
    throw new Error("FORM_STATE_MISSING");
  }
  form["ddDisplayRows"] = selectedValue($, "ddDisplayRows");
  form["ddSortTable"] = selectedValue($, "ddSortTable");
  const search = $("input[name='btnSearch']").attr("value");
  if (!search) throw new Error("FORM_STATE_MISSING");
  form["btnSearch"] = search;

  return {
    rows,
    total: Number(total[1]),
    pageNumber: Number(page[1]),
    pageCount: Number(page[2]),
    form
  };
}

async function readHtml(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return html;
}

async function requestPage(
  options: WoodburyRosterAdapterOptions,
  context: AdapterContext,
  form?: Record<string, string>
): Promise<WoodburyPage> {
  const response = await options.fetch(WOODBURY_COUNTY_CURRENT_SOURCE_URL, {
    method: form ? "POST" : "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" },
    ...(form ? { body: new URLSearchParams(form) } : {})
  });
  return parseWoodburyPage(await readHtml(response));
}

async function readAllRows(
  options: WoodburyRosterAdapterOptions,
  context: AdapterContext,
  form: Record<string, string>
): Promise<WoodburyPage> {
  const page = await requestPage(options, context, { ...form, ddDisplayRows: ALL_ROWS });
  if (page.pageNumber !== 1 || page.pageCount !== 1) throw new Error("PAGE_SEQUENCE_MISMATCH");
  return page;
}

function sameRows(left: WoodburyPage, right: WoodburyPage): boolean {
  return JSON.stringify(left.rows) === JSON.stringify(right.rows);
}

async function crawlRoster(
  options: WoodburyRosterAdapterOptions,
  context: AdapterContext
): Promise<WoodburyRoster> {
  const first = await requestPage(options, context);
  if (first.total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  // The site now and then answers a search with a short or empty result. The whole roster is read
  // twice on one page, and both reads must match each other and the opening page's count.
  const all = await readAllRows(options, context, first.form);
  const again = await readAllRows(options, context, all.form);
  if (all.total !== first.total || again.total !== first.total || !sameRows(all, again)) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }
  const rows = all.rows;
  const keys = new Set(rows.map((row) => row.key));
  if (keys.size !== rows.length) throw new Error("DUPLICATE_ROSTER_ROW");
  if (rows.length > all.total || all.total - rows.length > MAX_COUNT_GAP) {
    throw new Error("ROSTER_COUNT_MISMATCH");
  }
  // A jail of this size is never empty; an empty answer is the site failing, not a valid roster.
  if (rows.length === 0) throw new Error("ROSTER_EMPTY");
  return WoodburyRosterSchema.parse({
    records: rows.map((row) => ({
      recordKey: row.key,
      displayName: row.displayName,
      chargeText: row.chargeText,
      bondAmountMinor: row.bondAmountMinor
    })),
    listedTotal: rows.length,
    validEmptyMarker: false
  });
}

async function requestRoster(
  options: WoodburyRosterAdapterOptions,
  context: AdapterContext
): Promise<WoodburyRoster> {
  if (context.source.sourceUrl !== WOODBURY_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  // A booking or release between the reads changes the roster; start over then.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(options, context);
    } catch (error) {
      const changed = error instanceof Error && error.message === "ROSTER_CHANGED_DURING_CRAWL";
      if (!changed || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

export function createWoodburyCountySourceAdapter(
  options: WoodburyRosterAdapterOptions
): SourceAdapter<WoodburyRoster, WoodburyRoster, WoodburyRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: WOODBURY_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: WOODBURY_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<WoodburyRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<WoodburyRoster>> {
      const result = WoodburyRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<WoodburyRoster>> {
      const result = WoodburyRosterSchema.safeParse(payload);
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
              evidence: "The official Woodbury County In Jail Search returned 0 records."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.recordKey);
          const charges: Charge[] = record.chargeText
            ? [
                {
                  id: options.createId("charge", `${record.recordKey}|0|${record.chargeText}`),
                  bookingId,
                  sequence: 0,
                  description: record.chargeText,
                  sourceLabel: "Charges",
                  statuteCode: null,
                  disposition: null
                }
              ]
            : [];
          // The grid prints "No Bond" or a dollar amount for every row.
          const bondEntries: BondEntry[] = [
            record.bondAmountMinor === null
              ? {
                  id: options.createId("bond", `${bookingId}|no_bond`),
                  bookingId,
                  sequence: 0,
                  sourceLabel: "Bond Amount",
                  note: null,
                  state: "no_bond"
                }
              : {
                  id: options.createId("bond", `${bookingId}|${record.bondAmountMinor}`),
                  bookingId,
                  sequence: 0,
                  sourceLabel: "Bond Amount",
                  note:
                    record.bondAmountMinor === 0
                      ? "The source displays $0.00; this is not interpreted as no bond."
                      : null,
                  state: "monetary",
                  amountMinor: record.bondAmountMinor,
                  currency: "USD"
                }
          ];
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", record.recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The search shows no booking number.
            bookingIdentifier: null,
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            bondEntries,
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
        await requestPage(options, context);
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
