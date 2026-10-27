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

export const OTTER_TAIL_COUNTY_ADAPTER_KEY = "otter-tail-county-mn-current-roster" as const;
export const OTTER_TAIL_COUNTY_CURRENT_SOURCE_URL =
  "https://web1.co.ottertail.mn.us/sheriff/report/custody%20list.rpt.pdf" as const;
export const OTTER_TAIL_COUNTY_SOURCE_HOST = "web1.co.ottertail.mn.us" as const;
export const OTTER_TAIL_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
// The list embeds a photo per person, about 30 KB each.
const MAX_RESPONSE_BYTES = 6_000_000;
// Text items on one printed row share a baseline; allow for small font offsets.
const ROW_TOLERANCE = 4;
const COLUMN_TOLERANCE = 8;
// The list is rebuilt every two hours; a print date older than this means it stopped updating.
const MAX_PRINT_AGE_DAYS = 2;

const RECORD_NUMBER = /^\d{12}$/;
// Each charge opens with its level, status, and Minnesota statute ("F - Active 609.582.1(c)");
// the lines under it are the offense description.
// "F - Active 609.205(1)"; the status can run to several words, as in "RPR/Chg Dismiss".
const CHARGE_HEADER = /^([A-Z]{1,2}) - ([A-Za-z][A-Za-z/ ]*?) (\d[0-9A-Za-z.()~]*)$/;
const PRINTED_TEXT = /^In Custody (\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}:\d{2})$/;

const OtterTailChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100)
});
const OtterTailRecordSchema = z.object({
  displayName: z.string().trim().min(2).max(250),
  bookingNumber: z.string().regex(RECORD_NUMBER),
  charges: z.array(OtterTailChargeSchema).max(100)
});
const OtterTailRosterSchema = z.object({
  records: z.array(OtterTailRecordSchema).max(MAX_RECORDS),
  sourcePrintedText: z.string().trim().min(1).max(100),
  validEmptyMarker: z.boolean()
});

export type OtterTailRoster = z.infer<typeof OtterTailRosterSchema>;
export type OtterTailRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type OtterTailRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type OtterTailPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type OtterTailPdfPage = readonly OtterTailPdfTextItem[];
export type OtterTailRosterPdfExtractor = (
  bytes: Uint8Array
) => Promise<readonly OtterTailPdfPage[]>;

