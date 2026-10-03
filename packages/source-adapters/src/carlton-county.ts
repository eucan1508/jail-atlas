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

export const CARLTON_COUNTY_ADAPTER_KEY = "carlton-county-mn-current-roster" as const;
export const CARLTON_COUNTY_CURRENT_SOURCE_URL =
  "https://jailroster.co.carlton.mn.us/CCJ_Jail_Roster.pdf" as const;
export const CARLTON_COUNTY_SOURCE_HOST = "jailroster.co.carlton.mn.us" as const;
export const CARLTON_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
// The roster embeds a mugshot column, so the PDF is much larger than its text.
const MAX_RESPONSE_BYTES = 12_000_000;
// Text items on one printed row share a baseline; allow for small font offsets.
const ROW_TOLERANCE = 3;
const COLUMN_TOLERANCE = 6;
// Every roster entry ends with this deposit notice, which gives a reliable record boundary.
const RECORD_SEPARATOR = /^\*\*\*Money can be deposited/;

// A new charge starts at a Minnesota statute citation ("609.19.1 - ..."). The first line of the
// Charges column is the booking basis ("BENCH WARRANT", "HOLD FOR ANOTHER AGENCY", ...), which
// is kept as its own entry.
const STATUTE_LINE = /^(\d{2,4}[A-Z]?\.[0-9A-Za-z.()]+) - /;

const CarltonChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const CarltonRecordSchema = z.object({
  displayName: z.string().trim().min(2).max(250),
  rosterNumber: z
    .string()
    .trim()
    .regex(/^\d{3,12}$/),
  charges: z.array(CarltonChargeSchema).max(50)
});
const CarltonRosterSchema = z.object({
  records: z.array(CarltonRecordSchema).max(MAX_RECORDS),
  sourcePrintedText: z.string().trim().min(1).max(100),
  validEmptyMarker: z.boolean()
});

export type CarltonRoster = z.infer<typeof CarltonRosterSchema>;
export type CarltonRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type CarltonRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type CarltonPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type CarltonPdfPage = readonly CarltonPdfTextItem[];
export type CarltonRosterPdfExtractor = (bytes: Uint8Array) => Promise<readonly CarltonPdfPage[]>;

