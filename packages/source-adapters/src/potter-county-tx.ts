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

export const POTTER_COUNTY_TX_ADAPTER_KEY = "potter-county-tx-current-roster" as const;
export const POTTER_COUNTY_TX_CURRENT_SOURCE_URL =
  "https://public.pottercountysheriff.org/pottersheriff/PrisonerAndTheirOffensesReport.pdf" as const;
export const POTTER_COUNTY_TX_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 2_000;
// The jail holds about 550-600 people; a far shorter report means a broken export.
const MIN_RECORDS = 150;
const MAX_RESPONSE_BYTES = 8_000_000;
// The report is regenerated several times a day; a print date this old means the export stopped.
const MAX_PRINT_AGE_DAYS = 2;

const TITLE = "REPORT OF PRISONERS WITH THEIR OFFENSES";
const PRINT_DATE = /^(\d{2})\/(\d{2})\/(\d{2})$/;
const PAGE_LABEL = /^Page (\d+) of (\d+)$/;
// "05/03/26(195)": the offense date and days held. Past 999 days the cell cuts the closing ")".
const OFFENSE_DATE = /^\d{2}\/\d{2}\/\d{2}\(\d+\)?$/;
const BOOKING_NUMBER = /^\d{1,10}$/;
// Every description ends with its offense level, e.g. "UNL CARRY WEAPON(MA)". A description that
// does not means the text was cut off.
const LEVEL_SUFFIX = /\(([A-Z][A-Z0-9*])\)$/;
const LEVELS: Readonly<Record<string, string>> = {
  F1: "First Degree Felony",
  F2: "Second Degree Felony",
  F3: "Third Degree Felony",
  FS: "State Jail Felony",
  FX: "Capital Felony",
  MA: "Class A Misdemeanor",
  MB: "Class B Misdemeanor",
  MC: "Class C Misdemeanor",
  // The degree is not given (it can depend on enhancements), only felony or misdemeanor.
  "F*": "Felony",
  "M*": "Misdemeanor"
};

const NAME_X = 18;
const DESCRIPTION_X = 48.2;
const OFFENSE_DATE_MIN_X = 360;
const OFFENSE_DATE_MAX_X = 395;
const BOOKING_LABEL_X = 459;
const SLACK = 3;
// Body text sits between the running header (y > 560) and the footer date (y < 20).
const BODY_TOP_Y = 560;
const BODY_BOTTOM_Y = 20;
// A wrapped description line sits 10.7 points below the line above it.
const WRAP_GAP = 10.7;
const WRAP_SLACK = 1.5;
// A wrapped name line sits 14.4 points below the name.
const NAME_WRAP_GAP = 14.4;
const SAME_ROW = 1;
const HEADER_ROW = 4;

const PotterRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z.string().regex(BOOKING_NUMBER),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});

const PotterRosterSchema = z.object({
  records: z.array(PotterRecordSchema).min(MIN_RECORDS).max(MAX_RECORDS),
  printDateText: z.string().regex(PRINT_DATE)
});

export type PotterRoster = z.infer<typeof PotterRosterSchema>;
export type PotterRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type PotterRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type PotterPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type PotterPdfPage = readonly PotterPdfTextItem[];
export type PotterPdfExtractor = (bytes: Uint8Array) => Promise<readonly PotterPdfPage[]>;

