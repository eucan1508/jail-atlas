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

export const ST_LOUIS_COUNTY_ADAPTER_KEY = "st-louis-county-mn-current-roster" as const;
export const ST_LOUIS_COUNTY_CURRENT_SOURCE_URL =
  "https://www.stlouiscountymn.gov/Portals/0/rpts/SLCJ_Jail_Roster.PDF" as const;
export const ST_LOUIS_COUNTY_SOURCE_HOST = "www.stlouiscountymn.gov" as const;
export const ST_LOUIS_COUNTY_PARSER_VERSION = "1.0.0" as const;
/** The roster also lists people boarded in other jails; only this location is kept. */
export const ST_LOUIS_COUNTY_JAIL_LOCATION = "Saint Louis County Jail" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 12_000_000;
// Text items on one printed row share a baseline; allow for small font offsets.
const ROW_TOLERANCE = 3;
// Column bands of the Oracle report layout (PDF points from the left edge).
const SEQUENCE_MAX_X = 30;
const NAME_MAX_X = 160;
const CHARGE_NUMBER_X: readonly [number, number] = [170, 181];
const CHARGE_TEXT_X: readonly [number, number] = [181, 430];
const LOCATION_X: readonly [number, number] = [295, 475];
const PAGE_HEADER_MIN_Y = 735;

const StLouisRecordSchema = z.object({
  sequence: z.number().int().positive(),
  displayName: z.string().trim().min(2).max(250),
  location: z.string().trim().min(1).max(200),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});
const StLouisRosterSchema = z.object({
  records: z.array(StLouisRecordSchema).max(MAX_RECORDS),
  listedTotal: z.number().int().nonnegative(),
  sourcePrintedText: z.string().trim().min(1).max(100),
  validEmptyMarker: z.boolean()
});

export type StLouisRoster = z.infer<typeof StLouisRosterSchema>;
export type StLouisRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type StLouisRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type StLouisPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type StLouisPdfPage = readonly StLouisPdfTextItem[];
export type StLouisRosterPdfExtractor = (bytes: Uint8Array) => Promise<readonly StLouisPdfPage[]>;

