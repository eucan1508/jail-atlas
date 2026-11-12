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

export const MEEKER_COUNTY_ADAPTER_KEY = "meeker-county-mn-current-roster" as const;
/** The Sheriff's Jail Roster PDF page serves this Document Center file. */
export const MEEKER_COUNTY_CURRENT_SOURCE_URL =
  "https://www.meekercountymn.gov/DocumentCenter/View/721/Meeker-County-Jail-Roster" as const;
export const MEEKER_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 3_000_000;
// The roster is printed daily; allow a long weekend before calling it stale.
const MAX_PRINT_AGE_MS = 72 * 60 * 60 * 1_000;
// The print date has no time, and the county is on Central time; allow a full day either side.
const PRINT_DATE_ALLOWANCE_MS = 24 * 60 * 60 * 1_000;

const TITLE = "Internet Daily Jail Roster";
const PRINTED_ON = /^Printed on ([A-Z][a-z]+) (\d{1,2}), (\d{4})$/;
const PAGE_NUMBER = /^Page (\d+) of (\d+)$/;
const TOTAL_RECORDS = /^Total Records: (\d+)$/;
const AGE = /^\d{1,3}$/;
const ARREST = /^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/;
const NAME = /^\p{L}[\p{L}' .-]*, \p{L}[\p{L}' .-]*$/u;
// "609.222.1 - Assault-2nd Degree-Dangerous Weapon - Arrest of Adult"; wrapped lines carry no
// statute in front.
const CHARGE_START = /^(\d{1,3}[A-Z]?(?:\.[0-9A-Za-z()]+)+) - (\S.*)$/;
const ARREST_TYPE = / - Arrest of (?:Adult|Juvenile)$/;
const HEADERS = [
  "Mugshot",
  "Name & Address",
  "Age",
  "Sex",
  "Race",
  "Arrest Date/Time",
  "Held For",
  "Charges"
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

// Column positions in the printed roster. Allow small offsets.
const SLACK = 6;
const SAME_ROW = 2;
const NAME_X = 127.2;
const STATE_X = 205.2;
const AGE_X = 231.2;
const SEX_X = 265.2;
const RACE_X = 301.2;
const ARREST_X = 355.2;
const HELD_FOR_X = 445.2;
const CHARGE_X = 565.2;
// The name sits at the top of each person's block; the address starts 24 points below it.
const ADDRESS_OFFSET = 24;

const MeekerRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  charges: z
    .array(
      z.object({
        statuteCode: z.string().trim().min(1).max(100),
        description: z.string().trim().min(1).max(1_000)
      })
    )
    .max(100)
});
const MeekerRosterSchema = z.object({
  records: z.array(MeekerRecordSchema).max(MAX_RECORDS),
  printedOnText: z.string().regex(PRINTED_ON),
  validEmptyMarker: z.boolean()
});

export type MeekerRoster = z.infer<typeof MeekerRosterSchema>;
export type MeekerRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type MeekerRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type MeekerPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type MeekerPdfPage = readonly MeekerPdfTextItem[];
export type MeekerPdfExtractor = (bytes: Uint8Array) => Promise<readonly MeekerPdfPage[]>;

