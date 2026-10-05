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

/**
 * Sheriff websites that share one hosted roster template ("Inmate Roster (N)" heading, one card per
 * person with Booking #, Booking Date, Charges and Bond). Two URL layouts exist:
 *  - "roster-php": /roster.php?grp=20, profile links /roster_view.php?booking_num=...
 *  - "inmate-roster-path": /inmate-roster/filters/current/booking_time=desc/2, profile links
 *    /inmate-roster/<24 hex id>
 */
export type SheriffRosterLayout = "roster-php" | "inmate-roster-path";

export interface SheriffRosterSiteConfig {
  readonly adapterKey: string;
  /** Name that must appear on the official page, e.g. "Jefferson County". */
  readonly countyName: string;
  /** Prefix for diagnostic codes, e.g. "JEFFERSON_COUNTY_AR". */
  readonly diagnosticPrefix: string;
  readonly sourceUrl: string;
  readonly parserVersion: string;
  readonly layout: SheriffRosterLayout;
}

const MAX_PAGES = 40;
const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;
const PAGE_SIZE = 20;
const ROSTER_PATH_PREFIX = "/inmate-roster/filters/current/booking_time=desc/";

const SheriffRosterRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z.string().trim().min(1).max(100),
  bookingDateText: z.string().trim().min(1).max(100).nullable(),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100),
  bondText: z.string().trim().min(1).max(250).nullable()
});

