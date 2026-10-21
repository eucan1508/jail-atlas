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
import { assertFewWithoutCharges } from "./charge-gaps.js";

/**
 * Sheriff's offices that publish their jail roster through the myr2m.com roster service (an
 * ASP.NET page embedded on the sheriff's site). Each person is a card with name, charges, and bond;
 * paging is a form post that carries the page's view state, so a crawl is a GET followed by posts.
 */
export interface Myr2mRosterConfig {
  readonly adapterKey: string;
  /** Agency heading the roster prints above "Jail Roster", e.g. "Sharp County Sheriff". */
  readonly agencyHeading: string;
  readonly countyLabel: string;
  readonly diagnosticPrefix: string;
  readonly sourceUrl: string;
  readonly parserVersion: string;
}

export const SHARP_COUNTY_AR_ROSTER = {
  adapterKey: "sharp-county-ar-current-roster",
  agencyHeading: "Sharp County Sheriff",
  countyLabel: "Sharp County, Arkansas",
  diagnosticPrefix: "SHARP_COUNTY_AR",
  sourceUrl: "https://www.myr2m.com/sharpcoroster/",
  parserVersion: "1.0.0"
} as const satisfies Myr2mRosterConfig;

export const STONE_COUNTY_AR_ROSTER = {
  adapterKey: "stone-county-ar-current-roster",
  agencyHeading: "Stone County Sheriffs Office",
  countyLabel: "Stone County, Arkansas",
  diagnosticPrefix: "STONE_COUNTY_AR",
  sourceUrl: "https://www.myr2m.com/stonecoroster/",
  parserVersion: "1.0.0"
} as const satisfies Myr2mRosterConfig;

const MYR2M_ROSTERS: readonly Myr2mRosterConfig[] = [
  SHARP_COUNTY_AR_ROSTER,
  STONE_COUNTY_AR_ROSTER
];

export function myr2mRosterSite(adapterKey: string): Myr2mRosterConfig | undefined {
  return MYR2M_ROSTERS.find((config) => config.adapterKey === adapterKey);
}

const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;
const MAX_CRAWL_ATTEMPTS = 3;
const PAGE_SIZE = "30";
const SORT_BY_ARRESTED = "A";
const FIELD = "ctl00$ContentPlaceHolder1$";
const STATE_FIELDS = ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"] as const;
const SHOWN_TEXT = /^(\d+) inmates shown out of (\d+) total$/;
const ARRESTED_TEXT = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [AP]M$/;
const BOND_TEXT = /^\$(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})$/;
const RETRYABLE_CRAWL_ERRORS = new Set(["ROSTER_CHANGED_DURING_CRAWL"]);

const Myr2mRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100),
  bondAmountsMinor: z.array(z.number().int().nonnegative().max(100_000_000_000)).max(100)
});
const Myr2mRosterSchema = z.object({
  records: z.array(Myr2mRecordSchema).max(MAX_RECORDS),
  listedTotal: z.number().int().nonnegative(),
  validEmptyMarker: z.boolean()
});

export type Myr2mRoster = z.infer<typeof Myr2mRosterSchema>;
export type Myr2mRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type Myr2mRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface Myr2mRosterAdapterOptions {
  readonly fetch: Myr2mRosterFetch;
  readonly facilityId: string;
  readonly createId: Myr2mRosterIdFactory;
  readonly nowMs?: () => number;
}

type Myr2mCard = Readonly<{
  displayName: string;
  arrested: string;
  charges: string[];
  bondAmountsMinor: number[];
}>;

export type Myr2mPage = Readonly<{
  cards: Myr2mCard[];
  shown: number;
  total: number;
  /** Every current name from the page's name picker, in roster order. */
  names: string[];
  form: Record<string, string>;
}>;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(
  config: Myr2mRosterConfig,
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage: `The approved ${config.countyLabel} jail roster could not be processed safely.`,
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `${config.diagnosticPrefix}_${code}`.slice(0, 100)
  };
}

function bondMinor(text: string): number {
  const match = text.match(BOND_TEXT);
  if (!match) throw new Error("BOND_UNREADABLE");
  const amountMinor = Number(match[1]!.replace(/,/g, "")) * 100 + Number(match[2]);
  if (!Number.isSafeInteger(amountMinor)) throw new Error("BOND_UNREADABLE");
  return amountMinor;
}