export interface CarltonRosterAdapterOptions {
  readonly fetch: CarltonRosterFetch;
  readonly facilityId: string;
  readonly createId: CarltonRosterIdFactory;
  readonly extractPdfPages?: CarltonRosterPdfExtractor;
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
    publicMessage: "The approved Carlton County jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `CARLTON_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly CarltonPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: CarltonPdfPage[] = [];
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

function splitCharges(items: readonly CarltonPdfTextItem[]): z.infer<typeof CarltonChargeSchema>[] {
  const charges: z.infer<typeof CarltonChargeSchema>[] = [];
  const first = items[0];
  // The first row holds the booking basis unless it already is a statute citation.
  let basisOpen = first !== undefined && !STATUTE_LINE.test(first.text);
  for (const item of items) {
    const statute = item.text.match(STATUTE_LINE);
    const previous = charges.at(-1);
    const leavesBasisRow = basisOpen && first !== undefined && item.y < first.y - ROW_TOLERANCE;
    if (statute || !previous || leavesBasisRow) {
      if (previous && leavesBasisRow) basisOpen = false;
      charges.push({ description: item.text, statuteCode: statute?.[1] ?? null });
    } else {
      previous.description = `${previous.description} ${item.text}`;
    }
  }
  return charges;
}

function columnHeader(page: CarltonPdfPage, label: string): CarltonPdfTextItem | undefined {
  return page.find((item) => item.text === label);
}

function parseRosterPages(pages: readonly CarltonPdfPage[]): CarltonRoster {
  const allItems = pages.flat();
  if (!allItems.some((item) => item.text === "Carlton Jail Website")) {
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

  const records: z.infer<typeof CarltonRecordSchema>[] = [];
  const seenRosterNumbers = new Set<string>();
  for (const page of pages) {
    const demographicsHeader = columnHeader(page, "Demographics");
    const agencyHeader = columnHeader(page, "Arresting Agency");
    const chargesHeader = columnHeader(page, "Charges");
    const courtHeader = columnHeader(page, "Next Court Date");
    if (!demographicsHeader || !agencyHeader || !chargesHeader || !courtHeader) {
      if (page.some((item) => RECORD_SEPARATOR.test(item.text))) {
        throw new Error("ROSTER_STRUCTURE_MISSING");
      }
      continue;
    }
    const demographicsStart = demographicsHeader.x - COLUMN_TOLERANCE;
    const agencyStart = agencyHeader.x - COLUMN_TOLERANCE;
    const chargesStart = chargesHeader.x - COLUMN_TOLERANCE;
    const courtStart = courtHeader.x - COLUMN_TOLERANCE;
    const bodyTop = chargesHeader.y - ROW_TOLERANCE;

    // The unlabeled number in the mugshot column opens each entry. Long charge lists can run
    // below the entry's deposit notice, so an entry extends down to the next opener.
    const openers = page
      .filter((item) => item.x < demographicsStart && item.y < bodyTop && /^\d+$/.test(item.text))
      .sort((left, right) => right.y - left.y);
    const separatorCount = page.filter((item) => RECORD_SEPARATOR.test(item.text)).length;
    if (openers.length !== separatorCount) throw new Error("RECORD_BOUNDARY_MISMATCH");
    const body = page.filter(
      (item) =>
        item.x >= demographicsStart &&
        item.y < bodyTop &&
        !/^Page \d+ of \d+$/.test(item.text) &&
        !/^Total Records:/.test(item.text)
    );

    // An entry that continues across a page break would leave text above the first opener.
    const firstOpener = openers[0];
    if (body.some((item) => item.y > (firstOpener?.y ?? -Infinity) + ROW_TOLERANCE)) {
      throw new Error("RECORD_SPLIT_ACROSS_PAGES");
    }

    openers.forEach((opener, index) => {
      const bottom = (openers[index + 1]?.y ?? -Infinity) + ROW_TOLERANCE;
      const block = body.filter((item) => item.y <= opener.y + ROW_TOLERANCE && item.y > bottom);
      const nameLabel = block.find((item) => item.text === "NAME:");
      if (!nameLabel) throw new Error("INVALID_RECORD_IDENTITY");
      const displayName = normalizeText(
        block
          .filter(
            (item) =>
              item.x >= demographicsStart &&
              item.x < agencyStart &&
              item.y < nameLabel.y - ROW_TOLERANCE
          )
          .sort((left, right) => right.y - left.y || left.x - right.x)
          .map((item) => item.text)
          .join(" ")
      );
      if (!displayName) throw new Error("INVALID_RECORD_IDENTITY");
      if (seenRosterNumbers.has(opener.text)) throw new Error("DUPLICATE_ROSTER_NUMBER");
      seenRosterNumbers.add(opener.text);
      const chargeItems = block
        .filter((item) => item.x >= chargesStart && item.x < courtStart)
        .sort((left, right) => right.y - left.y || left.x - right.x);
      records.push(
        CarltonRecordSchema.parse({
          displayName,
          rosterNumber: opener.text,
          charges: splitCharges(chargeItems)
        })
      );
    });
  }

  if (records.length !== declaredTotal) throw new Error("RECORD_COUNT_MISMATCH");
  return CarltonRosterSchema.parse({
    records,
    sourcePrintedText,
    validEmptyMarker: declaredTotal === 0
  });
}

async function requestRoster(
  options: CarltonRosterAdapterOptions,
  context: AdapterContext
): Promise<CarltonRoster> {
  if (context.source.sourceUrl !== CARLTON_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(CARLTON_COUNTY_CURRENT_SOURCE_URL, {
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
  return parseRosterPages(await (options.extractPdfPages ?? extractPdfPages)(bytes));
}

export function createCarltonCountySourceAdapter(
  options: CarltonRosterAdapterOptions
): SourceAdapter<CarltonRoster, CarltonRoster, CarltonRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: CARLTON_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: CARLTON_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<CarltonRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<CarltonRoster>> {
      const result = CarltonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<CarltonRoster>> {
      const result = CarltonRosterSchema.safeParse(payload);
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
              evidence: "The official Carlton County jail roster reported Total Records: 0."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.rosterNumber);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId(
              "charge",
              `${record.rosterNumber}|${sequence}|${charge.description}`
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
              id: options.createId("person", `${record.rosterNumber}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The roster's number sits unlabeled in the mugshot column, so it only keys the
            // record and is not published as a booking number.
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