const SheriffRosterSchema = z.object({
  records: z.array(SheriffRosterRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type SheriffRoster = z.infer<typeof SheriffRosterSchema>;
export type SheriffRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type SheriffRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface SheriffRosterAdapterOptions {
  readonly fetch: SheriffRosterFetch;
  readonly facilityId: string;
  readonly createId: SheriffRosterIdFactory;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(
  config: SheriffRosterSiteConfig,
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage: `The approved ${config.countyName} roster could not be processed safely.`,
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `${config.diagnosticPrefix}_${code}`.slice(0, 100)
  };
}

function rosterSite(config: SheriffRosterSiteConfig) {
  const sourceHost = new URL(config.sourceUrl).hostname;

  /** Canonical page URL, or null when the link is not a page of the current-custody roster. */
  function canonicalPageUrl(input: string): string | null {
    const url = new URL(input);
    if (
      url.protocol !== "https:" ||
      url.hostname !== sourceHost ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return null;
    }
    if (config.layout === "roster-php") {
      if (url.pathname !== "/roster.php") return null;
      const allowedParameters = new Set(["grp", "orderby", "sort"]);
      if ([...url.searchParams.keys()].some((key) => !allowedParameters.has(key))) return null;
      // Pager links repeat the parameter ("grp=140&grp=160"); the server uses the last value.
      const group = url.searchParams.getAll("grp").at(-1) ?? null;
      if (group === null) return config.sourceUrl;
      if (!/^\d{1,4}$/.test(group) || Number(group) > MAX_RECORDS) {
        throw new Error("INVALID_PAGE_OFFSET");
      }
      const canonical = new URL(config.sourceUrl);
      canonical.search = "";
      canonical.searchParams.set("grp", group);
      return canonical.href;
    }
    if (url.search !== "" || !url.pathname.startsWith(ROSTER_PATH_PREFIX)) return null;
    const page = url.pathname.slice(ROSTER_PATH_PREFIX.length);
    if (!/^\d{1,3}$/.test(page) || Number(page) < 1 || Number(page) > MAX_PAGES) {
      throw new Error("INVALID_PAGE_NUMBER");
    }
    return `https://${sourceHost}${ROSTER_PATH_PREFIX}${Number(page)}`;
  }

  function profileLinks($: CheerioAPI) {
    return config.layout === "roster-php"
      ? $("a[href*='roster_view.php'][href*='booking_num=']").toArray()
      : $("a[href^='/inmate-roster/']")
          .toArray()
          .filter((link) => /^\/inmate-roster\/[0-9a-f]{24}$/.test($(link).attr("href") ?? ""));
  }

  return { sourceHost, canonicalPageUrl, profileLinks };
}

function sourceIdentity($: CheerioAPI, config: SheriffRosterSiteConfig): void {
  const title = normalizeText($("title").first().text());
  const body = normalizeText($("body").text());
  if (!`${title} ${body}`.includes(config.countyName) || !body.includes("Inmate Roster")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
}

function cardLines($: CheerioAPI, cardInput: ReturnType<CheerioAPI>): string[] {
  const card = cardInput.clone();
  card.find("br").replaceWith("\n");
  card.find("div, dt, dd, p, h1, h2, h3, h4, h5, li, strong").each((_index, node) => {
    $(node).prepend("\n").append("\n");
  });
  return card.text().split(/\n+/).map(normalizeText).filter(Boolean);
}

function labelIndex(lines: readonly string[], label: string): number {
  return lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
}

function valueAfter(lines: readonly string[], label: string): string | null {
  const index = labelIndex(lines, label);
  const value = index >= 0 ? (lines[index + 1] ?? null) : null;
  return value !== null && /^[A-Za-z #]+:$/.test(value) ? null : value;
}

const CARD_LABELS = ["Booking #:", "Age:", "Booking Date:", "Charges:", "Bond:", "SO #:"];

function valuesBetween(lines: readonly string[], startLabel: string): readonly string[] {
  const start = labelIndex(lines, startLabel);
  if (start < 0) return [];
  const end = lines.findIndex(
    (line, index) =>
      index > start &&
      (CARD_LABELS.some((label) => label.toLowerCase() === line.toLowerCase()) ||
        /^view profile/i.test(line))
  );
  return lines.slice(start + 1, end < 0 ? lines.length : end);
}

function findRecordCard(profileLink: ReturnType<CheerioAPI>) {
  let node = profileLink.parent();
  for (let depth = 0; depth < 10 && node.length > 0; depth += 1) {
    const text = normalizeText(node.text());
    if (text.includes("Booking #:") && text.includes("Booking Date:")) {
      if (text.split("Booking #:").length !== 2) throw new Error("RECORD_CARD_AMBIGUOUS");
      return node;
    }
    node = node.parent();
  }
  throw new Error("RECORD_CARD_NOT_FOUND");
}

function parsePage(
  html: string,
  pageUrl: string,
  config: SheriffRosterSiteConfig,
  site: ReturnType<typeof rosterSite>
): {
  records: SheriffRoster["records"];
  pageUrls: readonly string[];
  declaredCount: number;
} {
  const $ = load(html);
  sourceIdentity($, config);
  const headingText = $("h1, h2, h3, h4, h5")
    .toArray()
    .map((element) => normalizeText($(element).text()))
    .find((value) => /Inmate Roster\s*\(\d+\)/i.test(value));
  if (!headingText) throw new Error("ROSTER_HEADING_MISSING");
  const declaredCount = Number(headingText.match(/\((\d+)\)/)?.[1]);

  const recordsByBooking = new Map<string, SheriffRoster["records"][number]>();
  for (const profileLink of site.profileLinks($)) {
    const href = $(profileLink).attr("href");
    if (!href) throw new Error("MISSING_PROFILE_URL");
    const profileUrl = new URL(href, pageUrl);
    if (profileUrl.hostname !== site.sourceHost) throw new Error("PROFILE_URL_BOUNDARY");

    const card = findRecordCard($(profileLink));
    const lines = cardLines($, card);
    const bookingNumber = normalizeText(valueAfter(lines, "Booking #:") ?? "");
    if (!bookingNumber) throw new Error("MISSING_BOOKING_NUMBER");
    if (
      config.layout === "roster-php" &&
      normalizeText(profileUrl.searchParams.get("booking_num") ?? "") !== bookingNumber
    ) {
      throw new Error("INVALID_RECORD_IDENTITY");
    }

    const altName = card
      .find("img[alt]")
      .toArray()
      .map((image) => normalizeText($(image).attr("alt") ?? ""))
      .find((alt) => /^Mugshot of /i.test(alt))
      ?.replace(/^Mugshot of /i, "");
    const sheriffOfficeLabelIndex = labelIndex(lines, "SO #:");
    const bookingLabelIndex = labelIndex(lines, "Booking #:");
    const nameBoundaryIndex =
      sheriffOfficeLabelIndex >= 0 ? sheriffOfficeLabelIndex : bookingLabelIndex;
    const displayName = normalizeText(
      altName ??
        lines
          .slice(0, nameBoundaryIndex < 0 ? 0 : nameBoundaryIndex)
          .filter((line) => !/^inmate roster/i.test(line) && !/^current inmates$/i.test(line))
          .at(-1) ??
        ""
    );
    const listedSheriffOfficeNumber = normalizeText(valueAfter(lines, "SO #:") ?? "");
    if (
      !displayName ||
      displayName === listedSheriffOfficeNumber ||
      displayName === bookingNumber ||
      /^[A-Za-z #]+:$/.test(displayName)
    ) {
      throw new Error("INVALID_RECORD_IDENTITY");
    }
    const record = SheriffRosterRecordSchema.parse({
      displayName,
      bookingNumber,
      bookingDateText: valueAfter(lines, "Booking Date:"),
      charges: valuesBetween(lines, "Charges:"),
      bondText: valueAfter(lines, "Bond:")
    });
    const previous = recordsByBooking.get(bookingNumber);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) {
      throw new Error("CONFLICTING_DUPLICATE_BOOKING_NUMBER");
    }
    recordsByBooking.set(bookingNumber, record);
  }

  const records = [...recordsByBooking.values()];
  if (records.length === 0 && declaredCount !== 0) throw new Error("ROSTER_STRUCTURE_MISSING");
  if (records.length > PAGE_SIZE) throw new Error("PAGE_SIZE_EXCEEDED");

  const pageUrls = $("a[href]")
    .toArray()
    .map((link) => site.canonicalPageUrl(new URL($(link).attr("href") ?? "", pageUrl).href))
    .filter((url): url is string => url !== null)
    .filter((url, index, all) => all.indexOf(url) === index);
  return { records, pageUrls, declaredCount };
}

const ROSTER_CHANGED = "ROSTER_CHANGED_DURING_CRAWL";
// Failures that a roster changing mid-crawl can cause; a fresh crawl usually succeeds.
const RETRYABLE_CRAWL_ERRORS = new Set([
  ROSTER_CHANGED,
  "RECORD_COUNT_MISMATCH",
  "CONFLICTING_DUPLICATE_BOOKING_NUMBER"
]);
const MAX_CRAWL_ATTEMPTS = 3;

async function crawlRoster(
  config: SheriffRosterSiteConfig,
  options: SheriffRosterAdapterOptions,
  context: AdapterContext
): Promise<SheriffRoster> {
  const site = rosterSite(config);
  const pending: string[] = [config.sourceUrl];
  const visited = new Set<string>();
  const recordsByBooking = new Map<string, SheriffRoster["records"][number]>();
  let declaredTotal: number | null = null;

  while (pending.length > 0) {
    const currentUrl = site.canonicalPageUrl(pending.shift() ?? "");
    if (currentUrl === null || visited.has(currentUrl)) continue;
    if (visited.size >= MAX_PAGES) throw new Error("PAGE_LIMIT_REACHED");
    visited.add(currentUrl);
    const response = await options.fetch(currentUrl, {
      method: "GET",
      redirect: "error",
      signal: context.signal,
      headers: { accept: "text/html", "accept-encoding": "identity" }
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const html = await response.text();
    if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
    const parsed = parsePage(html, currentUrl, config, site);
    declaredTotal ??= parsed.declaredCount;
    // A booking or release while we page through shifts entries between pages.
    if (parsed.declaredCount !== declaredTotal) throw new Error(ROSTER_CHANGED);
    for (const record of parsed.records) {
      const previous = recordsByBooking.get(record.bookingNumber);
      if (previous && JSON.stringify(previous) !== JSON.stringify(record)) {
        throw new Error("CONFLICTING_DUPLICATE_BOOKING_NUMBER");
      }
      recordsByBooking.set(record.bookingNumber, record);
    }
    for (const pageUrl of parsed.pageUrls) {
      if (!visited.has(pageUrl) && !pending.includes(pageUrl)) pending.push(pageUrl);
    }
  }
  if (recordsByBooking.size > MAX_RECORDS) throw new Error("RECORD_LIMIT_REACHED");
  // The first page's "Inmate Roster (N)" heading is the source total; a short crawl must fail.
  if (declaredTotal === null || recordsByBooking.size !== declaredTotal) {
    throw new Error("RECORD_COUNT_MISMATCH");
  }
  return SheriffRosterSchema.parse({
    records: [...recordsByBooking.values()],
    validEmptyMarker: declaredTotal === 0
  });
}

async function requestRoster(
  config: SheriffRosterSiteConfig,
  options: SheriffRosterAdapterOptions,
  context: AdapterContext
): Promise<SheriffRoster> {
  if (context.source.sourceUrl !== config.sourceUrl) throw new Error("SOURCE_URL_MISMATCH");
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(config, options, context);
    } catch (error) {
      const retryable = error instanceof Error && RETRYABLE_CRAWL_ERRORS.has(error.message);
      if (!retryable || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

function monetaryBond(
  text: string | null,
  bookingId: string,
  options: SheriffRosterAdapterOptions
) {
  if (!text) return [];
  const match = text.replace(/,/g, "").match(/^\$(\d+)(?:\.(\d{2}))?$/);
  if (!match) return [];
  const amountMinor = Number(match[1]) * 100 + Number(match[2] ?? "0");
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return [];
  const bond: BondEntry = {
    id: options.createId("bond", `${bookingId}|${text}`),
    bookingId,
    sequence: 0,
    sourceLabel: "Bond",
    note:
      amountMinor === 0 ? "The source displays $0.00; this is not interpreted as no bond." : null,
    state: "monetary",
    amountMinor,
    currency: "USD"
  };
  return [bond];
}

export function createSheriffRosterSiteAdapter(
  config: SheriffRosterSiteConfig,
  options: SheriffRosterAdapterOptions
): SourceAdapter<SheriffRoster, SheriffRoster, SheriffRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  const fail = (context: AdapterContext, stage: AdapterStage, error: unknown) =>
    classify(config, context, stage, error);
  return {
    key: config.adapterKey,
    adapterVersion: "1.0.0",
    parserVersion: config.parserVersion,
    async fetch(context): Promise<FetchResult<SheriffRoster>> {
      try {
        return { ok: true, value: await requestRoster(config, options, context) };
      } catch (error) {
        return { ok: false, failure: fail(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<SheriffRoster>> {
      const result = SheriffRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: fail(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<SheriffRoster>> {
      const result = SheriffRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: fail(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.records.length === 0 && payload.validEmptyMarker
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: `The official ${config.countyName} current-inmate roster explicitly reported zero records.`
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingNumber);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${record.bookingNumber}|${sequence}|${description}`),
            bookingId,
            sequence,
            description,
            sourceLabel: "Charges",
            statuteCode: null,
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
              sourceLabel: "Booking #",
              sourceIdentifiesAsBookingIdentifier: true
            },
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            bondEntries: monetaryBond(record.bondText, bookingId, options),
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
