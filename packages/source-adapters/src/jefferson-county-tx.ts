import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
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
import { assertFewWithoutCharges } from "./charge-gaps.js";

export const JEFFERSON_COUNTY_TX_ADAPTER_KEY = "jefferson-county-tx-current-roster" as const;
/** The Sheriff's current inmate list, published as a PDF on the county website. */
export const JEFFERSON_COUNTY_TX_CURRENT_SOURCE_URL =
  "https://jeffersoncountytx.gov/blobs/Sheriff/content/documents/inmate/CURRENTINMATES.PDF" as const;
export const JEFFERSON_COUNTY_TX_PARSER_VERSION = "1.0.0" as const;

// The jail holds about 1,050 people; leave room for growth.
const MAX_RECORDS = 2_000;
const MAX_RESPONSE_BYTES = 8_000_000;
// The list is reprinted every day; allow a long weekend before calling it stale.
const MAX_PRINT_AGE_MS = 72 * 60 * 60 * 1_000;
// The print time is local (Central); allow for the offset when comparing to UTC.
const TIMEZONE_ALLOWANCE_MS = 6 * 60 * 60 * 1_000;

const FOOTER_TITLE = "Jefferson County Corrections Inmate Roster";
const PRINT_TIME = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) ([AP]M)$/;
const PAGE_LABEL = /^(\d+) \/(?: (\d+))?$/;
const HEADERS = [
  "Name",
  "Race",
  "Date / Time",
  "Arrest Agency",
  "Age",
  "Gender",
  "Charge",
  "Bond Amount",
  "Warrant Num",
  "Degree"
];
const GENDERS = new Set(["Male", "Female", "Unknown"]);
const ARREST_DATE = /^\d{2}\/\d{2}\/\d{4}(?: \d{2}:\d{2})?$/;
const AGE = /^\d{1,3}$/;
const NAME = /^[\p{L}' .-]+, [\p{L}' .,-]+$/u;

// Column positions in the printed list. Allow small offsets.
const SLACK = 3;
const NAME_X = 23.6;
const DEMOGRAPHICS_X = 138.4;
const CHARGE_X = 200.6;
// Items right of here on a charge row are its bond, warrant number, and degree.
const RIGHT_COLUMNS_X = 280;
// Everything above this line is the page footer (title, print time, page number).
const FOOTER_Y = 695;
// A wrapped charge line sits 13.3 points under the line before it; a new charge starts 17-18
// points down.
const WRAP_GAP = 13.3;
const WRAP_SLACK = 1;
const SAME_ROW = 0.5;

const JeffersonRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});
const JeffersonRosterSchema = z.object({
  records: z.array(JeffersonRecordSchema).max(MAX_RECORDS),
  printTimeText: z.string().regex(PRINT_TIME),
  validEmptyMarker: z.boolean()
});

export type JeffersonRoster = z.infer<typeof JeffersonRosterSchema>;
export type JeffersonRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type JeffersonRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type JeffersonPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type JeffersonPdfPage = readonly JeffersonPdfTextItem[];
export type JeffersonPdfExtractor = (bytes: Uint8Array) => Promise<readonly JeffersonPdfPage[]>;

