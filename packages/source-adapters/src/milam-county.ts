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

export const MILAM_COUNTY_ADAPTER_KEY = "milam-county-tx-current-roster" as const;
export const MILAM_COUNTY_CURRENT_SOURCE_URL =
  "https://www.milamcountysherifftx.org/roster.php" as const;
export const MILAM_COUNTY_SOURCE_HOST = "www.milamcountysherifftx.org" as const;
export const MILAM_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_PAGES = 20;
const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;

const MilamRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z.string().trim().min(1).max(100),
  bookingDateText: z.string().trim().min(1).max(100).nullable(),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100),
  bondText: z.string().trim().min(1).max(250).nullable()
});

const MilamRosterSchema = z.object({
  records: z.array(MilamRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type MilamRoster = z.infer<typeof MilamRosterSchema>;
export type MilamRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type MilamRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface MilamRosterAdapterOptions {
  readonly fetch: MilamRosterFetch;
  readonly facilityId: string;
  readonly createId: MilamRosterIdFactory;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value
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
    publicMessage: "The approved Milam County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `MILAM_COUNTY_${code}`.slice(0, 100)
  };
}

function exactRosterUrl(input: string): URL {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.hostname !== MILAM_COUNTY_SOURCE_HOST ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== "" ||
    url.pathname !== "/roster.php"
  ) {
    throw new Error("SOURCE_URL_BOUNDARY");
  }
  const allowedParameters = new Set(["grp", "orderby", "sort"]);
  if ([...url.searchParams.keys()].some((key) => !allowedParameters.has(key))) {
    throw new Error("SOURCE_QUERY_BOUNDARY");
  }
  const group = url.searchParams.get("grp");
  if (group !== null && (!/^\d{1,4}$/.test(group) || Number(group) > MAX_RECORDS)) {
    throw new Error("INVALID_PAGE_OFFSET");
  }
  return url;
}

function canonicalRosterPageUrl(input: string): string {
  const url = exactRosterUrl(input);
  const group = url.searchParams.get("grp");
  if (group === null) return MILAM_COUNTY_CURRENT_SOURCE_URL;
  const canonical = new URL(MILAM_COUNTY_CURRENT_SOURCE_URL);
  canonical.searchParams.set("grp", group);
  return canonical.href;
}

function sourceIdentity($: CheerioAPI): void {
  const title = normalizeText($("title").first().text());
  const body = normalizeText($("body").text());
  if (!`${title} ${body}`.includes("Milam County") || !body.includes("Inmate Roster")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
}

function cardLines($: CheerioAPI, cardInput: ReturnType<CheerioAPI>): string[] {
  const card = cardInput.clone();
  card.find("br").replaceWith("\n");
  card.find("dt, dd, p, h1, h2, h3, h4, h5, li").each((_index, node) => {
    $(node).prepend("\n").append("\n");
  });
  return card.text().split(/\n+/).map(normalizeText).filter(Boolean);
}

function valueAfter(lines: readonly string[], label: string): string | null {
  const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
  return index >= 0 ? (lines[index + 1] ?? null) : null;
}

function valuesBetween(
  lines: readonly string[],
  startLabel: string,
  endLabel: string
): readonly string[] {
  const start = lines.findIndex((line) => line.toLowerCase() === startLabel.toLowerCase());
  if (start < 0) return [];
  const end = lines.findIndex(
    (line, index) => index > start && line.toLowerCase() === endLabel.toLowerCase()
  );
  return lines
    .slice(start + 1, end < 0 ? lines.length : end)
    .filter((line) => !/^view profile/i.test(line));
}

function findRecordCard(profileLink: ReturnType<CheerioAPI>) {
  let node = profileLink.parent();
  for (let depth = 0; depth < 10 && node.length > 0; depth += 1) {
    const text = normalizeText(node.text());
    if (
      text.includes("Booking #:") &&
      text.includes("Booking Date:") &&
      text.includes("Charges:")
    ) {
      return node;
    }
    node = node.parent();
  }
  throw new Error("RECORD_CARD_NOT_FOUND");
}

function parsePage(
  html: string,
  pageUrl: string
): {
  records: MilamRoster["records"];
  pageUrls: readonly string[];
  validEmptyMarker: boolean;
} {
  const $ = load(html);
  sourceIdentity($);
  const headingText = $("h1, h2, h3, h4, h5")
    .toArray()
    .map((element) => normalizeText($(element).text()))
    .find((value) => /Inmate Roster\s*\(\d+\)/i.test(value));
  const declaredCount = Number(headingText?.match(/\((\d+)\)/)?.[1] ?? "-1");

  const recordsByBooking = new Map<string, MilamRoster["records"][number]>();
  const profileLinks = $("a[href*='roster_view.php'][href*='booking_num=']").toArray();
  for (const profileLink of profileLinks) {
    const href = $(profileLink).attr("href");
    if (!href) throw new Error("MISSING_PROFILE_URL");
    const profileUrl = new URL(href, pageUrl);
    if (profileUrl.hostname !== MILAM_COUNTY_SOURCE_HOST) throw new Error("PROFILE_URL_BOUNDARY");
    const bookingNumber = normalizeText(profileUrl.searchParams.get("booking_num") ?? "");
    if (!bookingNumber) throw new Error("MISSING_BOOKING_NUMBER");

    const card = findRecordCard($(profileLink));
    const lines = cardLines($, card);
    const altName = card
      .find("img[alt]")
      .toArray()
      .map((image) => normalizeText($(image).attr("alt") ?? ""))
      .find((alt) => /^Mugshot of /i.test(alt))
      ?.replace(/^Mugshot of /i, "");
    const bookingLabelIndex = lines.findIndex((line) => line.toLowerCase() === "booking #:");
    const displayName = normalizeText(
      altName ??
        lines
          .slice(0, bookingLabelIndex < 0 ? 0 : bookingLabelIndex)
          .filter((line) => !/^inmate roster/i.test(line) && !/^current inmates$/i.test(line))
          .at(-1) ??
        ""
    );
    const listedBookingNumber = normalizeText(valueAfter(lines, "Booking #:") ?? "");
    if (!displayName || listedBookingNumber !== bookingNumber) {
      throw new Error("INVALID_RECORD_IDENTITY");
    }
    const record = MilamRecordSchema.parse({
      displayName,
      bookingNumber,
      bookingDateText: valueAfter(lines, "Booking Date:"),
      charges: valuesBetween(lines, "Charges:", "Bond:"),
      bondText: valueAfter(lines, "Bond:")
    });
    const previous = recordsByBooking.get(bookingNumber);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) {
      throw new Error("CONFLICTING_DUPLICATE_BOOKING_NUMBER");
    }
    recordsByBooking.set(bookingNumber, record);
  }

  const records = [...recordsByBooking.values()];
  const validEmptyMarker = declaredCount === 0 && records.length === 0;
  if (records.length === 0 && !validEmptyMarker) throw new Error("ROSTER_STRUCTURE_MISSING");

  const pageUrls = $("a[href*='roster.php'][href*='grp=']")
    .toArray()
    .map((link) => canonicalRosterPageUrl(new URL($(link).attr("href") ?? "", pageUrl).href))
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, MAX_PAGES - 1);
  return { records, pageUrls, validEmptyMarker };
}

