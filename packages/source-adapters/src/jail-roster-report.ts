import {
  NormalizedCustodySnapshotSchema,
  type BondEntry,
  type Booking,
  type Charge
} from "@jail-atlas/domain";
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

/**
 * Minnesota sheriff's offices that print the same "Jail Roster" report (Inmate, Charges, Held For,
 * Booking Date, Projected Release, Bail Amount) as a PDF on the county website.
 */
export interface JailRosterReportConfig {
  readonly adapterKey: string;
  readonly countyName: string;
  readonly diagnosticPrefix: string;
  readonly sourceUrl: string;
  // The report's first-page heading.
  readonly title: string;
  readonly parserVersion: string;
}

export const COTTONWOOD_COUNTY_ROSTER_REPORT = {
  adapterKey: "cottonwood-county-mn-current-roster",
  countyName: "Cottonwood County",
  diagnosticPrefix: "COTTONWOOD_COUNTY",
  // The Sheriff's Jail Roster page links this file on the county website; the county's site host
  // (Revize) serves it from this address.
  sourceUrl:
    "https://cms5.revize.com/revize/cottonwoodmn/Photo%20Gallery/Sheriff/Jail%20Roster.pdf",
  title: "Jail Roster",
  parserVersion: "1.0.0"
} as const satisfies JailRosterReportConfig;

export const REDWOOD_COUNTY_ROSTER_REPORT = {
  adapterKey: "redwood-county-mn-current-roster",
  countyName: "Redwood County",
  diagnosticPrefix: "REDWOOD_COUNTY",
  // The Sheriff's In Custody page links this download on the county website.
  sourceUrl: "https://redwoodcounty-mn.gov/download/17042/",
  title: "Redwood County Jail Roster",
  parserVersion: "1.0.0"
} as const satisfies JailRosterReportConfig;

const JAIL_ROSTER_REPORTS: readonly JailRosterReportConfig[] = [
  COTTONWOOD_COUNTY_ROSTER_REPORT,
  REDWOOD_COUNTY_ROSTER_REPORT
];

export function jailRosterReport(adapterKey: string): JailRosterReportConfig | undefined {
  return JAIL_ROSTER_REPORTS.find((config) => config.adapterKey === adapterKey);
}

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 3_000_000;
// The roster is regenerated at 6 a.m. and 6 p.m.; an older print means the county stopped
// updating it.
const MAX_PRINT_AGE_MS = 48 * 60 * 60 * 1_000;
// The print date has no time, and the county is on Central time; allow a full day either side.
const PRINT_DATE_ALLOWANCE_MS = 24 * 60 * 60 * 1_000;
// Columns: name at x≈49, charges at x≈127, held-for agency at x≈421, booking date at x≈517,
// projected release at x≈583, bail at x≈661. Allow small offsets.
const COLUMN_SLACK = 6;
const NAME_X = 49.2;
const CHARGE_X = 127.2;
const HELD_FOR_X = 421.2;
const BOOKING_DATE_X = 517.2;
const RELEASE_X = 583.2;
const BAIL_X = 661.2;
// Some counties print a hold reason ("Bench Warrant") 6 points below the block's first row, with
// the first charge 24 points down; others start the charges on the first row.
const HOLD_REASON_OFFSET = 6;
const SAME_ROW = 2;

const PRINTED_ON = /^Printed on ([A-Z][a-z]+) (\d{1,2}), (\d{4})$/;
const TOTAL_RECORDS = /^Total Records: (\d+)$/;
const PAGE_NUMBER = /^Page \d+ of \d+$/;
const SHORT_DATE = /^\d{2}\/\d{2}\/\d{2}$/;
const HEADERS = [
  "Inmate",
  "Charges",
  "Held For",
  "Booking Date",
  "Projected Release",
  "Bail Amount"
];
// "609.222.1 - Assault-2nd Degree-Dangerous Weapon"; a wrapped line has no statute in front.
const CHARGE_LINE = /^(\d{1,4}[A-Z]?(?:\.[0-9A-Za-z()]+)+) - (\S.*)$/;
// "Bail/Bond - $20000.00 - Court Order", "ROR - $0.00 - Court Order", "Bail/Bond - $1000.00".
// The type is a single word, so a wrapped note ("Court Order") never runs into the next type.
// Labels are one word, except "Cash Only". Other multi-word labels stay unreadable on purpose:
// a note such as "Court Order" can sit right before the next label, so only known ones split.
const BAIL_ENTRY =
  /(Cash Only|[A-Za-z][A-Za-z/]*) - \$(\d+)\.(\d{2})(?: - ([A-Za-z][A-Za-z ]*?))?(?= (?:Cash Only|[A-Za-z][A-Za-z/]*) - \$|$)/g;
