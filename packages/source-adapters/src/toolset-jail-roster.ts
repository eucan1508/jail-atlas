import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
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
 * Some Kansas sheriffs publish their jail roster as a WordPress page built with a paged list
 * ("Number of Inmates: N", ten people per page, "?wpv_view_count=<view>&wpv_paged=<n>").
 */
export interface ToolsetJailRosterConfig {
  readonly adapterKey: string;
  readonly countyName: string;
  readonly diagnosticPrefix: string;
  readonly sourceUrl: string;
  /** The list's view number, printed on the page and in its pager links. */
  readonly viewNumber: string;
  readonly parserVersion: string;
}

export const JACKSON_COUNTY_KS_ROSTER = {
  adapterKey: "jackson-county-ks-current-roster",
  countyName: "Jackson County",
  diagnosticPrefix: "JACKSON_COUNTY_KS",
  sourceUrl: "https://www.jasoks.org/agency-data/jail-roster/",
  viewNumber: "5832",
  parserVersion: "1.0.0"
} as const satisfies ToolsetJailRosterConfig;

export const BROWN_COUNTY_KS_ROSTER = {
  adapterKey: "brown-county-ks-current-roster",
  countyName: "Brown County",
  diagnosticPrefix: "BROWN_COUNTY_KS",
  sourceUrl: "https://www.brownso.org/agency-data/jail-roster/",
  viewNumber: "3072",
  parserVersion: "1.0.0"
} as const satisfies ToolsetJailRosterConfig;

export const NEMAHA_COUNTY_KS_ROSTER = {
  adapterKey: "nemaha-county-ks-current-roster",
  countyName: "Nemaha County",
  diagnosticPrefix: "NEMAHA_COUNTY_KS",
  // The Sheriff's site moved the roster under /jail/; the old /agency-data/ path now redirects.
  sourceUrl: "https://nemahasoks.gov/jail/jail-roster/",
  viewNumber: "285",
  parserVersion: "1.0.0"
} as const satisfies ToolsetJailRosterConfig;

export const TOOLSET_JAIL_ROSTERS = [
  JACKSON_COUNTY_KS_ROSTER,
  BROWN_COUNTY_KS_ROSTER,
  NEMAHA_COUNTY_KS_ROSTER
] as const;

export function toolsetJailRoster(adapterKey: string): ToolsetJailRosterConfig | null {
  return TOOLSET_JAIL_ROSTERS.find((site) => site.adapterKey === adapterKey) ?? null;
}

