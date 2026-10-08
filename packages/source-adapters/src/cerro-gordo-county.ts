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

export const CERRO_GORDO_COUNTY_ADAPTER_KEY = "cerro-gordo-county-iowa-current-roster" as const;
export const CERRO_GORDO_COUNTY_CURRENT_SOURCE_URL =
  "https://sofiles.cerrogordo.gov/inmate_report/" as const;
export const CERRO_GORDO_COUNTY_SOURCE_HOST = "sofiles.cerrogordo.gov" as const;
export const CERRO_GORDO_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 3_000_000;
// Text items on one printed row share a baseline; allow for small font offsets.
const ROW_TOLERANCE = 3;
const COLUMN_TOLERANCE = 8;
// The report is rebuilt through the day; a print date older than this means it stopped updating.
const MAX_PRINT_AGE_DAYS = 2;

// A new charge starts at an Iowa Code citation ("719.1(1)(b) - Interfere w/ Official Acts");
// any other line continues the previous charge.
const STATUTE_LINE = /^(\d{1,3}[A-Z]{0,2}\.\d+[A-Z]?(?:\([0-9A-Za-z]+\))*) - /;
const BOOKED_TEXT = /\b(\d{2}\/\d{2}\/\d{2} \d{1,2}:\d{2})\b/;
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

const CerroGordoChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const CerroGordoRecordSchema = z.object({
  displayName: z.string().trim().min(2).max(250),
  bookedText: z
    .string()
    .trim()
    .regex(/^\d{2}\/\d{2}\/\d{2} \d{1,2}:\d{2}$/),
  charges: z.array(CerroGordoChargeSchema).max(50)
});
const CerroGordoRosterSchema = z.object({
  records: z.array(CerroGordoRecordSchema).max(MAX_RECORDS),
  sourcePrintedText: z.string().trim().min(1).max(100),
  validEmptyMarker: z.boolean()
});

export type CerroGordoRoster = z.infer<typeof CerroGordoRosterSchema>;
export type CerroGordoRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type CerroGordoRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type CerroGordoPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type CerroGordoPdfPage = readonly CerroGordoPdfTextItem[];
export type CerroGordoRosterPdfExtractor = (
  bytes: Uint8Array
) => Promise<readonly CerroGordoPdfPage[]>;

export interface CerroGordoRosterAdapterOptions {
  readonly fetch: CerroGordoRosterFetch;
  readonly facilityId: string;
  readonly createId: CerroGordoRosterIdFactory;
  readonly extractPdfPages?: CerroGordoRosterPdfExtractor;
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
      "The approved Cerro Gordo County jail population report could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `CERRO_GORDO_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly CerroGordoPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: CerroGordoPdfPage[] = [];
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

function splitCharges(lines: readonly string[]): z.infer<typeof CerroGordoChargeSchema>[] {
  const charges: z.infer<typeof CerroGordoChargeSchema>[] = [];
  for (const line of lines) {
    const statute = line.match(STATUTE_LINE);
    const previous = charges.at(-1);
    if (statute || !previous) {
      charges.push({ description: line, statuteCode: statute?.[1] ?? null });
    } else {
      previous.description = `${previous.description} ${line}`;
    }
  }
  return charges;
}

function printedDate(text: string): Date | null {
  const match = text.match(/^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/);
  const month = match ? MONTHS.indexOf(match[1] ?? "") : -1;
  if (!match || month < 0) return null;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[2])));
}

function columnHeader(page: CerroGordoPdfPage, label: string): CerroGordoPdfTextItem | undefined {
  return page.find((item) => item.text === label);
}

