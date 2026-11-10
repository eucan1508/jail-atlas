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

export const ROSEAU_COUNTY_ADAPTER_KEY = "roseau-county-mn-current-roster" as const;
/**
 * The Sheriff's page links inmates.co.roseau.mn.us, which shows CurrentInmateList.pdf from the
 * county's storage bucket of the same name. That host answers only over plain HTTP, so the same
 * bucket is read over HTTPS at its regional address.
 */
export const ROSEAU_COUNTY_CURRENT_SOURCE_URL =
  "https://s3.us-east-2.amazonaws.com/inmates.co.roseau.mn.us/CurrentInmateList.pdf" as const;
export const ROSEAU_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 8_000_000;
// The list is reprinted through the day; an older print means the county stopped updating it.
const MAX_PRINT_AGE_MS = 48 * 60 * 60 * 1_000;
// The print date has no time, and the county is on Central time; allow a full day either side.
const PRINT_DATE_ALLOWANCE_MS = 24 * 60 * 60 * 1_000;

const TITLE = "Current Inmate Offense List, by Name";
const AGENCY = "Roseau County Sheriff's Office";
const REPORT_ID = "rpjlciol.x1so";
const END_MARKER = "Report Includes:";
const PAGE_NUMBER = /^Page (\d+) of (\d+)$/;
const PRINT_DATE = /^(\d{2})\/(\d{2})\/(\d{2})$/;
const JAIL_ID = /^\d{2}BK\d{5}$/;
const NAME = /^\p{L}[\p{L}' .-]*, \p{L}[\p{L}' .-]*$/u;
// "F - Assault-2nd Degree-Dangerous" starts a charge; its wrapped lines carry no level.
const CHARGE_START = /^(F|GM|M|PM) - (\S.*)$/;
const LEVELS: Readonly<Record<string, string>> = {
  F: "Felony",
  GM: "Gross Misdemeanor",
  M: "Misdemeanor",
  PM: "Petty Misdemeanor"
};
const LEVEL_SUFFIX = /^(.*\S);\s*(Felony|Gross Misdemeanor|Misdemeanor|Petty Misdemeanor)$/;

// Column positions in the printed list. Allow small offsets.
const COLUMN_SLACK = 6;
const SAME_ROW = 2;
const ID_X = 190.8;
const NAME_X = 259.2;
const SID_X = 430.2;
const ATTORNEY_X = 532.8;
const CHARGE_X = 184.3;
const COURT_X = 379.7;
const DISPOSITION_X = 477.4;
const BAIL_X = 640.3;
const ID_HEADER = ["Jail ID", "Name", "SID#", "Attorney"];
const BOOKING_HEADER = ["Book Date", "Release Date", "Age", "Arresting Agency"];
const CHARGE_HEADER = ["Charges", "Court", "Current Disposition", "Total Bail"];

const RoseauRecordSchema = z.object({
  jailId: z.string().regex(JAIL_ID),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});
const RoseauRosterSchema = z.object({
  records: z.array(RoseauRecordSchema).max(MAX_RECORDS),
  printDateText: z.string().regex(PRINT_DATE),
  validEmptyMarker: z.boolean()
});

export type RoseauRoster = z.infer<typeof RoseauRosterSchema>;
export type RoseauRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type RoseauRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type RoseauPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type RoseauPdfPage = readonly RoseauPdfTextItem[];
export type RoseauPdfExtractor = (bytes: Uint8Array) => Promise<readonly RoseauPdfPage[]>;

export interface RoseauRosterAdapterOptions {
  readonly fetch: RoseauRosterFetch;
  readonly facilityId: string;
  readonly createId: RoseauRosterIdFactory;
  readonly extractPdfPages?: RoseauPdfExtractor;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
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
      "The approved Roseau County, Minnesota current inmate list could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `ROSEAU_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly RoseauPdfPage[]> {
  const loadingTask = getDocument({ data: bytes, stopAtErrors: true, useSystemFonts: true });
  const document = await loadingTask.promise;
  const pages: RoseauPdfPage[] = [];
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

function near(item: RoseauPdfTextItem, x: number): boolean {
  return Math.abs(item.x - x) <= COLUMN_SLACK;
}

function printDateMs(text: string): number {
  const match = text.match(PRINT_DATE);
  if (!match) throw new Error("PRINT_DATE_MISSING");
  return Date.UTC(2000 + Number(match[3]), Number(match[1]) - 1, Number(match[2]));
}

/** Groups a page's items into rows from top to bottom, each row ordered left to right. */
function rowsOf(items: readonly RoseauPdfTextItem[]): RoseauPdfTextItem[][] {
  const rows: RoseauPdfTextItem[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0]!.y - item.y) <= SAME_ROW) row.push(item);
    else rows.push([item]);
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x));
}

