import { NormalizedCustodySnapshotSchema, type Booking } from "@jail-atlas/domain";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
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

export const WASHINGTON_COUNTY_MN_ADAPTER_KEY = "washington-county-mn-current-roster" as const;
export const WASHINGTON_COUNTY_MN_CURRENT_SOURCE_URL =
  "https://web1.washingtoncountymn.gov/ImageShare/Images/reports/inmateroster/InmateRosterReport.pdf" as const;
export const WASHINGTON_COUNTY_MN_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 2_000_000;
// Text items on one printed row share a baseline; allow for small font offsets.
const ROW_TOLERANCE = 3;
const COLUMN_TOLERANCE = 6;
// The report is regenerated during the day; an older one means the county stopped updating it.
const MAX_REPORT_AGE_MS = 48 * 60 * 60 * 1_000;
// "as of" is printed in Central time; allow for the offset when comparing to UTC.
const TIMEZONE_ALLOWANCE_MS = 6 * 60 * 60 * 1_000;

const JID = /^J\d{8}$/;
const BOOKING_NUMBER = /^\d{7}$/;
const BOOKING_DATE = /^\d{2}\/\d{2}\/\d{2}$/;
const AS_OF = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) ([AP]M)$/;
const UPPERCASE_TOKEN = /^[A-Z][A-Z'.-]*$/;

const WashingtonRecordSchema = z.object({
  displayName: z.string().trim().min(2).max(250),
  bookingNumber: z.string().regex(BOOKING_NUMBER)
});
const WashingtonRosterSchema = z.object({
  records: z.array(WashingtonRecordSchema).max(MAX_RECORDS),
  asOfText: z.string().regex(AS_OF),
  validEmptyMarker: z.boolean()
});

export type WashingtonRoster = z.infer<typeof WashingtonRosterSchema>;
export type WashingtonRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type WashingtonRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type WashingtonPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type WashingtonPdfPage = readonly WashingtonPdfTextItem[];
export type WashingtonRosterPdfExtractor = (
  bytes: Uint8Array
) => Promise<readonly WashingtonPdfPage[]>;

export interface WashingtonRosterAdapterOptions {
  readonly fetch: WashingtonRosterFetch;
  readonly facilityId: string;
  readonly createId: WashingtonRosterIdFactory;
  readonly extractPdfPages?: WashingtonRosterPdfExtractor;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value.replace(/ /g, " ").replace(/\s+/g, " ").trim();
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
      "The approved Washington County, Minnesota jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `WASHINGTON_COUNTY_MN_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly WashingtonPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: WashingtonPdfPage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .filter(
            (item): item is typeof item & { str: string; transform: number[] } => "str" in item
          )
          .map((item) => {
            const transform: unknown = item.transform;
            const rawX: unknown = Array.isArray(transform) ? transform[4] : undefined;
            const rawY: unknown = Array.isArray(transform) ? transform[5] : undefined;
            return {
              text: normalizeText(item.str),
              x: typeof rawX === "number" ? rawX : 0,
              y: typeof rawY === "number" ? rawY : 0
            };
          })
          .filter((item) => item.text.length > 0)
      );
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages;
}

/**
 * Joins a column's wrapped lines. A name too long for its column breaks mid-word, so a line that
 * follows a hyphen or starts in lowercase continues the same word.
 */
function joinLines(lines: readonly string[]): string {
  return lines.reduce(
    (joined, line) =>
      !joined
        ? line
        : joined.endsWith("-") || /^[a-z]/.test(line)
          ? joined + line
          : `${joined} ${line}`,
    ""
  );
}

/**
 * Builds "LAST, First Middle". Last names print in capitals; when the PDF merges the last and
 * first name into one text item, the capitalized words that open it are the last name.
 */
function displayName(last: string, given: string): string {
  if (given) return `${last}, ${given}`;
  const tokens = last.split(" ");
  const split = tokens.findIndex((token) => !UPPERCASE_TOKEN.test(token));
  if (split <= 0) return last;
  return `${tokens.slice(0, split).join(" ")}, ${tokens.slice(split).join(" ")}`;
}