async function requestRoster(
  options: MilamRosterAdapterOptions,
  context: AdapterContext
): Promise<MilamRoster> {
  if (context.source.sourceUrl !== MILAM_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const pending: string[] = [MILAM_COUNTY_CURRENT_SOURCE_URL];
  const visited = new Set<string>();
  const recordsByBooking = new Map<string, MilamRoster["records"][number]>();
  let validEmptyMarker = false;

  while (pending.length > 0) {
    const currentUrl = canonicalRosterPageUrl(pending.shift() ?? "");
    if (visited.has(currentUrl)) continue;
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
    const parsed = parsePage(html, currentUrl);
    validEmptyMarker ||= parsed.validEmptyMarker;
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
  return MilamRosterSchema.parse({ records: [...recordsByBooking.values()], validEmptyMarker });
}

function monetaryBond(text: string | null, bookingId: string, options: MilamRosterAdapterOptions) {
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

export function createMilamCountySourceAdapter(
  options: MilamRosterAdapterOptions
): SourceAdapter<MilamRoster, MilamRoster, MilamRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: MILAM_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: MILAM_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<MilamRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<MilamRoster>> {
      const result = MilamRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<MilamRoster>> {
      const result = MilamRosterSchema.safeParse(payload);
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
              evidence:
                "The official Milam County current-inmate roster explicitly reported zero records."
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
        return Promise.resolve({ ok: false, failure: classify(context, "normalize", error) });
      }
    },
    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        await requestRoster(options, context);
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