const MAX_PAGES = 60;
const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;
// Each person opens with a shaded heading: <h3 style="…"> on most sites, or
// <h2 class="nso-roster-h" style="…"> where the theme sets a class. The level is captured so the
// heading's own closing tag can be found.
const RECORD_START = /<h([23])(?: class="[^"<>]*")? style="background-color:#C6CDD7;">/g;
const TOTAL = /\(Number of Inmates: (\d+) \)/g;
const BOOKING = /<b>Booking Number:<\/b>\s*([^<]*?)\s*<br\s*\/?>/g;
const CHARGES = /<b>Charges:<\/b>([\s\S]*?)<b>Bond:<\/b>/g;
const NEXT_LINK = /class="wpv-filter-next-link[^"]*"\s+href="([^"]*)"/g;
const BOOKING_NUMBER = /^B\d{8,14}$/;
const NAME = /^[^,]+, \S.*$/;
// "21-5915(a) Failure to appear: STAT": a Kansas statute, its title, and the roster's type tag.
const STATUTE_CHARGE = /^(\d{1,2}-\d{3,5}[0-9A-Za-z()]*) (.+?)(?:: STAT)?$/;
const TYPE_TAG = /: STAT$/;

const ToolsetChargeSchema = z.object({
  statuteCode: z.string().min(1).max(100).nullable(),
  description: z.string().min(1).max(1_000)
});
const ToolsetRecordSchema = z.object({
  bookingNumber: z.string().regex(BOOKING_NUMBER),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(ToolsetChargeSchema).max(100)
});
const ToolsetRosterSchema = z.object({
  records: z.array(ToolsetRecordSchema).max(MAX_RECORDS),
  total: z.number().int().nonnegative().max(MAX_RECORDS)
});

export type ToolsetRoster = z.infer<typeof ToolsetRosterSchema>;
type ToolsetRecord = z.infer<typeof ToolsetRecordSchema>;
export type ToolsetRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type ToolsetRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface ToolsetRosterAdapterOptions {
  readonly fetch: ToolsetRosterFetch;
  readonly facilityId: string;
  readonly createId: ToolsetRosterIdFactory;
  readonly nowMs?: () => number;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " "
};

function decode(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity: string, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) return String.fromCodePoint(Number(code.slice(1)));
    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}

function text(html: string): string {
  return decode(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(
  config: ToolsetJailRosterConfig,
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage: `The approved ${config.countyName} jail roster could not be processed safely.`,
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `${config.diagnosticPrefix}_${code}`.slice(0, 100)
  };
}

export function toolsetPageUrl(config: ToolsetJailRosterConfig, page: number): string {
  return page === 1
    ? config.sourceUrl
    : `${config.sourceUrl}?wpv_view_count=${config.viewNumber}&wpv_paged=${page}`;
}

function parseCharges(block: string): ToolsetRecord["charges"] {
  const matches = [...block.matchAll(CHARGES)];
  if (matches.length !== 1) throw new Error("CHARGES_UNREADABLE");
  const listed = text(matches[0]![1]!);
  if (!listed) return [];
  return listed.split("|").map((entry) => {
    const charge = entry.trim();
    if (!charge) throw new Error("CHARGE_EMPTY");
    const statute = charge.match(STATUTE_CHARGE);
    return statute
      ? { statuteCode: statute[1]!, description: statute[2]!.trim() }
      : { statuteCode: null, description: charge.replace(TYPE_TAG, "") };
  });
}

export interface ToolsetPage {
  readonly total: number | null;
  readonly records: ToolsetRecord[];
  readonly hasNext: boolean;
}

/**
 * Reads one page of the list. Each person is a heading with their name, then the booking number
 * and charges; photos, bond amounts, arresting agencies, booking dates, and the age, sex, and race
 * line are read past and never kept.
 */
export function parseToolsetPage(
  config: ToolsetJailRosterConfig,
  html: string,
  page: number
): ToolsetPage {
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
  if (!decode(title).includes(`${config.countyName} Sheriff`)) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  if (!html.includes(`data-viewnumber="${config.viewNumber}"`))
    throw new Error("ROSTER_VIEW_MISSING");
  if (!html.trimEnd().endsWith("</html>")) throw new Error("PAGE_TRUNCATED");
  const totals = [...html.matchAll(TOTAL)].map((match) => Number(match[1]));
  if (totals.length > 1) throw new Error("ROSTER_TOTAL_REPEATED");
  const starts = [...html.matchAll(RECORD_START)];
  const blocks = starts.map((start, index) => ({
    level: start[1]!,
    body: html.slice(start.index + start[0].length, starts[index + 1]?.index ?? html.length)
  }));
  // Every booking number must sit under a person heading; if not, the heading markup changed.
  if ([...html.matchAll(BOOKING)].length !== blocks.length) throw new Error("LAYOUT_CHANGED");
  if (blocks.length > 0 && totals.length === 0) throw new Error("ROSTER_TOTAL_MISSING");

  const records = blocks.map(({ level, body: block }) => {
    const headingEnd = block.indexOf(`</h${level}>`);
    if (headingEnd < 0) throw new Error("NAME_UNREADABLE");
    const displayName = text(block.slice(0, headingEnd));
    if (!NAME.test(displayName)) throw new Error("NAME_UNREADABLE");
    const bookings = [...block.matchAll(BOOKING)];
    if (bookings.length !== 1) throw new Error("BOOKING_NUMBER_UNREADABLE");
    const bookingNumber = text(bookings[0]![1]!);
    if (!BOOKING_NUMBER.test(bookingNumber)) throw new Error("BOOKING_NUMBER_UNREADABLE");
    return { bookingNumber, displayName, charges: parseCharges(block) };
  });
  const nextLinks = [...html.matchAll(NEXT_LINK)].map((match) => decode(match[1]!));
  if (nextLinks.length > 1) throw new Error("PAGER_UNREADABLE");
  const expectedNext = new URL(toolsetPageUrl(config, page + 1));
  if (nextLinks.length === 1 && nextLinks[0] !== `${expectedNext.pathname}${expectedNext.search}`) {
    throw new Error("PAGER_UNREADABLE");
  }
  return { total: totals[0] ?? null, records, hasNext: nextLinks.length === 1 };
}

async function requestPage(
  config: ToolsetJailRosterConfig,
  options: ToolsetRosterAdapterOptions,
  context: AdapterContext,
  page: number
): Promise<ToolsetPage> {
  const response = await options.fetch(toolsetPageUrl(config, page), {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return parseToolsetPage(config, html, page);
}

async function requestRoster(
  config: ToolsetJailRosterConfig,
  options: ToolsetRosterAdapterOptions,
  context: AdapterContext
): Promise<ToolsetRoster> {
  if (context.source.sourceUrl !== config.sourceUrl) throw new Error("SOURCE_URL_MISMATCH");
  const records: ToolsetRecord[] = [];
  let total: number | null = null;
  for (let page = 1; ; page += 1) {
    if (page > MAX_PAGES) throw new Error("TOO_MANY_PAGES");
    const result = await requestPage(config, options, context, page);
    if (result.records.length === 0) throw new Error(page === 1 ? "ROSTER_EMPTY" : "PAGE_EMPTY");
    if (total === null) total = result.total;
    else if (result.total !== total) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    records.push(...result.records);
    if (!result.hasNext) break;
  }
  if (total === null || records.length !== total) throw new Error("ROSTER_COUNT_MISMATCH");
  if (new Set(records.map((record) => record.bookingNumber)).size !== records.length) {
    throw new Error("DUPLICATE_BOOKING");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  return ToolsetRosterSchema.parse({ records, total });
}

export function createToolsetJailRosterAdapter(
  config: ToolsetJailRosterConfig,
  options: ToolsetRosterAdapterOptions
): SourceAdapter<ToolsetRoster, ToolsetRoster, ToolsetRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  const fail = (context: AdapterContext, stage: AdapterStage, error: unknown) =>
    classify(config, context, stage, error);
  return {
    key: config.adapterKey,
    adapterVersion: "1.0.0",
    parserVersion: config.parserVersion,
    async fetch(context): Promise<FetchResult<ToolsetRoster>> {
      try {
        return { ok: true, value: await requestRoster(config, options, context) };
      } catch (error) {
        return { ok: false, failure: fail(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<ToolsetRoster>> {
      const result = ToolsetRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: fail(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<ToolsetRoster>> {
      const result = ToolsetRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: fail(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      // A county jail roster that lists no one is treated as broken, never as a valid empty jail.
      return Promise.resolve({ kind: "not_empty", recordCount: payload.records.length });
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingNumber);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId(
              "charge",
              `${record.bookingNumber}|${sequence}|${charge.statuteCode ?? ""}|${charge.description}`
            ),
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
              id: options.createId("person", record.bookingNumber),
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
        return Promise.resolve({ ok: false, failure: fail(context, "normalize", error) });
      }
    },
    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        await requestRoster(config, options, context);
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
          failure: fail(context, "health_check", error)
        };
      }
    },
    classifyFailure(error, stage, context) {
      return fail(context, stage, error);
    }
  };
}
