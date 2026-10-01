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

export const MOWER_COUNTY_ADAPTER_KEY = "mower-county-mn-current-roster" as const;
export const MOWER_COUNTY_CURRENT_SOURCE_URL =
  "https://mower-sftp.co.mower.mn.us/WSFTPSVR/mcounty/jail/JailRoster.rpt.pdf" as const;
export const MOWER_COUNTY_SOURCE_HOST = "mower-sftp.co.mower.mn.us" as const;
export const MOWER_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 8_000_000;

const MowerRecordSchema = z.object({
  displayName: z.string().trim().min(3).max(250),
  bookingNumber: z
    .string()
    .trim()
    .regex(/^MCJ-\d{12}$/),
  bookingDateText: z.string().trim().min(1).max(100).nullable(),
  charges: z.array(z.string().trim().min(1).max(5_000)).max(1)
});
const MowerRosterSchema = z.object({
  records: z.array(MowerRecordSchema).max(MAX_RECORDS),
  sourceLastUpdatedText: z.string().trim().min(1).max(100),
  validEmptyMarker: z.boolean()
});

export type MowerRoster = z.infer<typeof MowerRosterSchema>;
export type MowerRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type MowerRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;
export type MowerRosterPdfExtractor = (bytes: Uint8Array) => Promise<readonly string[]>;

export interface MowerRosterAdapterOptions {
  readonly fetch: MowerRosterFetch;
  readonly facilityId: string;
  readonly createId: MowerRosterIdFactory;
  readonly extractPdfLines?: MowerRosterPdfExtractor;
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
    publicMessage: "The approved Mower County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `MOWER_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfLines(bytes: Uint8Array): Promise<readonly string[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const lines: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter((item): item is typeof item & { str: string; transform: number[] } => "str" in item)
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
        .filter((item) => item.text.length > 0);
      const rows: Array<{ y: number; items: typeof items }> = [];
      for (const item of items) {
        let row = rows.find((candidate) => Math.abs(candidate.y - item.y) < 2);
        if (!row) {
          row = { y: item.y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
      }
      rows.sort((left, right) => right.y - left.y);
      for (const row of rows) {
        row.items.sort((left, right) => left.x - right.x);
        lines.push(row.items.map((item) => item.text).join(" | "));
      }
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return lines;
}

function valueAfterLabel(line: string, label: string): string | null {
  if (!line.startsWith(label)) return null;
  const value = line.slice(label.length).replace(/^\s*\|\s*/, "");
  return normalizeText(value) || null;
}

function parseRosterLines(linesInput: readonly string[]): MowerRoster {
  const lines = linesInput.map(normalizeText).filter(Boolean);
  if (!lines.includes("Mower County Jail") || !lines.includes("Inmates in Custody")) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const updatedLine = lines.find((line) => line.startsWith("Updated :"));
  const sourceLastUpdatedText = updatedLine ? valueAfterLabel(updatedLine, "Updated :") : null;
  if (!sourceLastUpdatedText) throw new Error("MISSING_SOURCE_TIMESTAMP");

  const headerIndexes = lines
    .map((line, index) => (/^\d+\s*\|\s*.+/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  const validEmptyMarker =
    headerIndexes.length === 0 &&
    lines.some((line) => /^0\s+inmates?|no inmates in custody$/i.test(line));
  if (headerIndexes.length === 0 && !validEmptyMarker) throw new Error("ROSTER_STRUCTURE_MISSING");

  const recordsByBooking = new Map<string, z.infer<typeof MowerRecordSchema>>();
  for (let position = 0; position < headerIndexes.length; position += 1) {
    const start = headerIndexes[position] ?? 0;
    const end = headerIndexes[position + 1] ?? lines.length;
    const chunk = lines.slice(start, end);
    const nameMatch = chunk[0]?.match(/^\d+\s*\|\s*(.+)$/);
    const displayName = normalizeText(nameMatch?.[1] ?? "");
    const bookingNumber =
      chunk.map((line) => valueAfterLabel(line, "Booking #:")).find(Boolean) ?? "";
    const custodyLine = chunk.find((line) => line.startsWith("Custody Status :")) ?? "";
    if (!displayName || /^\d[\d-]*$/.test(displayName) || !bookingNumber) {
      throw new Error("INVALID_RECORD_IDENTITY");
    }
    if (!custodyLine.includes("| IN CUSTODY")) continue;

    const chargesStart = chunk.findIndex((line) => line.startsWith("Charges:"));
    const statusStart = chunk.findIndex(
      (line, index) => index > chargesStart && line.startsWith("Status:")
    );
    const chargesText =
      chargesStart < 0
        ? ""
        : chunk
            .slice(chargesStart, statusStart < 0 ? chunk.length : statusStart)
            .map((line, index) => (index === 0 ? (valueAfterLabel(line, "Charges:") ?? "") : line))
            .filter(Boolean)
            .join(" ");
    const record = MowerRecordSchema.parse({
      displayName,
      bookingNumber,
      bookingDateText:
        chunk.map((line) => valueAfterLabel(line, "Date and Time of Booking :")).find(Boolean) ??
        null,
      charges: chargesText ? [chargesText] : []
    });
    const previous = recordsByBooking.get(bookingNumber);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) {
      throw new Error("CONFLICTING_DUPLICATE_BOOKING_NUMBER");
    }
    recordsByBooking.set(bookingNumber, record);
  }
  return MowerRosterSchema.parse({
    records: [...recordsByBooking.values()],
    sourceLastUpdatedText,
    validEmptyMarker
  });
}

async function requestRoster(
  options: MowerRosterAdapterOptions,
  context: AdapterContext
): Promise<MowerRoster> {
  if (context.source.sourceUrl !== MOWER_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(MOWER_COUNTY_CURRENT_SOURCE_URL, {
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
  return parseRosterLines(await (options.extractPdfLines ?? extractPdfLines)(bytes));
}

export function createMowerCountySourceAdapter(
  options: MowerRosterAdapterOptions
): SourceAdapter<MowerRoster, MowerRoster, MowerRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: MOWER_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: MOWER_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<MowerRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<MowerRoster>> {
      const result = MowerRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<MowerRoster>> {
      const result = MowerRosterSchema.safeParse(payload);
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
              evidence: "The official Mower County roster explicitly reported zero inmates."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
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
            sourceLabel: "Charges",
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