function isHeader(row: readonly RoseauPdfTextItem[], labels: readonly string[]): boolean {
  return JSON.stringify(row.map((item) => item.text)) === JSON.stringify(labels);
}

/** "Assault-2nd Degree-Dangerous Weapon; Felony" → "Assault-2nd Degree-Dangerous Weapon (Felony)". */
export function formatRoseauCharge(level: string, text: string): string {
  const suffixed = text.match(LEVEL_SUFFIX);
  if (suffixed) return `${suffixed[1]!} (${suffixed[2]!})`;
  const named = LEVELS[level];
  return named ? `${text} (${named})` : text;
}

type Draft = { jailId: string; displayName: string; charges: { level: string; text: string }[] };

/**
 * Reads the printed "Current Inmate Offense List, by Name". Each person starts with a Jail ID
 * header row, then the booking row, then a charge table whose descriptions wrap over several
 * lines; a charge starts on the row where its bail column is printed. Ages, release dates,
 * arresting agencies, courts, dispositions, bail, and SID numbers are read past and never kept.
 */
export function parseRoseauPages(pages: readonly RoseauPdfPage[]): RoseauRoster {
  if (pages.length === 0) throw new Error("PDF_EMPTY");
  const first = pages[0]!;
  if (!first.some((item) => item.text === AGENCY) || !first.some((item) => item.text === TITLE)) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  if (!pages.at(-1)!.some((item) => item.text === END_MARKER)) throw new Error("LIST_TRUNCATED");

  const printDates = new Set<string>();
  const drafts: Draft[] = [];
  let expect: "id_header" | "id_values" | "booking_header" | "booking_values" | "charge_header" =
    "id_header";
  let inCharges = false;

  pages.forEach((page, pageIndex) => {
    const label = page.find((item) => PAGE_NUMBER.test(item.text));
    if (pageIndex > 0 || label) {
      const match = label?.text.match(PAGE_NUMBER);
      if (!match || Number(match[1]) !== pageIndex + 1 || Number(match[2]) !== pages.length) {
        throw new Error("PAGES_MISSING");
      }
    }
    const reportId = page.find((item) => item.text === REPORT_ID);
    if (!reportId) throw new Error("LAYOUT_CHANGED");
    const stamp = page.find(
      (item) => Math.abs(item.y - reportId.y) <= SAME_ROW && PRINT_DATE.test(item.text)
    );
    if (!stamp) throw new Error("PRINT_DATE_MISSING");
    printDates.add(stamp.text);
    // The report's end note sits above the page footer, below the last person.
    const endNote = page.find((item) => item.text === END_MARKER);

    const body = page.filter(
      (item) =>
        item !== label &&
        item !== reportId &&
        item !== stamp &&
        item.text !== TITLE &&
        !(pageIndex === 0 && item.text === AGENCY && item.x < ID_X - COLUMN_SLACK) &&
        !(endNote && item.y <= endNote.y + SAME_ROW && item.x < CHARGE_X - COLUMN_SLACK)
    );

    for (const row of rowsOf(body)) {
      if (isHeader(row, ID_HEADER)) {
        if (expect !== "id_header" && !inCharges) throw new Error("LAYOUT_CHANGED");
        expect = "id_values";
        inCharges = false;
        continue;
      }
      if (expect === "id_values") {
        const id = row.find((item) => near(item, ID_X));
        const name = row.find((item) => near(item, NAME_X));
        if (row.some((item) => ![ID_X, NAME_X, SID_X, ATTORNEY_X].some((x) => near(item, x)))) {
          throw new Error("LAYOUT_CHANGED");
        }
        if (!id || !JAIL_ID.test(id.text)) throw new Error("JAIL_ID_UNREADABLE");
        if (!name || !NAME.test(name.text)) throw new Error("NAME_UNREADABLE");
        drafts.push({ jailId: id.text, displayName: name.text, charges: [] });
        expect = "booking_header";
        continue;
      }
      if (expect === "booking_header") {
        if (!isHeader(row, BOOKING_HEADER)) throw new Error("LAYOUT_CHANGED");
        expect = "booking_values";
        continue;
      }
      if (expect === "booking_values") {
        const date = row.find((item) => near(item, ID_X));
        if (!date || !PRINT_DATE.test(date.text)) throw new Error("BOOK_DATE_UNREADABLE");
        expect = "charge_header";
        continue;
      }
      if (expect === "charge_header") {
        if (!isHeader(row, CHARGE_HEADER)) throw new Error("LAYOUT_CHANGED");
        expect = "id_header";
        inCharges = true;
        continue;
      }
      // A charge table may continue onto the next page, sometimes under a repeated header.
      if (!inCharges) throw new Error("LAYOUT_CHANGED");
      if (isHeader(row, CHARGE_HEADER)) continue;
      if (
        row.some((item) => ![CHARGE_X, COURT_X, DISPOSITION_X, BAIL_X].some((x) => near(item, x)))
      ) {
        throw new Error("LAYOUT_CHANGED");
      }
      const line = row.find((item) => near(item, CHARGE_X));
      const startsCharge = row.some((item) => near(item, BAIL_X));
      const person = drafts.at(-1)!;
      if (startsCharge) {
        const match = line?.text.match(CHARGE_START);
        if (!match) throw new Error("CHARGE_UNREADABLE");
        person.charges.push({ level: match[1]!, text: match[2]! });
      } else if (line) {
        const previous = person.charges.at(-1);
        if (!previous || CHARGE_START.test(line.text)) throw new Error("CHARGE_UNREADABLE");
        previous.text = `${previous.text} ${line.text}`;
      }
    }
  });
  if (expect !== "id_header") throw new Error("LIST_TRUNCATED");
  if (printDates.size !== 1) throw new Error("PRINT_DATES_INCONSISTENT");

  const records = drafts.map((draft) => ({
    jailId: draft.jailId,
    displayName: draft.displayName,
    charges: draft.charges.map((charge) => formatRoseauCharge(charge.level, charge.text))
  }));
  if (new Set(records.map((record) => record.jailId)).size !== records.length) {
    throw new Error("DUPLICATE_JAIL_ID");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  // The county jail is never empty; a list without people means the export broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return RoseauRosterSchema.parse({
    records,
    printDateText: [...printDates][0],
    validEmptyMarker: false
  });
}