function gridValues($: CheerioAPI, card: Parameters<CheerioAPI>[0], grid: string): string[] {
  const table = $(card).find(`table[id*='_${grid}Grid_']`);
  if (table.length === 0) return [];
  if (table.length !== 1) throw new Error("CARD_STRUCTURE_CHANGED");
  const rows = table.find("tr").toArray();
  const label = { charge: "Charges", bond: "Bond" }[grid];
  if (normalizeText($(rows[0]).text()) !== label) throw new Error("CARD_STRUCTURE_CHANGED");
  return rows.slice(1).map((row) => normalizeText($(row).text()));
}

/** Reads one roster page: the agency heading, the shown/total line, the name picker, and cards. */
export function parseMyr2mPage(config: Myr2mRosterConfig, html: string): Myr2mPage {
  const $ = load(html);
  if (
    normalizeText($("#lblAgencyName").text()) !== config.agencyHeading ||
    normalizeText($("#lblPageDescription").text()) !== "All Current Inmates"
  ) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const shownMatch = normalizeText($("#lblInmateslisted").text()).match(SHOWN_TEXT);
  if (!shownMatch) throw new Error("ROSTER_TOTAL_MISSING");
  const shown = Number(shownMatch[1]);
  const total = Number(shownMatch[2]);
  if (total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");

  const picker = $(`select[name='${FIELD}ddlSelectName']`);
  if (picker.length !== 1) throw new Error("NAME_PICKER_MISSING");
  const names = picker
    .find("option")
    .toArray()
    .map((option) => normalizeText($(option).text()));

  const form: Record<string, string> = {};
  for (const name of STATE_FIELDS) {
    const value = $(`input[type='hidden'][name='${name}']`).attr("value");
    if (value === undefined) throw new Error("FORM_STATE_MISSING");
    form[name] = value;
  }

  const cards = $("div.card")
    .toArray()
    .map((card): Myr2mCard => {
      const field = (label: string) => {
        const spans = $(card).find(`span[id*='_rptListInmates_${label}_']`);
        if (spans.length !== 1) throw new Error("CARD_STRUCTURE_CHANGED");
        return normalizeText(spans.text());
      };
      const displayName = field("lblName");
      const arrested = field("lblArrestDate");
      if (displayName.length < 2 || !ARRESTED_TEXT.test(arrested)) {
        throw new Error("INVALID_RECORD_IDENTITY");
      }
      // A new booking can show an empty charge list until its charges are entered.
      const charges = gridValues($, card, "charge").filter((charge) => charge !== "");
      return {
        displayName,
        arrested,
        charges,
        bondAmountsMinor: gridValues($, card, "bond").map(bondMinor)
      };
    });
  // Past the last page the roster repeats the last page's count with no cards.
  if (cards.length !== 0 && cards.length !== shown) throw new Error("RECORD_COUNT_MISMATCH");
  return { cards, shown, total, names, form };
}

async function readHtml(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return html;
}

async function requestPage(
  config: Myr2mRosterConfig,
  options: Myr2mRosterAdapterOptions,
  context: AdapterContext,
  form?: Record<string, string>
): Promise<Myr2mPage> {
  const response = await options.fetch(config.sourceUrl, {
    method: form ? "POST" : "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" },
    ...(form ? { body: new URLSearchParams(form) } : {})
  });
  return parseMyr2mPage(config, await readHtml(response));
}

function sortedKey(values: readonly string[]): string {
  return JSON.stringify([...values].sort());
}

