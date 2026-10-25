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

export const WINONA_COUNTY_ADAPTER_KEY = "winona-county-mn-current-roster" as const;
export const WINONA_COUNTY_CURRENT_SOURCE_URL =
  "https://www.winonaco.com/Sheriff/Reports/Inmate_Roster_.pdf" as const;
export const WINONA_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_RESPONSE_BYTES = 3_000_000;
// The roster is reprinted every day; an older print means the county stopped updating it.
const MAX_PRINT_AGE_MS = 48 * 60 * 60 * 1_000;
// The print date has no time, and the county is on Central time; allow a full day either side.
const PRINT_DATE_ALLOWANCE_MS = 24 * 60 * 60 * 1_000;
// Names print at the left margin and charges in the middle column; allow small offsets.
const NAME_MAX_X = 60;
const CHARGE_MIN_X = 200;
const CHARGE_MAX_X = 260;
const BOND_MIN_X = 260;
const BOND_MAX_X = 320;

const PRINTED_ON = /^Printed on ([A-Z][a-z]+) (\d{1,2}), (\d{4})$/;
const TOTAL_RECORDS = /^Total Records: (\d+)$/;
const PAGE_NUMBER = /^Page \d+ of \d+$/;
// "609.222.1 - Assault-2nd Degree-Dangerous Weapon"
const CHARGE_LINE = /^(\d[0-9A-Za-z.()/-]*) - (\S.*)$/;
const BOND_TEXT = /^\$(\d+)\.(\d{2})$/;
const NAME = /^[A-Za-z][A-Za-z' .-]*, [A-Za-z][A-Za-z' .-]*$/;
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

const WinonaChargeSchema = z.object({
  statuteCode: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(1_000)
});
const WinonaRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  bondAmountMinor: z.number().int().nonnegative().max(100_000_000_000).nullable(),
  charges: z.array(WinonaChargeSchema).max(100)
});
const WinonaRosterSchema = z.object({
  records: z.array(WinonaRecordSchema).max(MAX_RECORDS),
  printedOnText: z.string().regex(PRINTED_ON),
  validEmptyMarker: z.boolean()
});

export type WinonaRoster = z.infer<typeof WinonaRosterSchema>;
export type WinonaRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type WinonaRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;
export type WinonaPdfTextItem = Readonly<{ text: string; x: number; y: number }>;
export type WinonaPdfPage = readonly WinonaPdfTextItem[];
export type WinonaRosterPdfExtractor = (bytes: Uint8Array) => Promise<readonly WinonaPdfPage[]>;

export interface WinonaRosterAdapterOptions {
  readonly fetch: WinonaRosterFetch;
  readonly facilityId: string;
  readonly createId: WinonaRosterIdFactory;
  readonly extractPdfPages?: WinonaRosterPdfExtractor;
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
      "The approved Winona County, Minnesota inmate roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `WINONA_COUNTY_${code}`.slice(0, 100)
  };
}

async function extractPdfPages(bytes: Uint8Array): Promise<readonly WinonaPdfPage[]> {
  const loadingTask = getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true
  });
  const document = await loadingTask.promise;
  const pages: WinonaPdfPage[] = [];
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

function bondMinor(text: string): number {
  const match = text.match(BOND_TEXT);
  if (!match) throw new Error("BOND_UNREADABLE");
  const amountMinor = Number(match[1]) * 100 + Number(match[2]);
  if (!Number.isSafeInteger(amountMinor)) throw new Error("BOND_UNREADABLE");
  return amountMinor;
}

type RecordDraft = {
  displayName: string;
  arrestTime: string;
  bondAmountMinor: number | null;
  inCharges: boolean;
  charges: { statuteCode: string; description: string }[];
};

/**
 * Reads the printed roster: one block per person with the name at the left margin, the hold
 * details beside it, and the charges listed below. Ages, agencies, hold reasons, court dates,
 * days in custody, and mugshot dates are read past and never kept.
 */