async function requestRoster(
  options: RoseauRosterAdapterOptions,
  context: AdapterContext
): Promise<RoseauRoster> {
  if (context.source.sourceUrl !== ROSEAU_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(ROSEAU_COUNTY_CURRENT_SOURCE_URL, {
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
  const roster = parseRoseauPages(await (options.extractPdfPages ?? extractPdfPages)(bytes));
  const ageMs = Date.parse(context.requestedAt) - printDateMs(roster.printDateText);
  if (ageMs > MAX_PRINT_AGE_MS + PRINT_DATE_ALLOWANCE_MS) throw new Error("SOURCE_LIST_STALE");
  return roster;
}

export function createRoseauCountySourceAdapter(
  options: RoseauRosterAdapterOptions
): SourceAdapter<RoseauRoster, RoseauRoster, RoseauRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: ROSEAU_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: ROSEAU_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<RoseauRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<RoseauRoster>> {
      const result = RoseauRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<RoseauRoster>> {
      const result = RoseauRosterSchema.safeParse(payload);
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
              evidence: "The official Roseau County current inmate list listed no one."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.jailId);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${record.jailId}|${sequence}|${description}`),
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
              id: options.createId("person", `${record.jailId}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            bookingIdentifier: {
              value: record.jailId,
              sourceLabel: "Jail ID",
              sourceIdentifiesAsBookingIdentifier: true
            },
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            // Every bail on the list prints as 0.00, which does not say whether bail was set.
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
