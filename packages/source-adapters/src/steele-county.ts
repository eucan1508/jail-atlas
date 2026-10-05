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

export const STEELE_COUNTY_ADAPTER_KEY = "steele-county-mn-current-roster" as const;
export const STEELE_COUNTY_CURRENT_SOURCE_URL =
  "https://www.steelecountymn.gov/Sheriff/Inmate_Roster.pdf" as const;
export const STEELE_COUNTY_SOURCE_HOST = "www.steelecountymn.gov" as const;
export const STEELE_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 1_000_000;
// Text items on one printed row share a baseline; allow for small font offsets.
const ROW_TOLERANCE = 3;
const COLUMN_TOLERANCE = 6;

// A new charge starts at a Minnesota statute citation, which Steele prints with a dash
// ("609-2242 - Domestic Assault"), or at a non-statute hold label. Any other line continues the
// previous charge.
const STATUTE_LINE = /^(\d{2,4}[A-Z]?-[0-9A-Za-z.()-]+) - /;
const HOLD_LINE = /^(?:Fed Hold|Parole Violation|Probation Violation) - /;

const SteeleChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const SteeleRecordSchema = z.object({
  displayName: z.string().trim().min(2).max(250),
  bookedText: z
    .string()
    .trim()
    .regex(/^\d{2}\/\d{2}\/\d{2}$/),
  charges: z.array(SteeleChargeSchema).max(50)
});
const SteeleRosterSchema = z.object({
  records: z.array(SteeleRecordSchema).max(MAX_RECORDS),
  sourcePrintedText: z.string().trim().min(1).max(100),
  validEmptyMarker: z.boolean()
});

export type SteeleRoster = z.infer<typeof SteeleRosterSchema>;
export type SteeleRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type SteeleRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type SteelePdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type SteelePdfPage = readonly SteelePdfTextItem[];
export type SteeleRosterPdfExtractor = (bytes: Uint8Array) => Promise<readonly SteelePdfPage[]>;

export interface SteeleRosterAdapterOptions {
  readonly fetch: SteeleRosterFetch;
  readonly facilityId: string;
  readonly createId: SteeleRosterIdFactory;
  readonly extractPdfPages?: SteeleRosterPdfExtractor;
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
    publicMessage: "The approved Steele County jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `STEELE_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly SteelePdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: SteelePdfPage[] = [];
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

function splitCharges(lines: readonly string[]): z.infer<typeof SteeleChargeSchema>[] {
  const charges: z.infer<typeof SteeleChargeSchema>[] = [];
  for (const line of lines) {
    const statute = line.match(STATUTE_LINE);
    const previous = charges.at(-1);
    if (statute || HOLD_LINE.test(line) || !previous) {
      charges.push({ description: line, statuteCode: statute?.[1] ?? null });
    } else {
      previous.description = `${previous.description} ${line}`;
    }
  }
  return charges;
}

function columnHeader(page: SteelePdfPage, label: string): SteelePdfTextItem | undefined {
  return page.find((item) => item.text === label);
}

export function parseSteeleRosterPages(pages: readonly SteelePdfPage[]): SteeleRoster {
  const allItems = pages.flat();
  if (
    !allItems.some((item) => item.text === "Steele County Sheriff's Office") ||
    !allItems.some((item) => item.text === "Inmate Roster")
  ) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const printedItem = allItems.find((item) => item.text.startsWith("Printed on "));
  const sourcePrintedText = printedItem?.text.slice("Printed on ".length).trim();
  if (!sourcePrintedText) throw new Error("MISSING_SOURCE_TIMESTAMP");

  const totalTexts = allItems
    .map((item) => item.text.match(/^Total Records:\s*(\d+)$/)?.[1])
    .filter((value): value is string => value !== undefined);
  if (totalTexts.length !== 1) throw new Error("TOTAL_RECORDS_MISSING");
  const declaredTotal = Number(totalTexts[0]);

  const records: z.infer<typeof SteeleRecordSchema>[] = [];
  for (const page of pages) {
    const nameHeader = columnHeader(page, "Inmate");
    const bookedHeader = columnHeader(page, "Booked");
    const agencyHeader = columnHeader(page, "Agency");
    const chargesHeader = columnHeader(page, "Charges");
    if (!nameHeader || !bookedHeader || !agencyHeader || !chargesHeader) {
      if (page.some((item) => /^\d{2}\/\d{2}\/\d{2}$/.test(item.text))) {
        throw new Error("ROSTER_STRUCTURE_MISSING");
      }
      continue;
    }
    const nameStart = nameHeader.x - COLUMN_TOLERANCE;
    const bookedStart = bookedHeader.x - COLUMN_TOLERANCE;
    const agencyStart = agencyHeader.x - COLUMN_TOLERANCE;
    const chargesStart = chargesHeader.x - COLUMN_TOLERANCE;
    const bodyTop = nameHeader.y - ROW_TOLERANCE;

    // Each row opens with its booking date in the Booked column.
    const anchors = page
      .filter(
        (item) =>
          item.x >= bookedStart &&
          item.x < agencyStart &&
          item.y < bodyTop &&
          /^\d{2}\/\d{2}\/\d{2}$/.test(item.text)
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

      const displayName = normalizeText(column(nameStart, bookedStart).join(" "));
      if (!displayName) throw new Error("INVALID_RECORD_IDENTITY");
      records.push(
        SteeleRecordSchema.parse({
          displayName,
          bookedText: anchor.text,
          charges: splitCharges(column(chargesStart, Infinity))
        })
      );
    });
  }

  if (records.length !== declaredTotal) throw new Error("RECORD_COUNT_MISMATCH");
  return SteeleRosterSchema.parse({
    records,
    sourcePrintedText,
    validEmptyMarker: declaredTotal === 0
  });
}

async function requestRoster(
  options: SteeleRosterAdapterOptions,
  context: AdapterContext
): Promise<SteeleRoster> {
  if (context.source.sourceUrl !== STEELE_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(STEELE_COUNTY_CURRENT_SOURCE_URL, {
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
  return parseSteeleRosterPages(await (options.extractPdfPages ?? extractPdfPages)(bytes));
}

export function createSteeleCountySourceAdapter(
  options: SteeleRosterAdapterOptions
): SourceAdapter<SteeleRoster, SteeleRoster, SteeleRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: STEELE_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: STEELE_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<SteeleRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<SteeleRoster>> {
      const result = SteeleRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<SteeleRoster>> {
      const result = SteeleRosterSchema.safeParse(payload);
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
              evidence: "The official Steele County jail roster reported Total Records: 0."
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
            // The roster publishes no booking or inmate number.
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