export function parseWinonaRosterPages(pages: readonly WinonaPdfPage[]): WinonaRoster {
  const first = pages[0] ?? [];
  if (
    !first.some((item) => item.text === "Winona County Sheriff's Office") ||
    !first.some((item) => item.text === "Inmate Roster")
  ) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const printedOnText = first.find((item) => PRINTED_ON.test(item.text))?.text;
  if (!printedOnText) throw new Error("PRINT_DATE_MISSING");

  // Reading order: page by page, top to bottom, then left to right.
  const items = pages.flatMap((page) =>
    [...page].sort((a, b) => b.y - a.y || a.x - b.x).filter((item) => !PAGE_NUMBER.test(item.text))
  );

  const drafts: RecordDraft[] = [];
  let total: number | null = null;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;
    const totalMatch = item.text.match(TOTAL_RECORDS);
    if (totalMatch) {
      total = Number(totalMatch[1]);
      continue;
    }
    const next = items[index + 1];
    if (item.x <= NAME_MAX_X && next?.text.startsWith("Arrest Time:")) {
      if (!NAME.test(item.text)) throw new Error("NAME_UNREADABLE");
      drafts.push({
        displayName: item.text,
        arrestTime: normalizeText(next.text.slice("Arrest Time:".length)),
        bondAmountMinor: null,
        inCharges: false,
        charges: []
      });
      continue;
    }
    const current = drafts.at(-1);
    if (!current) continue;
    if (item.text === "Bond/Bail:") {
      const amount =
        next && next.y === item.y && next.x >= BOND_MIN_X && next.x <= BOND_MAX_X ? next : null;
      if (amount) current.bondAmountMinor = bondMinor(amount.text);
      continue;
    }
    if (item.text === "Charges (Listed Below):") {
      current.inCharges = true;
      continue;
    }
    if (current.inCharges && item.x >= CHARGE_MIN_X && item.x <= CHARGE_MAX_X) {
      const charge = item.text.match(CHARGE_LINE);
      if (charge) {
        current.charges.push({ statuteCode: charge[1]!, description: charge[2]! });
        continue;
      }
      // A long charge wraps onto a line without a statute; it continues the charge above.
      const previous = current.charges.at(-1);
      if (!previous) throw new Error("CHARGE_UNREADABLE");
      previous.description = `${previous.description} ${item.text}`;
    }
  }

  if (total === null) throw new Error("ROSTER_TOTAL_MISSING");
  if (drafts.length !== total) throw new Error("ROSTER_TOTAL_MISMATCH");
  const records = drafts.map((draft) => {
    if (!draft.inCharges) throw new Error("CHARGES_SECTION_MISSING");
    return {
      recordKey: `${draft.displayName}|${draft.arrestTime}`,
      displayName: draft.displayName,
      bondAmountMinor: draft.bondAmountMinor,
      charges: draft.charges
    };
  });
  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_ROSTER_ENTRY");
  }
  // The county jail is never empty; a print without people means the report broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return WinonaRosterSchema.parse({ records, printedOnText, validEmptyMarker: false });
}

async function requestRoster(
  options: WinonaRosterAdapterOptions,
  context: AdapterContext
): Promise<WinonaRoster> {
  if (context.source.sourceUrl !== WINONA_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(WINONA_COUNTY_CURRENT_SOURCE_URL, {
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
  const roster = parseWinonaRosterPages(await (options.extractPdfPages ?? extractPdfPages)(bytes));
  const ageMs = Date.parse(context.requestedAt) - printedOnMs(roster.printedOnText);
  if (ageMs > MAX_PRINT_AGE_MS + PRINT_DATE_ALLOWANCE_MS) throw new Error("SOURCE_REPORT_STALE");
  return roster;
}

export function createWinonaCountySourceAdapter(
  options: WinonaRosterAdapterOptions
): SourceAdapter<WinonaRoster, WinonaRoster, WinonaRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: WINONA_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: WINONA_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<WinonaRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<WinonaRoster>> {
      const result = WinonaRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<WinonaRoster>> {
      const result = WinonaRosterSchema.safeParse(payload);
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
              evidence: "The official Winona County inmate roster listed no one."
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
          const bondEntries: BondEntry[] =
            record.bondAmountMinor === null
              ? []
              : [
                  {
                    id: options.createId("bond", `${bookingId}|${record.bondAmountMinor}`),
                    bookingId,
                    sequence: 0,
                    sourceLabel: "Bond/Bail",
                    note:
                      record.bondAmountMinor === 0
                        ? "The source displays $0.00; this is not interpreted as no bond."
                        : null,
                    state: "monetary",
                    amountMinor: record.bondAmountMinor,
                    currency: "USD"
                  }
                ];
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