function asOfMs(text: string): number {
  const match = text.match(AS_OF);
  if (!match) throw new Error("MISSING_SOURCE_TIMESTAMP");
  const [, month, day, year, hour, minute, second, meridiem] = match;
  const hours = (Number(hour) % 12) + (meridiem === "PM" ? 12 : 0);
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    hours,
    Number(minute),
    Number(second)
  );
}

function pageHeader(page: WashingtonPdfPage, label: string): WashingtonPdfTextItem {
  const item = page.find((candidate) => candidate.text === label);
  if (!item) throw new Error("ROSTER_STRUCTURE_MISSING");
  return item;
}

export function parseWashingtonRosterPages(pages: readonly WashingtonPdfPage[]): WashingtonRoster {
  if (pages.length === 0) throw new Error("ROSTER_STRUCTURE_MISSING");
  let declaredTotal: number | undefined;
  let asOfText: string | undefined;
  const records: z.infer<typeof WashingtonRecordSchema>[] = [];
  const seenBookings = new Set<string>();

  pages.forEach((page, index) => {
    const texts = page.map((item) => item.text);
    if (
      !texts.includes("ADULT INMATE ROSTER REPORT") ||
      !texts.includes("Washington County Jail") ||
      !texts.includes("Active Inmates as of:")
    ) {
      throw new Error("SOURCE_IDENTITY_MISMATCH");
    }

    // Every page repeats the count and timestamp; they must agree across the whole report.
    const counts = texts
      .map((text) => text.match(/^Inmate Count: (\d+)$/)?.[1])
      .filter((value): value is string => value !== undefined);
    const stamps = texts.filter((text) => AS_OF.test(text));
    if (counts.length !== 1 || stamps.length !== 1) throw new Error("TOTAL_RECORDS_MISSING");
    const count = Number(counts[0]);
    if (declaredTotal !== undefined && declaredTotal !== count) {
      throw new Error("ROSTER_CHANGED_DURING_PRINT");
    }
    if (asOfText !== undefined && asOfText !== stamps[0]) {
      throw new Error("ROSTER_CHANGED_DURING_PRINT");
    }
    declaredTotal = count;
    asOfText = stamps[0];

    // The footer prints "PAGE i OF n" as separate words; read the numbers that follow the labels.
    const pageWord = page.find((item) => item.text === "PAGE");
    const ofWord = page.find((item) => item.text === "OF");
    if (!pageWord || !ofWord) throw new Error("PAGE_LABEL_MISSING");
    const footerNumbers = page
      .filter((item) => Math.abs(item.y - pageWord.y) <= ROW_TOLERANCE && /^\d+$/.test(item.text))
      .sort((left, right) => left.x - right.x);
    const pageNumber = footerNumbers.find((item) => item.x > pageWord.x && item.x < ofWord.x);
    const pageCount = footerNumbers.find((item) => item.x > ofWord.x);
    if (Number(pageNumber?.text) !== index + 1 || Number(pageCount?.text) !== pages.length) {
      throw new Error("PAGE_SEQUENCE_MISMATCH");
    }

    const lastHeader = pageHeader(page, "Last Name");
    const firstHeader = pageHeader(page, "First Name");
    const middleHeader = pageHeader(page, "MI");
    const jidHeader = pageHeader(page, "JID #");
    const bookingHeader = pageHeader(page, "Booking Date Booking#");
    const releaseHeader = pageHeader(page, "Release Est. # Days");
    const bodyTop = lastHeader.y - ROW_TOLERANCE;
    const bodyBottom = pageWord.y + ROW_TOLERANCE;
    const firstStart = firstHeader.x - COLUMN_TOLERANCE;
    const middleStart = middleHeader.x - COLUMN_TOLERANCE;
    const jidStart = jidHeader.x - COLUMN_TOLERANCE;
    const bookingStart = bookingHeader.x - COLUMN_TOLERANCE;
    const releaseStart = releaseHeader.x - COLUMN_TOLERANCE;
    const body = page.filter((item) => item.y < bodyTop && item.y > bodyBottom);

    // Each row opens with the inmate's JID in its own column.
    const anchors = body
      .filter((item) => item.x >= jidStart && item.x < bookingStart && JID.test(item.text))
      .sort((left, right) => right.y - left.y);
    if (body.some((item) => item.x >= jidStart && item.x < bookingStart && !JID.test(item.text))) {
      throw new Error("ROW_STRUCTURE_CHANGED");
    }
    const firstAnchor = anchors[0];
    if (body.some((item) => item.y > (firstAnchor?.y ?? -Infinity) + ROW_TOLERANCE)) {
      throw new Error("RECORD_SPLIT_ACROSS_PAGES");
    }

    anchors.forEach((anchor, rowIndex) => {
      const top = anchor.y + ROW_TOLERANCE;
      const bottom = (anchors[rowIndex + 1]?.y ?? -Infinity) + ROW_TOLERANCE;
      const rowItems = body.filter((item) => item.y <= top && item.y > bottom);
      const column = (start: number, end: number) =>
        rowItems
          .filter((item) => item.x >= start && item.x < end)
          .sort((left, right) => right.y - left.y || left.x - right.x)
          .map((item) => item.text);

      const last = joinLines(column(-Infinity, firstStart));
      const given = [
        joinLines(column(firstStart, middleStart)),
        joinLines(column(middleStart, jidStart))
      ]
        .filter(Boolean)
        .join(" ");
      const bookingCells = column(bookingStart, releaseStart);
      if (
        !last ||
        bookingCells.length !== 2 ||
        !BOOKING_DATE.test(bookingCells[0]!) ||
        !BOOKING_NUMBER.test(bookingCells[1]!)
      ) {
        throw new Error("INVALID_RECORD_IDENTITY");
      }
      const bookingNumber = bookingCells[1]!;
      if (seenBookings.has(bookingNumber)) throw new Error("DUPLICATE_BOOKING_NUMBER");
      seenBookings.add(bookingNumber);
      records.push(
        WashingtonRecordSchema.parse({ displayName: displayName(last, given), bookingNumber })
      );
    });
  });

  if (records.length !== declaredTotal) throw new Error("RECORD_COUNT_MISMATCH");
  return WashingtonRosterSchema.parse({
    records,
    asOfText,
    validEmptyMarker: declaredTotal === 0
  });
}