async function crawlRoster(
  config: Myr2mRosterConfig,
  options: Myr2mRosterAdapterOptions,
  context: AdapterContext
): Promise<Myr2mRoster> {
  const first = await requestPage(config, options, context);
  if (first.total === 0) {
    if (first.cards.length !== 0 || first.names.length !== 0)
      throw new Error("RECORD_COUNT_MISMATCH");
    return Myr2mRosterSchema.parse({ records: [], listedTotal: 0, validEmptyMarker: true });
  }
  if (first.names.length !== first.total) throw new Error("RECORD_COUNT_MISMATCH");

  const pagingFields = {
    [`${FIELD}ddlSortBy`]: SORT_BY_ARRESTED,
    [`${FIELD}ddlPageSize`]: PAGE_SIZE
  };
  let page = await requestPage(config, options, context, {
    ...first.form,
    __EVENTTARGET: `${FIELD}ddlPageSize`,
    __EVENTARGUMENT: "",
    ...pagingFields
  });
  const cards: Myr2mCard[] = [];
  const maxPages = Math.ceil(first.total / Number(PAGE_SIZE)) + 1;
  for (let pageNumber = 1; ; pageNumber += 1) {
    if (page.total !== first.total || sortedKey(page.names) !== sortedKey(first.names)) {
      throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    }
    if (page.cards.length === 0) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    cards.push(...page.cards);
    if (cards.length >= first.total) break;
    if (pageNumber >= maxPages) throw new Error("PAGING_DID_NOT_ADVANCE");
    page = await requestPage(config, options, context, {
      ...page.form,
      __EVENTTARGET: "",
      __EVENTARGUMENT: "",
      ...pagingFields,
      [`${FIELD}cmdNext`]: "Next"
    });
  }

  // Every name in the picker must appear on exactly one card, or a page was skipped or repeated.
  if (
    cards.length !== first.total ||
    sortedKey(cards.map((card) => card.displayName)) !== sortedKey(first.names)
  ) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  const seen = new Map<string, number>();
  const records = cards.map((card) => {
    const base = `${card.displayName}|${card.arrested}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return {
      recordKey: count === 1 ? base : `${base}|${count}`,
      displayName: card.displayName,
      charges: card.charges,
      bondAmountsMinor: card.bondAmountsMinor
    };
  });
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  return Myr2mRosterSchema.parse({ records, listedTotal: first.total, validEmptyMarker: false });
}

async function requestRoster(
  config: Myr2mRosterConfig,
  options: Myr2mRosterAdapterOptions,
  context: AdapterContext
): Promise<Myr2mRoster> {
  if (context.source.sourceUrl !== config.sourceUrl) throw new Error("SOURCE_URL_MISMATCH");
  // Bookings and releases can land between page posts; start over when they do.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(config, options, context);
    } catch (error) {
      const retryable = error instanceof Error && RETRYABLE_CRAWL_ERRORS.has(error.message);
      if (!retryable || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

export function createMyr2mRosterAdapter(
  config: Myr2mRosterConfig,
  options: Myr2mRosterAdapterOptions
): SourceAdapter<Myr2mRoster, Myr2mRoster, Myr2mRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: config.adapterKey,
    adapterVersion: "1.0.0",
    parserVersion: config.parserVersion,
    async fetch(context): Promise<FetchResult<Myr2mRoster>> {
      try {
        return { ok: true, value: await requestRoster(config, options, context) };
      } catch (error) {
        return { ok: false, failure: classify(config, context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<Myr2mRoster>> {
      const result = Myr2mRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(config, context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<Myr2mRoster>> {
      const result = Myr2mRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(config, context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.records.length === 0 && payload.validEmptyMarker
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: `The official ${config.countyLabel} jail roster reported zero current inmates.`
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.recordKey);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${record.recordKey}|${sequence}|${description}`),
            bookingId,
            sequence,
            description,
            sourceLabel: "Charges",
            statuteCode: null,
            disposition: null
          }));
          const bondEntries: BondEntry[] = record.bondAmountsMinor.map((amountMinor, sequence) => ({
            id: options.createId("bond", `${bookingId}|${sequence}|${amountMinor}`),
            bookingId,
            sequence,
            sourceLabel: "Bond",
            note:
              amountMinor === 0
                ? "The source displays $0.00; this is not interpreted as no bond."
                : null,
            state: "monetary",
            amountMinor,
            currency: "USD"
          }));
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", record.recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The roster shows no booking number.
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
        return Promise.resolve({
          ok: false,
          failure: classify(config, context, "normalize", error)
        });
      }
    },
    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        await requestPage(config, options, context);
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
          failure: classify(config, context, "health_check", error)
        };
      }
    },
    classifyFailure(error, stage, context) {
      return classify(config, context, stage, error);
    }
  };
}