export interface StLouisRosterAdapterOptions {
  readonly fetch: StLouisRosterFetch;
  readonly facilityId: string;
  readonly createId: StLouisRosterIdFactory;
  readonly extractPdfPages?: StLouisRosterPdfExtractor;
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
    publicMessage: "The approved St. Louis County jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `ST_LOUIS_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly StLouisPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: StLouisPdfPage[] = [];
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

const within = (value: number, [start, end]: readonly [number, number]) =>
  value >= start && value < end;

function rowText(items: readonly StLouisPdfTextItem[]): string {
  return normalizeText(
    [...items]
      .sort((left, right) =>
        Math.abs(right.y - left.y) <= ROW_TOLERANCE ? left.x - right.x : right.y - left.y
      )
      .map((item) => item.text)
      .join(" ")
  );
}

/**
 * Reads the "JAIL ROSTER REPORT". Each entry opens with a running number in the left margin
 * (1, 2, 3, ...); the numbers must run without gaps across every page, which is the roster's only
 * completeness signal. People boarded in other jails are counted but not kept.
 */
export function parseStLouisRosterPages(pages: readonly StLouisPdfPage[]): StLouisRoster {
  const allItems = pages.flat();
  if (
    !allItems.some((item) => item.text === "SAINT LOUIS COUNTY JAIL") ||
    !allItems.some((item) => item.text === "JAIL ROSTER REPORT")
  ) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const printedItem = allItems.find((item) => item.text.startsWith("Current Inmates as of "));
  const sourcePrintedText = printedItem?.text.slice("Current Inmates as of ".length).trim();
  if (!sourcePrintedText) throw new Error("MISSING_SOURCE_TIMESTAMP");

  // Every page carries "Page N of M"; all M pages must be present and in order.
  pages.forEach((page, index) => {
    const footer = rowText(page.filter((item) => item.y >= PAGE_HEADER_MIN_Y && item.x > 450));
    const match = footer.match(/Page (\d+) of (\d+)/);
    if (!match || Number(match[1]) !== index + 1 || Number(match[2]) !== pages.length) {
      throw new Error("PAGE_SEQUENCE_MISMATCH");
    }
  });

  const records: z.infer<typeof StLouisRecordSchema>[] = [];
  let expectedSequence = 1;
  for (const page of pages) {
    const body = page.filter((item) => item.y < PAGE_HEADER_MIN_Y);
    const anchors = body
      .filter((item) => item.x < SEQUENCE_MAX_X && /^\d{1,4}$/.test(item.text))
      .sort((left, right) => right.y - left.y);
    const firstAnchor = anchors[0];
    if (body.some((item) => item.y > (firstAnchor?.y ?? -Infinity) + ROW_TOLERANCE * 2)) {
      throw new Error("RECORD_SPLIT_ACROSS_PAGES");
    }

    anchors.forEach((anchor, index) => {
      const sequence = Number(anchor.text);
      if (sequence !== expectedSequence) throw new Error("SEQUENCE_GAP");
      expectedSequence += 1;
      const top = anchor.y + ROW_TOLERANCE * 2;
      const bottom = (anchors[index + 1]?.y ?? -Infinity) + ROW_TOLERANCE * 2;
      const entry = body.filter((item) => item.y <= top && item.y > bottom && item !== anchor);

      const locationLabel = entry.find((item) => item.text === "Location:");
      const chargesHeader = entry.find((item) => item.text === "Charges");
      if (!locationLabel || !chargesHeader) throw new Error("ENTRY_STRUCTURE_MISSING");

      // Name lines sit in the left column above the Charges header; the last token "#12345" is
      // the jail's LID, which is not a booking number and is not kept.
      const nameText = rowText(
        entry.filter(
          (item) => item.x >= SEQUENCE_MAX_X && item.x < NAME_MAX_X && item.y > chargesHeader.y
        )
      );
      const displayName = normalizeText(nameText.replace(/\s*#\d+$/, ""));
      if (!/#\d+$/.test(nameText) || displayName.length < 2) {
        throw new Error("INVALID_RECORD_IDENTITY");
      }

      const location = rowText(
        entry.filter(
          (item) =>
            within(item.x, LOCATION_X) && Math.abs(item.y - locationLabel.y) <= ROW_TOLERANCE
        )
      );
      if (!location) throw new Error("MISSING_LOCATION");

      const chargeNumbers = entry
        .filter(
          (item) =>
            within(item.x, CHARGE_NUMBER_X) &&
            item.y < chargesHeader.y &&
            /^\d{1,3}$/.test(item.text)
        )
        .sort((left, right) => right.y - left.y);
      chargeNumbers.forEach((number, chargeIndex) => {
        if (Number(number.text) !== chargeIndex + 1) throw new Error("CHARGE_SEQUENCE_GAP");
      });
      const charges = chargeNumbers.map((number, chargeIndex) => {
        const chargeTop = number.y + ROW_TOLERANCE;
        const chargeBottom = (chargeNumbers[chargeIndex + 1]?.y ?? bottom) + ROW_TOLERANCE;
        return rowText(
          entry.filter(
            (item) => within(item.x, CHARGE_TEXT_X) && item.y <= chargeTop && item.y > chargeBottom
          )
        );
      });
      if (charges.some((charge) => !charge)) throw new Error("EMPTY_CHARGE");

      records.push(StLouisRecordSchema.parse({ sequence, displayName, location, charges }));
    });
  }

  const listedTotal = expectedSequence - 1;
  const kept = records.filter((record) => record.location === ST_LOUIS_COUNTY_JAIL_LOCATION);
  // A non-empty roster with nobody at the Duluth jail means the location column was misread.
  if (listedTotal > 0 && kept.length === 0) throw new Error("NO_RECORDS_AT_JAIL");
  return StLouisRosterSchema.parse({
    records: kept,
    listedTotal,
    sourcePrintedText,
    validEmptyMarker: listedTotal === 0
  });
}

async function requestRoster(
  options: StLouisRosterAdapterOptions,
  context: AdapterContext
): Promise<StLouisRoster> {
  if (context.source.sourceUrl !== ST_LOUIS_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(ST_LOUIS_COUNTY_CURRENT_SOURCE_URL, {
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
  return parseStLouisRosterPages(await (options.extractPdfPages ?? extractPdfPages)(bytes));
}

export function createStLouisCountySourceAdapter(
  options: StLouisRosterAdapterOptions
): SourceAdapter<StLouisRoster, StLouisRoster, StLouisRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: ST_LOUIS_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: ST_LOUIS_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<StLouisRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<StLouisRoster>> {
      const result = StLouisRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<StLouisRoster>> {
      const result = StLouisRosterSchema.safeParse(payload);
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
                "The official St. Louis County jail roster listed nobody at the Saint Louis County Jail."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", `${record.sequence}|${record.displayName}`);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${record.sequence}|${sequence}|${description}`),
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
              id: options.createId("person", `${record.sequence}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The roster prints a jail LID ("#12345"), which identifies the person, not a booking.
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