export interface JeffersonRosterAdapterOptions {
  readonly fetch: JeffersonRosterFetch;
  readonly facilityId: string;
  readonly createId: JeffersonRosterIdFactory;
  readonly extractPdfPages?: JeffersonPdfExtractor;
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
    publicMessage:
      "The approved Jefferson County, Texas inmate list could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `JEFFERSON_COUNTY_TX_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly JeffersonPdfPage[]> {
  const loadingTask = getDocument({ data: bytes, stopAtErrors: true, useSystemFonts: true });
  const document = await loadingTask.promise;
  const pages: JeffersonPdfPage[] = [];
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

function near(item: JeffersonPdfTextItem, x: number): boolean {
  return Math.abs(item.x - x) <= SLACK;
}

/** Central-time print stamp read as if it were UTC; the age check allows for the offset. */
function printTimeMs(text: string): number {
  const match = text.match(PRINT_TIME);
  if (!match) throw new Error("PRINT_TIME_MISSING");
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

/** "N / M" is printed as one item, or split into "N /" and "M" on the last page. */
function pageLabel(page: JeffersonPdfPage): { number: number; total: number } | null {
  const label = page.find((item) => item.y > FOOTER_Y && PAGE_LABEL.test(item.text));
  const match = label?.text.match(PAGE_LABEL);
  if (!label || !match) return null;
  const total =
    match[2] ??
    page.find((item) => item !== label && item.y > FOOTER_Y && /^\d+$/.test(item.text))?.text;
  return total ? { number: Number(match[1]), total: Number(total) } : null;
}

type Draft = { name: string[]; arrest: string | null; charges: string[]; genders: number };

/**
 * Reads the printed current inmate list. Each person opens with the race beside the name; the
 * gender follows on the next line. Charges sit in the middle column: a charge row carries its
 * bond, warrant number, or degree further right, and a wrapped charge line sits one line-height
 * under the line before it. Race, gender, age, arrest agency, bond, warrant numbers, and degrees
 * are read past and never kept; the arrest time only tells two bookings of one name apart.
 */
export function parseJeffersonRosterPages(pages: readonly JeffersonPdfPage[]): JeffersonRoster {
  if (pages.length === 0) throw new Error("PDF_EMPTY");
  const first = pages[0]!;
  if (HEADERS.some((header) => !first.some((item) => item.text === header))) {
    throw new Error("COLUMNS_CHANGED");
  }
  const printTimes = new Set<string>();
  const drafts: Draft[] = [];
  let demographicsDone = true;

  pages.forEach((page, pageIndex) => {
    const label = pageLabel(page);
    if (!label || label.number !== pageIndex + 1 || label.total !== pages.length) {
      throw new Error("PAGES_MISSING");
    }
    if (!page.some((item) => item.y > FOOTER_Y && item.text === FOOTER_TITLE)) {
      throw new Error("SOURCE_IDENTITY_MISMATCH");
    }
    const stamp = page.find((item) => item.y > FOOTER_Y && PRINT_TIME.test(item.text));
    if (!stamp) throw new Error("PRINT_TIME_MISSING");
    printTimes.add(stamp.text);

    const body = page.filter(
      (item) => item.y <= FOOTER_Y && !(pageIndex === 0 && HEADERS.includes(item.text))
    );
    const rows: JeffersonPdfTextItem[][] = [];
    for (const item of [...body].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const row = rows.at(-1);
      if (row && Math.abs(row[0]!.y - item.y) <= SAME_ROW) row.push(item);
      else rows.push([item]);
    }

    let previousChargeY: number | null = null;
    for (const row of rows) {
      const demographics = row.filter((item) => near(item, DEMOGRAPHICS_X));
      const opensPerson = demographics.length > 0 && demographicsDone;
      if (opensPerson) {
        drafts.push({ name: [], arrest: null, charges: [], genders: 0 });
        demographicsDone = false;
        previousChargeY = null;
      }
      const person = drafts.at(-1);
      if (!person) throw new Error("LAYOUT_CHANGED");
      for (const item of demographics) {
        if (GENDERS.has(item.text)) {
          person.genders += 1;
          demographicsDone = true;
        }
      }
      for (const item of row.filter((entry) => near(entry, NAME_X))) {
        if (!AGE.test(item.text)) person.name.push(item.text);
      }
      const charge = row.find((item) => near(item, CHARGE_X));
      if (!charge) continue;
      if (opensPerson && ARREST_DATE.test(charge.text)) {
        // The arrest time is sometimes printed as its own item beside the date.
        const time = row.find(
          (item) => /^\d{2}:\d{2}$/.test(item.text) && item.x < RIGHT_COLUMNS_X
        );
        person.arrest =
          time && !charge.text.includes(":") ? `${charge.text} ${time.text}` : charge.text;
        continue;
      }
      const startsCharge =
        row.some((item) => item.x >= RIGHT_COLUMNS_X) ||
        previousChargeY === null ||
        Math.abs(previousChargeY - charge.y - WRAP_GAP) > WRAP_SLACK;
      if (startsCharge) person.charges.push(charge.text);
      else person.charges[person.charges.length - 1] += ` ${charge.text}`;
      previousChargeY = charge.y;
    }
  });
  if (!demographicsDone) throw new Error("LIST_TRUNCATED");
  if (printTimes.size !== 1) throw new Error("PRINT_TIMES_INCONSISTENT");

  const records = drafts.map((draft) => {
    if (draft.genders !== 1) throw new Error("LAYOUT_CHANGED");
    const displayName = normalizeText(draft.name.join(" "));
    if (!NAME.test(displayName)) throw new Error("NAME_UNREADABLE");
    return {
      recordKey: `${displayName}|${draft.arrest ?? ""}`,
      displayName,
      charges: draft.charges.map(normalizeText)
    };
  });
  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_ROSTER_ENTRY");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  // The county jail is never empty; a print without people means the export broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return JeffersonRosterSchema.parse({
    records,
    printTimeText: [...printTimes][0],
    validEmptyMarker: false
  });
}

async function requestRoster(
  options: JeffersonRosterAdapterOptions,
  context: AdapterContext
): Promise<JeffersonRoster> {
  if (context.source.sourceUrl !== JEFFERSON_COUNTY_TX_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(JEFFERSON_COUNTY_TX_CURRENT_SOURCE_URL, {
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
  const roster = parseJeffersonRosterPages(
    await (options.extractPdfPages ?? extractPdfPages)(bytes)
  );
  const ageMs = Date.parse(context.requestedAt) - printTimeMs(roster.printTimeText);
  if (ageMs > MAX_PRINT_AGE_MS + TIMEZONE_ALLOWANCE_MS) throw new Error("SOURCE_LIST_STALE");
  return roster;
}

export function createJeffersonCountyTxSourceAdapter(
  options: JeffersonRosterAdapterOptions
): SourceAdapter<JeffersonRoster, JeffersonRoster, JeffersonRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: JEFFERSON_COUNTY_TX_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: JEFFERSON_COUNTY_TX_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<JeffersonRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<JeffersonRoster>> {
      const result = JeffersonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<JeffersonRoster>> {
      const result = JeffersonRosterSchema.safeParse(payload);
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
              evidence: "The official Jefferson County, Texas inmate list listed no one."
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
            sourceLabel: "Charge",
            statuteCode: null,
            disposition: null
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
            // The list prints no booking number.
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