export function parseCerroGordoRosterPages(
  pages: readonly CerroGordoPdfPage[],
  requestedAt: string
): CerroGordoRoster {
  const allItems = pages.flat();
  if (!allItems.some((item) => item.text === "CGSO Jail - Online Population Report")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const printedItem = allItems.find((item) => item.text.startsWith("Printed on "));
  const sourcePrintedText = printedItem?.text.slice("Printed on ".length).trim();
  const printed = sourcePrintedText ? printedDate(sourcePrintedText) : null;
  if (!sourcePrintedText || !printed) throw new Error("MISSING_SOURCE_TIMESTAMP");
  if (Date.parse(requestedAt) - printed.getTime() > MAX_PRINT_AGE_DAYS * 24 * 60 * 60 * 1_000) {
    throw new Error("SOURCE_STALE");
  }

  // Every page must be present, in order, or people at the end of the report would be lost.
  pages.forEach((page, index) => {
    const marker = page
      .map((item) => item.text.match(/^Page (\d+) of (\d+)$/))
      .find((match) => match !== null);
    if (!marker || Number(marker[1]) !== index + 1 || Number(marker[2]) !== pages.length) {
      throw new Error("PAGE_SEQUENCE_MISMATCH");
    }
  });

  const totalTexts = allItems
    .map((item) => item.text.match(/^Total Records:\s*(\d+)$/)?.[1])
    .filter((value): value is string => value !== undefined);
  if (totalTexts.length !== 1) throw new Error("TOTAL_RECORDS_MISSING");
  const declaredTotal = Number(totalTexts[0]);

  const records: z.infer<typeof CerroGordoRecordSchema>[] = [];
  for (const page of pages) {
    const nameHeader = columnHeader(page, "Name");
    const ageHeader = columnHeader(page, "Age");
    const housedHeader = columnHeader(page, "Housed At:");
    const chargesHeader = columnHeader(page, "Charges:");
    const bondHeader = columnHeader(page, "Bond");
    if (!nameHeader || !ageHeader || !housedHeader || !chargesHeader || !bondHeader) {
      if (page.some((item) => BOOKED_TEXT.test(item.text))) {
        throw new Error("ROSTER_STRUCTURE_MISSING");
      }
      continue;
    }
    const nameStart = nameHeader.x - COLUMN_TOLERANCE;
    const ageStart = ageHeader.x - COLUMN_TOLERANCE * 2;
    const housedStart = housedHeader.x - COLUMN_TOLERANCE;
    const chargesStart = chargesHeader.x - COLUMN_TOLERANCE;
    const bondStart = bondHeader.x - COLUMN_TOLERANCE;
    const bodyTop = nameHeader.y - ROW_TOLERANCE;

    // Each row opens with its booking date and time. The PDF sometimes merges the date with the
    // Sex column into one text item, so the anchor is any item between Age and Housed At that
    // carries a booking timestamp.
    const anchors = page
      .filter(
        (item) =>
          item.x >= ageStart &&
          item.x < housedStart &&
          item.y < bodyTop &&
          BOOKED_TEXT.test(item.text)
      )
      .sort((left, right) => right.y - left.y);
    const body = page.filter(
      (item) =>
        item.x >= nameStart &&
        item.y < bodyTop &&
        !/^Page \d+ of \d+$/.test(item.text) &&
        !/^Total Records:/.test(item.text)
    );

    // A row that continues across a page break would leave text above the first anchor.
    const firstAnchor = anchors[0];
    if (body.some((item) => item.y > (firstAnchor?.y ?? -Infinity) + ROW_TOLERANCE)) {
      throw new Error("RECORD_SPLIT_ACROSS_PAGES");
    }

    anchors.forEach((anchor, index) => {
      const top = anchor.y + ROW_TOLERANCE;
      const bottom = (anchors[index + 1]?.y ?? -Infinity) + ROW_TOLERANCE;
      const rowItems = body.filter((item) => item.y <= top && item.y > bottom);
      const column = (start: number, end: number) =>
        rowItems
          .filter((item) => item.x >= start && item.x < end)
          .sort((left, right) => right.y - left.y || left.x - right.x)
          .map((item) => item.text);

      const displayName = normalizeText(column(nameStart, ageStart).join(" "));
      const bookedText = anchor.text.match(BOOKED_TEXT)?.[1];
      if (!displayName || !bookedText) throw new Error("INVALID_RECORD_IDENTITY");
      records.push(
        CerroGordoRecordSchema.parse({
          displayName,
          bookedText,
          charges: splitCharges(column(chargesStart, bondStart))
        })
      );
    });
  }

  if (records.length !== declaredTotal) throw new Error("RECORD_COUNT_MISMATCH");
  return CerroGordoRosterSchema.parse({
    records,
    sourcePrintedText,
    validEmptyMarker: declaredTotal === 0
  });
}

async function requestRoster(
  options: CerroGordoRosterAdapterOptions,
  context: AdapterContext
): Promise<CerroGordoRoster> {
  if (context.source.sourceUrl !== CERRO_GORDO_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(CERRO_GORDO_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: {
      accept: "application/pdf",
      "accept-encoding": "identity",
      "user-agent": "Mozilla/5.0 (compatible; JailAtlas/1.0; +https://jailatlas.com)"
    }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("RESPONSE_SIZE");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_RESPONSE_BYTES) throw new Error("RESPONSE_SIZE");
  if (bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
    throw new Error("INVALID_PDF_SIGNATURE");
  }
  return parseCerroGordoRosterPages(
    await (options.extractPdfPages ?? extractPdfPages)(bytes),
    context.requestedAt
  );
}

export function createCerroGordoCountySourceAdapter(
  options: CerroGordoRosterAdapterOptions
): SourceAdapter<CerroGordoRoster, CerroGordoRoster, CerroGordoRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: CERRO_GORDO_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: CERRO_GORDO_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<CerroGordoRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<CerroGordoRoster>> {
      const result = CerroGordoRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<CerroGordoRoster>> {
      const result = CerroGordoRosterSchema.safeParse(payload);
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
                "The official Cerro Gordo County jail population report reported Total Records: 0."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const recordKey = `${sourceOrder}|${record.bookedText}|${record.displayName}`;
          const bookingId = options.createId("booking", recordKey);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId("charge", `${recordKey}|${sequence}|${charge.description}`),
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
              id: options.createId("person", recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The report's Jail ID identifies the person, not the booking, so it is not kept.
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