async function requestRoster(
  options: WashingtonRosterAdapterOptions,
  context: AdapterContext
): Promise<WashingtonRoster> {
  if (context.source.sourceUrl !== WASHINGTON_COUNTY_MN_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(WASHINGTON_COUNTY_MN_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/pdf", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("RESPONSE_SIZE");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_RESPONSE_BYTES) throw new Error("RESPONSE_SIZE");
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    throw new Error("INVALID_PDF_SIGNATURE");
  }
  const roster = parseWashingtonRosterPages(
    await (options.extractPdfPages ?? extractPdfPages)(bytes)
  );
  const ageMs = Date.parse(context.requestedAt) - asOfMs(roster.asOfText);
  if (ageMs > MAX_REPORT_AGE_MS + TIMEZONE_ALLOWANCE_MS) throw new Error("SOURCE_REPORT_STALE");
  return roster;
}

export function createWashingtonCountyMnSourceAdapter(
  options: WashingtonRosterAdapterOptions
): SourceAdapter<WashingtonRoster, WashingtonRoster, WashingtonRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: WASHINGTON_COUNTY_MN_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: WASHINGTON_COUNTY_MN_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<WashingtonRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<WashingtonRoster>> {
      const result = WashingtonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<WashingtonRoster>> {
      const result = WashingtonRosterSchema.safeParse(payload);
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
              evidence: "The official Washington County jail roster reported Inmate Count: 0."
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
              id: options.createId("person", `${record.bookingNumber}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            bookingIdentifier: {
              value: record.bookingNumber,
              sourceLabel: "Booking#",
              sourceIdentifiesAsBookingIdentifier: true
            },
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            // The roster lists no charges or bail.
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