const NAME = /^\p{L}[\p{L}' ().-]*, \p{L}[\p{L}' ().-]*$/u;
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

const JailRosterReportChargeSchema = z.object({
  statuteCode: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1_000)
});
const JailRosterReportBailSchema = z.object({
  label: z.string().trim().min(1).max(100),
  amountMinor: z.number().int().nonnegative().max(100_000_000_000),
  note: z.string().trim().min(1).max(200).nullable()
});
const JailRosterReportRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(JailRosterReportChargeSchema).max(100),
  bail: z.array(JailRosterReportBailSchema).max(100)
});
const JailRosterReportSchema = z.object({
  records: z.array(JailRosterReportRecordSchema).max(MAX_RECORDS),
  printedOnText: z.string().regex(PRINTED_ON),
  validEmptyMarker: z.boolean()
});

export type JailRosterReport = z.infer<typeof JailRosterReportSchema>;
export type JailRosterReportFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type JailRosterReportIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;
export type JailRosterReportPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type JailRosterReportPdfPage = readonly JailRosterReportPdfTextItem[];
export type JailRosterReportPdfExtractor = (
  bytes: Uint8Array
) => Promise<readonly JailRosterReportPdfPage[]>;

export interface JailRosterReportAdapterOptions {
  readonly fetch: JailRosterReportFetch;
  readonly facilityId: string;
  readonly createId: JailRosterReportIdFactory;
  readonly extractPdfPages?: JailRosterReportPdfExtractor;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(
  config: JailRosterReportConfig,
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage: `The approved ${config.countyName}, Minnesota jail roster could not be processed safely.`,
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `${config.diagnosticPrefix}_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly JailRosterReportPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: JailRosterReportPdfPage[] = [];
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

function printedOnMs(text: string): number {
  const match = text.match(PRINTED_ON);
  const month = match ? MONTHS.indexOf(match[1]!) : -1;
  if (!match || month < 0) throw new Error("PRINT_DATE_MISSING");
  return Date.UTC(Number(match[3]), month, Number(match[2]));
}

function inColumn(item: JailRosterReportPdfTextItem, x: number): boolean {
  return Math.abs(item.x - x) <= COLUMN_SLACK;
}

/** Reads the bail column, whose entries wrap freely across lines, back into separate entries. */
export function parseJailRosterBail(text: string): JailRosterReport["records"][number]["bail"] {
  if (!text) return [];
  const entries = [...text.matchAll(BAIL_ENTRY)];
  // Every character must belong to an entry; leftovers mean a format this reader doesn't know.
  if (entries.length === 0 || entries.map((entry) => entry[0]).join(" ") !== text) {
    throw new Error("BAIL_UNREADABLE");
  }
  return entries.map((entry) => {
    const amountMinor = Number(entry[2]) * 100 + Number(entry[3]);
    if (!Number.isSafeInteger(amountMinor)) throw new Error("BAIL_UNREADABLE");
    return { label: entry[1]!, amountMinor, note: entry[4] ?? null };
  });
}

type Block = { top: number; bookingDate: string; items: JailRosterReportPdfTextItem[] };

/**
 * Reads the printed roster: one block per person that starts on the row with the agency the
 * person is held for and the booking date, with the hold reason and charges in the middle column
 * and the name at the left margin. Agencies, hold reasons, booking dates, and projected release
 * dates are read past and never kept.
 */
export function parseJailRosterReportPages(
  config: JailRosterReportConfig,
  pages: readonly JailRosterReportPdfPage[]
): JailRosterReport {
  const first = pages[0] ?? [];
  if (!first.some((item) => item.text === config.title)) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const printedOnText = first.find((item) => PRINTED_ON.test(item.text))?.text;
  if (!printedOnText) throw new Error("PRINT_DATE_MISSING");

  let total: number | null = null;
  const blocks: Block[] = [];
  pages.forEach((page, pageIndex) => {
    const headers = HEADERS.map((label) => page.find((item) => item.text === label));
    if (headers.some((header) => !header)) throw new Error("COLUMNS_CHANGED");
    const headerY = Math.min(...headers.map((header) => header!.y));
    const body = page.filter(
      (item) =>
        item.y < headerY - SAME_ROW &&
        !PAGE_NUMBER.test(item.text) &&
        !(pageIndex === 0 && (item.text === config.title || PRINTED_ON.test(item.text)))
    );
    const totalItem = body.find((item) => TOTAL_RECORDS.test(item.text));
    if (totalItem) {
      if (total !== null) throw new Error("ROSTER_TOTAL_REPEATED");
      total = Number(totalItem.text.match(TOTAL_RECORDS)![1]);
    }
    const pageBlocks = body
      .filter((item) => inColumn(item, BOOKING_DATE_X))
      .sort((a, b) => b.y - a.y)
      .map((item): Block => {
        if (!SHORT_DATE.test(item.text)) throw new Error("BOOKING_DATE_UNREADABLE");
        return { top: item.y, bookingDate: item.text, items: [] };
      });
    for (const item of body) {
      if (
        item === totalItem ||
        pageBlocks.some((block) => block.top === item.y && inColumn(item, BOOKING_DATE_X))
      ) {
        continue;
      }
      // Each item belongs to the closest block start above it on the same page.
      const block = pageBlocks.filter((candidate) => candidate.top + SAME_ROW >= item.y).at(-1);
      if (!block) throw new Error("RECORD_SPLIT_ACROSS_PAGES");
      block.items.push(item);
    }
    blocks.push(...pageBlocks);
  });

  if (total === null) throw new Error("ROSTER_TOTAL_MISSING");
  if (blocks.length !== total) throw new Error("ROSTER_TOTAL_MISMATCH");

  const records = blocks.map((block) => {
    const byColumn = (x: number) =>
      block.items.filter((item) => inColumn(item, x)).sort((a, b) => b.y - a.y);
    const known = [NAME_X, CHARGE_X, HELD_FOR_X, RELEASE_X, BAIL_X];
    if (block.items.some((item) => !known.some((x) => inColumn(item, x)))) {
      throw new Error("LAYOUT_CHANGED");
    }
    const displayName = byColumn(NAME_X)
      .map((item) => item.text)
      .join(" ");
    if (!NAME.test(displayName)) throw new Error("NAME_UNREADABLE");

    const charges: { statuteCode: string; description: string }[] = [];
    for (const line of byColumn(CHARGE_X)) {
      const charge = line.text.match(CHARGE_LINE);
      if (!charge && Math.abs(block.top - HOLD_REASON_OFFSET - line.y) <= SAME_ROW) continue;
      if (charge) {
        charges.push({ statuteCode: charge[1]!, description: charge[2]! });
        continue;
      }
      const previous = charges.at(-1);
      if (!previous) throw new Error("CHARGE_UNREADABLE");
      previous.description = `${previous.description} ${line.text}`;
    }

    const bail = parseJailRosterBail(
      byColumn(BAIL_X)
        .map((item) => item.text)
        .join(" ")
    );
    return {
      recordKey: `${displayName}|${block.bookingDate}`,
      displayName,
      charges,
      bail
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
  return JailRosterReportSchema.parse({ records, printedOnText, validEmptyMarker: false });
}

async function requestRoster(
  config: JailRosterReportConfig,
  options: JailRosterReportAdapterOptions,
  context: AdapterContext
): Promise<JailRosterReport> {
  if (context.source.sourceUrl !== config.sourceUrl) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(config.sourceUrl, {
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
  const roster = parseJailRosterReportPages(
    config,
    await (options.extractPdfPages ?? extractPdfPages)(bytes)
  );
  const ageMs = Date.parse(context.requestedAt) - printedOnMs(roster.printedOnText);
  if (ageMs > MAX_PRINT_AGE_MS + PRINT_DATE_ALLOWANCE_MS) throw new Error("SOURCE_REPORT_STALE");
  return roster;
}

export function createJailRosterReportAdapter(
  config: JailRosterReportConfig,
  options: JailRosterReportAdapterOptions
): SourceAdapter<JailRosterReport, JailRosterReport, JailRosterReport> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: config.adapterKey,
    adapterVersion: "1.0.0",
    parserVersion: config.parserVersion,
    async fetch(context): Promise<FetchResult<JailRosterReport>> {
      try {
        return { ok: true, value: await requestRoster(config, options, context) };
      } catch (error) {
        return { ok: false, failure: classify(config, context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<JailRosterReport>> {
      const result = JailRosterReportSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(config, context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<JailRosterReport>> {
      const result = JailRosterReportSchema.safeParse(payload);
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
              evidence: `The official ${config.countyName} jail roster listed no one.`
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
          const bondEntries: BondEntry[] = record.bail.map((entry, sequence) => ({
            id: options.createId(
              "bond",
              `${bookingId}|${sequence}|${entry.label}|${entry.amountMinor}`
            ),
            bookingId,
            sequence,
            sourceLabel: entry.label,
            note:
              [
                entry.note,
                entry.amountMinor === 0
                  ? "The source displays $0.00; this is not interpreted as no bond."
                  : null
              ]
                .filter((part) => part !== null)
                .join("; ") || null,
            state: "monetary",
            amountMinor: entry.amountMinor,
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
          failure: classify(config, context, "health_check", error)
        };
      }
    },
    classifyFailure(error, stage, context) {
      return classify(config, context, stage, error);
    }
  };
}
