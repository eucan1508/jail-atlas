import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
import { load } from "cheerio/slim";
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

export const FREEBORN_COUNTY_ADAPTER_KEY = "freeborn-county-mn-current-roster" as const;
export const FREEBORN_COUNTY_CURRENT_SOURCE_URL =
  "https://www.freeborncountymn.gov/438/Jail-Roster" as const;
export const FREEBORN_COUNTY_PARSER_VERSION = "1.0.0" as const;

const ORIGIN = "https://www.freeborncountymn.gov";
const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 2_000_000;
// Every person is printed with a photo, so the file grows by roughly 30 KB per person.
const MAX_PDF_BYTES = 6_000_000;
// The county uploads a new list on weekdays; a holiday weekend leaves the last one up for five
// days. Anything older means the county stopped updating it.
const MAX_LIST_AGE_MS = 6 * 24 * 60 * 60 * 1_000;
// "Current as of" is printed in Central time; allow for the offset when comparing to UTC.
const TIMEZONE_ALLOWANCE_MS = 6 * 60 * 60 * 1_000;
// Columns: name at x≈174, intake labels at x≈178, intake values at x≈246, charges at x=390.
const NAME_MIN_X = 150;
const NAME_MAX_X = 200;
const VALUE_MIN_X = 230;
const VALUE_MAX_X = 270;
const CHARGE_MIN_X = 380;
const CHARGE_MAX_X = 400;
const SAME_ROW = 3;
// Lines of one charge are 11.4 points apart; separate charges are about 15 points apart.
const CHARGE_BREAK = 13;

const PDF_LINK = /^\/DocumentCenter\/View\/\d+\/[A-Za-z]+-\d{1,2}-\d{4}$/;
// The county prints "Detenton"; accept the corrected spelling too.
const TITLE = /^Freeborn Co Adult Detenti?on Center$/;
const LONG_DATE = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/;
const CLOCK = /^(\d{1,2}):(\d{2}) ([ap]m)$/;
const PAGE_NUMBER = /^Page \d+ of \d+$/;
const NAME = /^\p{L}[\p{L}' .-]*, \p{L}[\p{L}' .-]*$/u;
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

const FreebornRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});
const FreebornRosterSchema = z.object({
  records: z.array(FreebornRecordSchema).max(MAX_RECORDS),
  currentAsOfText: z.string().min(1).max(40),
  validEmptyMarker: z.boolean()
});

export type FreebornRoster = z.infer<typeof FreebornRosterSchema>;
export type FreebornRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type FreebornRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type FreebornPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type FreebornPdfPage = readonly FreebornPdfTextItem[];
export type FreebornRosterPdfExtractor = (bytes: Uint8Array) => Promise<readonly FreebornPdfPage[]>;

export interface FreebornRosterAdapterOptions {
  readonly fetch: FreebornRosterFetch;
  readonly facilityId: string;
  readonly createId: FreebornRosterIdFactory;
  readonly extractPdfPages?: FreebornRosterPdfExtractor;
  readonly nowMs?: () => number;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
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
      "The approved Freeborn County, Minnesota in-custody list could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `FREEBORN_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly FreebornPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: FreebornPdfPage[] = [];
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

/** Central-time stamp read as if it were UTC; the age check allows for the offset. */
function currentAsOfMs(text: string): number {
  const [datePart = "", timePart = ""] = text.split(" at ");
  const date = datePart.match(LONG_DATE);
  const time = timePart.match(CLOCK);
  const month = date ? MONTHS.indexOf(date[1]!) : -1;
  if (!date || !time || month < 0) throw new Error("CURRENT_AS_OF_MISSING");
  const hours = (Number(time[1]) % 12) + (time[3] === "pm" ? 12 : 0);
  return Date.UTC(Number(date[3]), month, Number(date[2]), hours, Number(time[2]));
}

function sameRow(a: FreebornPdfTextItem, b: FreebornPdfTextItem): boolean {
  return Math.abs(a.y - b.y) <= SAME_ROW;
}

function inColumn(item: FreebornPdfTextItem, min: number, max: number): boolean {
  return item.x >= min && item.x <= max;
}

type RecordDraft = {
  displayName: string;
  top: number;
  intakeDate: string | null;
  intakeTime: string | null;
  lines: FreebornPdfTextItem[];
};

/**
 * Reads the In Custody List: a header with the total and a "Current as of" stamp, then one block
 * per person with the name beside a "Charge(s)" heading, the intake date and time below the name,
 * and the charges in the right column. A charge that wraps continues 11.4 points lower; the next
 * charge starts about 15 points lower. Photos and intake times are read past and never kept.
 */
export function parseFreebornRosterPages(pages: readonly FreebornPdfPage[]): FreebornRoster {
  const first = pages[0] ?? [];
  if (
    !first.some((item) => TITLE.test(item.text)) ||
    !first.some((item) => item.text === "In Custody List")
  ) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }

  const totalLabel = first.find((item) => item.text === "Total Inmates:");
  const totalValue = totalLabel
    ? first.find(
        (item) => item !== totalLabel && sameRow(item, totalLabel) && /^\d+$/.test(item.text)
      )
    : undefined;
  if (!totalLabel || !totalValue) throw new Error("ROSTER_TOTAL_MISSING");
  const total = Number(totalValue.text);
  if (total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");

  const asOfLabel = first.find((item) => item.text === "**Current as of:");
  if (!asOfLabel) throw new Error("CURRENT_AS_OF_MISSING");
  // The stamp prints one line below its label, to the right of the total.
  const stampRow = first.filter(
    (item) => item.x >= asOfLabel.x - 10 && sameRow(item, totalLabel) && item !== totalValue
  );
  const stampDate = stampRow.find((item) => LONG_DATE.test(item.text));
  const stampTime = stampRow.find((item) => CLOCK.test(item.text));
  if (!stampDate || !stampTime) throw new Error("CURRENT_AS_OF_MISSING");
  const currentAsOfText = `${stampDate.text} at ${stampTime.text}`;
  const headerBottom = Math.min(totalLabel.y, asOfLabel.y);

  const drafts: RecordDraft[] = [];
  pages.forEach((page, pageIndex) => {
    const body = page.filter(
      (item) =>
        !PAGE_NUMBER.test(item.text) &&
        // The first page opens with the list header; everything below it is people.
        (pageIndex > 0 || item.y < headerBottom - SAME_ROW)
    );
    const headings = body
      .filter((item) => item.text === "Charge(s)" && inColumn(item, CHARGE_MIN_X, CHARGE_MAX_X))
      .sort((a, b) => b.y - a.y);
    const used = new Set<FreebornPdfTextItem>(headings);
    const pageDrafts = headings.map((heading): RecordDraft => {
      const names = body.filter(
        (item) => sameRow(item, heading) && inColumn(item, NAME_MIN_X, NAME_MAX_X)
      );
      if (names.length !== 1 || !NAME.test(names[0]!.text)) throw new Error("NAME_UNREADABLE");
      used.add(names[0]!);
      return {
        displayName: names[0]!.text,
        top: heading.y,
        intakeDate: null,
        intakeTime: null,
        lines: []
      };
    });
    const owner = (item: FreebornPdfTextItem): RecordDraft => {
      // Each item belongs to the closest block heading above it on the same page.
      const draft = pageDrafts.filter((candidate) => candidate.top + SAME_ROW >= item.y).at(-1);
      if (!draft) throw new Error("RECORD_SPLIT_ACROSS_PAGES");
      return draft;
    };
    for (const label of body.filter(
      (item) =>
        (item.text === "Intake Date:" || item.text === "Intake Time:") &&
        inColumn(item, NAME_MIN_X, NAME_MAX_X)
    )) {
      const isDate = label.text === "Intake Date:";
      const value = body.find(
        (item) => sameRow(item, label) && inColumn(item, VALUE_MIN_X, VALUE_MAX_X)
      );
      const draft = owner(label);
      if (
        !value ||
        !(isDate ? LONG_DATE : CLOCK).test(value.text) ||
        (isDate ? draft.intakeDate : draft.intakeTime) !== null
      ) {
        throw new Error("INTAKE_UNREADABLE");
      }
      if (isDate) draft.intakeDate = value.text;
      else draft.intakeTime = value.text;
      used.add(label).add(value);
    }
    for (const item of body) {
      if (used.has(item)) continue;
      // Anything else outside the charge column means the layout moved.
      if (!inColumn(item, CHARGE_MIN_X, CHARGE_MAX_X)) throw new Error("LAYOUT_CHANGED");
      owner(item).lines.push(item);
    }
    drafts.push(...pageDrafts);
  });

  if (drafts.length !== total) throw new Error("ROSTER_TOTAL_MISMATCH");
  const records = drafts.map((draft) => {
    if (!draft.intakeDate || !draft.intakeTime) throw new Error("INTAKE_UNREADABLE");
    const charges: string[][] = [];
    let previous: FreebornPdfTextItem | null = null;
    for (const line of [...draft.lines].sort((a, b) => b.y - a.y)) {
      if (!previous || previous.y - line.y > CHARGE_BREAK) charges.push([]);
      charges.at(-1)!.push(line.text);
      previous = line;
    }
    return {
      recordKey: `${draft.displayName}|${draft.intakeDate} ${draft.intakeTime}`,
      displayName: draft.displayName,
      charges: charges.map((lines) => lines.join(" "))
    };
  });
  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_ROSTER_ENTRY");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  // The county jail is never empty; a list without people means the report broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return FreebornRosterSchema.parse({ records, currentAsOfText, validEmptyMarker: false });
}

/** Finds the one list the Jail Roster page links; the county uploads it under a new name daily. */
export function findFreebornListUrl(html: string): string {
  const $ = load(html);
  if (normalizeText($("#versionHeadLine").text()) !== "Jail Roster") {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const links = [
    ...new Set(
      $("#moduleContent a.fileType.pdf")
        .toArray()
        .map((link) => $(link).attr("href") ?? "")
    )
  ];
  if (links.length !== 1 || !PDF_LINK.test(links[0]!)) throw new Error("LIST_LINK_CHANGED");
  return `${ORIGIN}${links[0]!}`;
}

async function requestRoster(
  options: FreebornRosterAdapterOptions,
  context: AdapterContext
): Promise<FreebornRoster> {
  if (context.source.sourceUrl !== FREEBORN_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const pageResponse = await options.fetch(FREEBORN_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!pageResponse.ok) throw new Error(`HTTP_${pageResponse.status}`);
  const html = await pageResponse.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");

  const response = await options.fetch(findFreebornListUrl(html), {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/pdf", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_PDF_BYTES) throw new Error("RESPONSE_SIZE");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) throw new Error("RESPONSE_SIZE");
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    throw new Error("INVALID_PDF_SIGNATURE");
  }
  const roster = parseFreebornRosterPages(
    await (options.extractPdfPages ?? extractPdfPages)(bytes)
  );
  const ageMs = Date.parse(context.requestedAt) - currentAsOfMs(roster.currentAsOfText);
  if (ageMs > MAX_LIST_AGE_MS + TIMEZONE_ALLOWANCE_MS) throw new Error("SOURCE_LIST_STALE");
  return roster;
}

export function createFreebornCountySourceAdapter(
  options: FreebornRosterAdapterOptions
): SourceAdapter<FreebornRoster, FreebornRoster, FreebornRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: FREEBORN_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: FREEBORN_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<FreebornRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<FreebornRoster>> {
      const result = FreebornRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<FreebornRoster>> {
      const result = FreebornRosterSchema.safeParse(payload);
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
              evidence: "The official Freeborn County In Custody List listed no one."
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
            sourceLabel: "Charge(s)",
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
            // The list shows no booking number.
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