export interface PotterRosterAdapterOptions {
  readonly fetch: PotterRosterFetch;
  readonly facilityId: string;
  readonly createId: PotterRosterIdFactory;
  readonly extractPdfPages?: PotterPdfExtractor;
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
    publicMessage: "The approved Potter County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `POTTER_COUNTY_TX_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly PotterPdfPage[]> {
  const loadingTask = getDocument({ data: bytes, stopAtErrors: true, useSystemFonts: true });
  const document = await loadingTask.promise;
  const pages: PotterPdfPage[] = [];
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

function near(value: number, target: number, slack = SLACK): boolean {
  return Math.abs(value - target) <= slack;
}

/** "EVADING ARREST DET W/PREV CONVICTION(FS)" -> "EVADING ARREST DET W/PREV CONVICTION (State Jail Felony)". */
export function formatPotterCharge(description: string): string {
  const match = description.match(LEVEL_SUFFIX);
  if (!match) throw new Error("CHARGE_TEXT_CUT");
  const base = description.slice(0, match.index).trim();
  if (!base) throw new Error("EMPTY_CHARGE");
  const level = LEVELS[match[1] ?? ""];
  // "XX" marks city charges and holds that carry no offense level.
  // "NA" is used when no level applies (probation violations, out-of-state offenses, fines owed).
  if (match[1] === "XX" || match[1] === "NA") return base;
  return level ? `${base} (${level})` : description;
}

function pageOrder(pages: readonly PotterPdfPage[]): void {
  if (pages.length === 0) throw new Error("EMPTY_REPORT");
  if (!pages[0]?.some((item) => item.text === TITLE)) throw new Error("SOURCE_IDENTITY_MISMATCH");
  pages.forEach((page, index) => {
    if (index === 0) return;
    const label = page.map((item) => item.text.match(PAGE_LABEL)).find(Boolean);
    if (!label || Number(label[1]) !== index + 1 || Number(label[2]) !== pages.length) {
      throw new Error("PAGE_SEQUENCE_CHANGED");
    }
    if (!page.some((item) => item.text === TITLE)) throw new Error("PAGE_HEADER_CHANGED");
  });
}

/**
 * Reads the Sheriff's Spillman "Report of Prisoners with Their Offenses": a header row per person
 * (name, booking number) followed by one row per charge, whose description wraps onto following
 * lines. Only names, booking numbers, and charge descriptions are kept; demographics, IDs, bonds,
 * courts, judges, and dispositions are not read.
 */
export function parsePotterRosterPages(pages: readonly PotterPdfPage[]): PotterRoster {
  pageOrder(pages);
  const printDateText = pages[0]
    ?.filter((item) => item.y < BODY_BOTTOM_Y)
    .map((item) => item.text)
    .find((text) => PRINT_DATE.test(text));
  if (!printDateText) throw new Error("PRINT_DATE_MISSING");

  type Draft = { displayName: string; bookingNumber: string; descriptions: string[] };
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let lastDescription: { y: number } | null = null;
  let lastNameLine: { y: number } | null = null;

  for (const page of pages) {
    const body = page.filter((item) => item.y > BODY_BOTTOM_Y && item.y < BODY_TOP_Y);
    const dates = body.filter(
      (item) =>
        item.x >= OFFENSE_DATE_MIN_X && item.x <= OFFENSE_DATE_MAX_X && OFFENSE_DATE.test(item.text)
    );
    const sorted = [...body].sort((left, right) => right.y - left.y || left.x - right.x);
    lastDescription = null;
    lastNameLine = null;
    for (const item of sorted) {
      if (near(item.x, NAME_X)) {
        const label = body.find(
          (other) =>
            other.text === "Booking:" &&
            near(other.x, BOOKING_LABEL_X) &&
            Math.abs(other.y - item.y) <= HEADER_ROW
        );
        // A long name wraps onto a second line under the header, before any charge.
        if (
          !label &&
          current &&
          current.descriptions.length === 0 &&
          lastNameLine &&
          Math.abs(lastNameLine.y - item.y - NAME_WRAP_GAP) <= WRAP_SLACK
        ) {
          current.displayName = `${current.displayName} ${item.text}`;
          lastNameLine = { y: item.y };
          continue;
        }
        const bookingNumber = label
          ? body
              .filter((other) => other.x > label.x && Math.abs(other.y - label.y) <= SAME_ROW)
              .sort((left, right) => left.x - right.x)[0]?.text
          : undefined;
        if (!bookingNumber || !BOOKING_NUMBER.test(bookingNumber)) {
          throw new Error("PERSON_HEADER_CHANGED");
        }
        current = { displayName: item.text, bookingNumber, descriptions: [] };
        drafts.push(current);
        lastDescription = null;
        lastNameLine = { y: item.y };
        continue;
      }
      if (!near(item.x, DESCRIPTION_X)) continue;
      if (!current) throw new Error("CHARGE_BEFORE_PERSON");
      const startsCharge = dates.some((date) => Math.abs(date.y - item.y) <= SAME_ROW);
      if (startsCharge) {
        current.descriptions.push(item.text);
        lastDescription = { y: item.y };
        continue;
      }
      // A line without an offense date continues the description above it.
      if (!lastDescription || Math.abs(lastDescription.y - item.y - WRAP_GAP) > WRAP_SLACK) {
        throw new Error("CHARGE_WRAP_CHANGED");
      }
      const index = current.descriptions.length - 1;
      current.descriptions[index] = `${current.descriptions[index] ?? ""} ${item.text}`;
      lastDescription = { y: item.y };
    }
  }

  const bookingLabels = pages.flat().filter((item) => item.text === "Booking:").length;
  if (drafts.length !== bookingLabels) throw new Error("PERSON_COUNT_MISMATCH");
  const seen = new Set<string>();
  const records = drafts.map((draft) => {
    if (seen.has(draft.bookingNumber)) throw new Error("DUPLICATE_BOOKING_NUMBER");
    seen.add(draft.bookingNumber);
    return PotterRecordSchema.parse({
      displayName: normalizeText(draft.displayName),
      bookingNumber: draft.bookingNumber,
      charges: draft.descriptions.map((description) =>
        formatPotterCharge(normalizeText(description))
      )
    });
  });
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  return PotterRosterSchema.parse({ records, printDateText });
}

function printDateAgeDays(printDateText: string, requestedAt: string): number {
  const match = printDateText.match(PRINT_DATE);
  if (!match) return Number.POSITIVE_INFINITY;
  const printed = Date.UTC(2000 + Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return (Date.parse(requestedAt) - printed) / (24 * 60 * 60 * 1_000);
}

async function requestRoster(
  options: PotterRosterAdapterOptions,
  context: AdapterContext
): Promise<PotterRoster> {
  if (context.source.sourceUrl !== POTTER_COUNTY_TX_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(POTTER_COUNTY_TX_CURRENT_SOURCE_URL, {
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
  const roster = parsePotterRosterPages(await (options.extractPdfPages ?? extractPdfPages)(bytes));
  if (printDateAgeDays(roster.printDateText, context.requestedAt) > MAX_PRINT_AGE_DAYS) {
    throw new Error("SOURCE_LIST_STALE");
  }
  return roster;
}

export function createPotterCountyTxSourceAdapter(
  options: PotterRosterAdapterOptions
): SourceAdapter<PotterRoster, PotterRoster, PotterRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: POTTER_COUNTY_TX_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: POTTER_COUNTY_TX_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<PotterRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<PotterRoster>> {
      const result = PotterRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<PotterRoster>> {
      const result = PotterRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      // The schema refuses a near-empty report, so a valid payload is never empty.
      return Promise.resolve({ kind: "not_empty", recordCount: payload.records.length });
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
            sourceLabel: "Offense",
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
              sourceLabel: "Booking",
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