export interface OtterTailRosterAdapterOptions {
  readonly fetch: OtterTailRosterFetch;
  readonly facilityId: string;
  readonly createId: OtterTailRosterIdFactory;
  readonly extractPdfPages?: OtterTailRosterPdfExtractor;
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
    publicMessage: "The approved Otter Tail County in-custody list could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `OTTER_TAIL_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly OtterTailPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: OtterTailPdfPage[] = [];
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

function splitCharges(lines: readonly string[]): z.infer<typeof OtterTailChargeSchema>[] {
  const charges: { statuteCode: string; lines: string[] }[] = [];
  for (const line of lines) {
    const header = line.match(CHARGE_HEADER);
    if (header?.[3]) {
      charges.push({ statuteCode: header[3], lines: [] });
      continue;
    }
    const current = charges.at(-1);
    if (!current) throw new Error("CHARGE_STRUCTURE_CHANGED");
    current.lines.push(line);
  }
  return charges.map((charge) => {
    if (charge.lines.length === 0) throw new Error("CHARGE_DESCRIPTION_MISSING");
    return { description: charge.lines.join(" "), statuteCode: charge.statuteCode };
  });
}

function columnHeader(page: OtterTailPdfPage, label: string): OtterTailPdfTextItem | undefined {
  return page.find((item) => item.text === label);
}

/**
 * Reads the "Otter Tail County Jail / In Custody" report. Each row opens with the person's MNI
 * number in the left column and carries one booking number; the list prints no total, so every
 * page must be present and every row must be whole.
 */
export function parseOtterTailRosterPages(
  pages: readonly OtterTailPdfPage[],
  requestedAt: string
): OtterTailRoster {
  const allItems = pages.flat();
  if (!allItems.some((item) => item.text === "Otter Tail County Jail")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const printedItem = allItems.find((item) => PRINTED_TEXT.test(item.text));
  const printed = printedItem?.text.match(PRINTED_TEXT);
  if (!printedItem || !printed) throw new Error("MISSING_SOURCE_TIMESTAMP");
  const printedDay = Date.UTC(Number(printed[3]), Number(printed[1]) - 1, Number(printed[2]));
  if (Date.parse(requestedAt) - printedDay > MAX_PRINT_AGE_DAYS * 24 * 60 * 60 * 1_000) {
    throw new Error("SOURCE_STALE");
  }

  // Every page must be present, in order, or people at the end of the list would be lost.
  pages.forEach((page, index) => {
    const marker = page
      .map((item) => item.text.match(/^Page (\d+) of (\d+)$/))
      .find((match) => match !== null);
    if (!marker || Number(marker[1]) !== index + 1 || Number(marker[2]) !== pages.length) {
      throw new Error("PAGE_SEQUENCE_MISMATCH");
    }
  });

  const records: z.infer<typeof OtterTailRecordSchema>[] = [];
  const seenBookings = new Set<string>();
  for (const page of pages) {
    const mniHeader = columnHeader(page, "MNI #");
    const nameHeader = columnHeader(page, "Name");
    const sexHeader = columnHeader(page, "Sex");
    const bookingHeader = columnHeader(page, "Booking #");
    const intakeHeader = columnHeader(page, "Intake_Date");
    const chargesHeader = columnHeader(page, "Charges");
    const bondHeader = columnHeader(page, "Bond_Amount");
    const releaseHeader = columnHeader(page, "Projected Release Date");
    if (
      !mniHeader ||
      !nameHeader ||
      !sexHeader ||
      !bookingHeader ||
      !intakeHeader ||
      !chargesHeader ||
      !bondHeader ||
      !releaseHeader
    ) {
      throw new Error("ROSTER_STRUCTURE_MISSING");
    }
    const nameStart = nameHeader.x - COLUMN_TOLERANCE;
    const nameEnd = sexHeader.x - COLUMN_TOLERANCE;
    const bookingStart = bookingHeader.x - COLUMN_TOLERANCE;
    const bookingEnd = intakeHeader.x - COLUMN_TOLERANCE;
    const chargesStart = chargesHeader.x - COLUMN_TOLERANCE;
    const chargesEnd = Math.min(bondHeader.x, releaseHeader.x) - COLUMN_TOLERANCE;
    // The header spans two lines ("Projected Release Date" sits under "Bond_Amount").
    const bodyTop = Math.min(mniHeader.y, releaseHeader.y) - ROW_TOLERANCE;

    const anchors = page
      .filter((item) => item.x < nameStart && item.y < bodyTop && RECORD_NUMBER.test(item.text))
      .sort((left, right) => right.y - left.y);
    const body = page.filter(
      (item) => item.x >= nameStart && item.y < bodyTop && !/^Page \d+ of \d+$/.test(item.text)
    );

    // A row that continues across a page break would leave text above the first anchor.
    const firstAnchor = anchors[0];
    if (body.some((item) => item.y > (firstAnchor?.y ?? -Infinity) + ROW_TOLERANCE)) {
      throw new Error("RECORD_SPLIT_ACROSS_PAGES");
    }
    const bookingItems = body.filter(
      (item) => item.x >= bookingStart && item.x < bookingEnd && RECORD_NUMBER.test(item.text)
    );
    if (bookingItems.length !== anchors.length) throw new Error("RECORD_BOUNDARY_MISMATCH");

    anchors.forEach((anchor, index) => {
      const top = anchor.y + ROW_TOLERANCE;
      const bottom = (anchors[index + 1]?.y ?? -Infinity) + ROW_TOLERANCE;
      const rowItems = body.filter((item) => item.y <= top && item.y > bottom);
      const column = (start: number, end: number) =>
        rowItems
          .filter((item) => item.x >= start && item.x < end)
          .sort((left, right) => right.y - left.y || left.x - right.x)
          .map((item) => item.text);

      const bookingNumbers = column(bookingStart, bookingEnd).filter((text) =>
        RECORD_NUMBER.test(text)
      );
      const displayName = normalizeText(column(nameStart, nameEnd).join(" "));
      const bookingNumber = bookingNumbers[0];
      if (bookingNumbers.length !== 1 || !bookingNumber || !displayName) {
        throw new Error("INVALID_RECORD_IDENTITY");
      }
      if (seenBookings.has(bookingNumber)) throw new Error("DUPLICATE_BOOKING_NUMBER");
      seenBookings.add(bookingNumber);
      records.push(
        OtterTailRecordSchema.parse({
          displayName,
          bookingNumber,
          charges: splitCharges(column(chargesStart, chargesEnd))
        })
      );
    });
  }

  // The jail is never empty; an empty list means the report broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return OtterTailRosterSchema.parse({
    records,
    sourcePrintedText: printedItem.text.slice("In Custody ".length),
    validEmptyMarker: false
  });
}

async function requestRoster(
  options: OtterTailRosterAdapterOptions,
  context: AdapterContext
): Promise<OtterTailRoster> {
  if (context.source.sourceUrl !== OTTER_TAIL_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(OTTER_TAIL_COUNTY_CURRENT_SOURCE_URL, {
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
  return parseOtterTailRosterPages(
    await (options.extractPdfPages ?? extractPdfPages)(bytes),
    context.requestedAt
  );
}

export function createOtterTailCountySourceAdapter(
  options: OtterTailRosterAdapterOptions
): SourceAdapter<OtterTailRoster, OtterTailRoster, OtterTailRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: OTTER_TAIL_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: OTTER_TAIL_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<OtterTailRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<OtterTailRoster>> {
      const result = OtterTailRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<OtterTailRoster>> {
      const result = OtterTailRosterSchema.safeParse(payload);
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
              evidence: "The official Otter Tail County in-custody list reported nobody in custody."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingNumber);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId(
              "charge",
              `${record.bookingNumber}|${sequence}|${charge.description}`
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
              id: options.createId("person", `${record.bookingNumber}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            bookingIdentifier: {
              value: record.bookingNumber,
              sourceLabel: "Booking #",
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
