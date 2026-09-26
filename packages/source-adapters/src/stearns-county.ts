import { NormalizedCustodySnapshotSchema, type Booking } from "@jail-atlas/domain";
import { load } from "cheerio/slim";
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

export const STEARNS_COUNTY_ADAPTER_KEY = "stearns-county-mn-current-roster" as const;
export const STEARNS_COUNTY_CURRENT_SOURCE_URL =
  "https://jailroster.stearnscountymn.gov/Current" as const;
const MAX_PAGES = 20;
const MAX_PAGE_BYTES = 3_000_000;

const textValue = z.string().trim().min(1).max(250);
const StearnsRecordSchema = z.object({
  displayName: textValue,
  bookingNumber: z.string().trim().min(1).max(100),
  bookingDate: z.string().trim().min(1).max(40)
});
const StearnsRosterSchema = z.object({
  records: z.array(StearnsRecordSchema).max(2_000),
  sourceLastUpdatedAt: z.string().trim().max(100).nullable()
});
export type StearnsRoster = z.infer<typeof StearnsRosterSchema>;
export type StearnsRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type StearnsRosterIdFactory = (
  kind: "snapshot" | "person" | "booking",
  sourceKey: string
) => string;

export interface StearnsRosterAdapterOptions {
  readonly fetch: StearnsRosterFetch;
  readonly facilityId: string;
  readonly createId: StearnsRosterIdFactory;
  readonly nowMs?: () => number;
}

function text(value: string): string {
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
    publicMessage: "The approved Stearns County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `STEARNS_COUNTY_${code}`.slice(0, 100)
  };
}

function parsePage(
  html: string,
  pageUrl: string
): { records: StearnsRoster["records"]; lastUpdated: string | null; lastPage: number } {
  const $ = load(html);
  const title = text($("title").first().text());
  const heading = text($("h1").first().text());
  if (!title.includes("Stearns County") && !heading.includes("Stearns County Current Inmates")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }

  const records = $("a[href*='/InmateDetail/']")
    .toArray()
    .map((element) => {
      const link = $(element);
      const href = link.attr("href");
      if (!href) throw new Error("MISSING_INMATE_DETAIL_URL");
      const detailUrl = new URL(href, pageUrl);
      const bookingNumber = detailUrl.searchParams.get("booking");
      if (!bookingNumber) throw new Error("MISSING_BOOKING_NUMBER");
      const row = link.closest("tr");
      const cells = row
        .find("td")
        .toArray()
        .map((cell) => text($(cell).text()));
      const linkedName = text(link.text());
      const firstName = cells.find((cell, index) => index > 0 && cell !== linkedName) ?? "";
      const bookingDate = cells.find((cell) => /\b\d{2}\/\d{2}\/\d{4}\b/.test(cell));
      if (!bookingDate) throw new Error("MISSING_BOOKING_DATE");
      return StearnsRecordSchema.parse({
        displayName: linkedName.includes(",") ? linkedName : text(`${linkedName}, ${firstName}`),
        bookingNumber,
        bookingDate
      });
    });
  const uniqueRecords = new Map<string, StearnsRoster["records"][number]>();
  for (const record of records) {
    const previous = uniqueRecords.get(record.bookingNumber);
    if (previous === undefined) {
      uniqueRecords.set(record.bookingNumber, record);
      continue;
    }
    if (
      previous.displayName !== record.displayName ||
      previous.bookingDate !== record.bookingDate
    ) {
      throw new Error("CONFLICTING_DUPLICATE_BOOKING_NUMBER");
    }
  }
  const pageNumbers = $("a[href*='page=']")
    .toArray()
    .map((element) =>
      Number(new URL($(element).attr("href") ?? "", pageUrl).searchParams.get("page"))
    )
    .filter((page) => Number.isInteger(page) && page > 0 && page <= MAX_PAGES);
  const lastPage = Math.max(1, ...pageNumbers);
  const lastUpdated =
    text($("body").text()).match(
      /Data last updated on\s+(\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)/i
    )?.[1] ?? null;
  return { records: [...uniqueRecords.values()], lastUpdated, lastPage };
}

async function requestRoster(
  options: StearnsRosterAdapterOptions,
  context: AdapterContext
): Promise<StearnsRoster> {
  if (context.source.sourceUrl !== STEARNS_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const allRecords: StearnsRoster["records"] = [];
  let sourceLastUpdatedAt: string | null = null;
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page += 1) {
    const url = new URL(STEARNS_COUNTY_CURRENT_SOURCE_URL);
    url.searchParams.set("page", String(page));
    const response = await options.fetch(url.toString(), {
      method: "GET",
      redirect: "error",
      signal: context.signal,
      headers: { accept: "text/html", "accept-encoding": "identity" }
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const html = await response.text();
    if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
    const parsed = parsePage(html, url.toString());
    allRecords.push(...parsed.records);
    sourceLastUpdatedAt ??= parsed.lastUpdated;
    lastPage = parsed.lastPage;
  }
  if (allRecords.length > 2_000) throw new Error("RECORD_LIMIT_REACHED");
  const seen = new Set<string>();
  for (const record of allRecords) {
    if (seen.has(record.bookingNumber)) throw new Error("DUPLICATE_BOOKING_NUMBER");
    seen.add(record.bookingNumber);
  }
  return StearnsRosterSchema.parse({ records: allRecords, sourceLastUpdatedAt });
}

export function createStearnsCountySourceAdapter(
  options: StearnsRosterAdapterOptions
): SourceAdapter<StearnsRoster, StearnsRoster, StearnsRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: STEARNS_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: "1.0.0",
    async fetch(context): Promise<FetchResult<StearnsRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<StearnsRoster>> {
      const result = StearnsRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<StearnsRoster>> {
      const result = StearnsRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.records.length === 0
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: "The approved Stearns current-inmate roster returned no records."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingNumber);
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", record.displayName),
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
            charges: [],
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