export interface MeekerRosterAdapterOptions {
  readonly fetch: MeekerRosterFetch;
  readonly facilityId: string;
  readonly createId: MeekerRosterIdFactory;
  readonly extractPdfPages?: MeekerPdfExtractor;
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
      "The approved Meeker County, Minnesota jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `MEEKER_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly MeekerPdfPage[]> {
  const loadingTask = getDocument({ data: bytes, stopAtErrors: true, useSystemFonts: true });
  const document = await loadingTask.promise;
  const pages: MeekerPdfPage[] = [];
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

function near(item: MeekerPdfTextItem, x: number): boolean {
  return Math.abs(item.x - x) <= SLACK;
}

function printedOnMs(text: string): number {
  const match = text.match(PRINTED_ON);
  const month = match ? MONTHS.indexOf(match[1]!) : -1;
  if (!match || month < 0) throw new Error("PRINT_DATE_MISSING");
  return Date.UTC(Number(match[3]), month, Number(match[2]));
}

type Block = { top: number; items: MeekerPdfTextItem[] };

/**
 * Reads the printed "Internet Daily Jail Roster": one block per person, opened by the row with
 * the age, with the name at the top of the left column and the charges in the right column.
 * Home addresses, ages, sex, race, arrest times, and holding agencies are read past and never
 * kept; the arrest time only tells two bookings of the same name apart.
 */
export function parseMeekerRosterPages(pages: readonly MeekerPdfPage[]): MeekerRoster {
  const first = pages[0] ?? [];
  if (!first.some((item) => item.text === TITLE)) throw new Error("SOURCE_IDENTITY_MISMATCH");
  const printedOnText = first.find((item) => PRINTED_ON.test(item.text))?.text;
  if (!printedOnText) throw new Error("PRINT_DATE_MISSING");

  let total: number | null = null;
  const blocks: Block[] = [];
  pages.forEach((page, pageIndex) => {
    const label = page.find((item) => PAGE_NUMBER.test(item.text))?.text.match(PAGE_NUMBER);
    if (!label || Number(label[1]) !== pageIndex + 1 || Number(label[2]) !== pages.length) {
      throw new Error("PAGES_MISSING");
    }
    const headers = HEADERS.map((text) => page.find((item) => item.text === text));
    if (headers.some((header) => !header)) throw new Error("COLUMNS_CHANGED");
    const headerY = Math.min(...headers.map((header) => header!.y));
    const totalItem = page.find((item) => TOTAL_RECORDS.test(item.text));
    if (totalItem) {
      if (total !== null) throw new Error("ROSTER_TOTAL_REPEATED");
      total = Number(totalItem.text.match(TOTAL_RECORDS)![1]);
    }
    const body = page.filter(
      (item) =>
        item.y < headerY - SAME_ROW &&
        item !== totalItem &&
        !PAGE_NUMBER.test(item.text) &&
        !(totalItem && item.y <= totalItem.y + SAME_ROW)
    );
    const pageBlocks = body
      .filter((item) => near(item, AGE_X) && AGE.test(item.text))
      .sort((a, b) => b.y - a.y)
      .map((item): Block => ({ top: item.y, items: [] }));
    for (const item of body) {
      const block = pageBlocks.filter((candidate) => candidate.top + SAME_ROW >= item.y).at(-1);
      if (block) {
        block.items.push(item);
        continue;
      }
      // A charge list that runs past the page bottom continues above the first block.
      const previous = blocks.at(-1);
      if (!previous || !near(item, CHARGE_X)) throw new Error("RECORD_SPLIT_ACROSS_PAGES");
      previous.items.push({ ...item, y: item.y - 10_000 * (pageIndex + 1) });
    }
    blocks.push(...pageBlocks);
  });
  if (total === null) throw new Error("ROSTER_TOTAL_MISSING");
  if (blocks.length !== total) throw new Error("ROSTER_TOTAL_MISMATCH");

  const records = blocks.map((block) => {
    const known = [NAME_X, STATE_X, AGE_X, SEX_X, RACE_X, ARREST_X, HELD_FOR_X, CHARGE_X];
    if (block.items.some((item) => !known.some((x) => near(item, x)))) {
      throw new Error("LAYOUT_CHANGED");
    }
    const column = (x: number) =>
      block.items.filter((item) => near(item, x)).sort((a, b) => b.y - a.y);
    const displayName = column(NAME_X)
      .filter((item) => item.y > block.top - ADDRESS_OFFSET + SAME_ROW)
      .map((item) => item.text)
      .join(" ");
    if (!NAME.test(displayName)) throw new Error("NAME_UNREADABLE");
    const arrest = column(ARREST_X)[0]?.text ?? "";
    if (!ARREST.test(arrest)) throw new Error("ARREST_DATE_UNREADABLE");

    const charges: { statuteCode: string; description: string }[] = [];
    for (const line of column(CHARGE_X)) {
      const start = line.text.match(CHARGE_START);
      if (start) {
        charges.push({ statuteCode: start[1]!, description: start[2]! });
        continue;
      }
      const previous = charges.at(-1);
      if (!previous) throw new Error("CHARGE_UNREADABLE");
      previous.description = `${previous.description} ${line.text}`;
    }
    return {
      recordKey: `${displayName}|${arrest}`,
      displayName,
      charges: charges.map((charge) => ({
        statuteCode: charge.statuteCode,
        description: charge.description.replace(ARREST_TYPE, "").trim()
      }))
    };
  });
  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_ROSTER_ENTRY");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  // The county jail is never empty; a print without people means the report broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return MeekerRosterSchema.parse({ records, printedOnText, validEmptyMarker: false });
}

async function requestRoster(
  options: MeekerRosterAdapterOptions,
  context: AdapterContext
): Promise<MeekerRoster> {
  if (context.source.sourceUrl !== MEEKER_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(MEEKER_COUNTY_CURRENT_SOURCE_URL, {
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
  const roster = parseMeekerRosterPages(await (options.extractPdfPages ?? extractPdfPages)(bytes));
  const ageMs = Date.parse(context.requestedAt) - printedOnMs(roster.printedOnText);
  if (ageMs > MAX_PRINT_AGE_MS + PRINT_DATE_ALLOWANCE_MS) throw new Error("SOURCE_REPORT_STALE");
  return roster;
}

export function createMeekerCountySourceAdapter(
  options: MeekerRosterAdapterOptions
): SourceAdapter<MeekerRoster, MeekerRoster, MeekerRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: MEEKER_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: MEEKER_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<MeekerRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<MeekerRoster>> {
      const result = MeekerRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<MeekerRoster>> {
      const result = MeekerRosterSchema.safeParse(payload);
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
              evidence: "The official Meeker County jail roster listed no one."
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
            id: options.createId(
              "charge",
              `${record.recordKey}|${sequence}|${charge.statuteCode}|${charge.description}`
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
              id: options.createId("person", record.recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The roster prints no booking number.
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
