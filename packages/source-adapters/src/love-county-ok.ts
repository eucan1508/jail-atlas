import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
import { load } from "cheerio/slim";
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

export const LOVE_COUNTY_ADAPTER_KEY = "love-county-ok-current-roster" as const;
export const LOVE_COUNTY_CURRENT_SOURCE_URL =
  "https://www.lovecosheriff.com/dmxConnect/api/Booking/Read.php" as const;
export const LOVE_COUNTY_PARSER_VERSION = "1.0.0" as const;

const API_BASE = "https://www.lovecosheriff.com/dmxConnect/api/Booking/";
const MAX_RECORDS = 1_000;
const PAGE_LIMIT = 200;
const MAX_CRAWL_ATTEMPTS = 3;

const LoveChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.null()
});
const LoveRecordSchema = z.object({
  inmateId: z.string().trim().min(1).max(50),
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z
    .string()
    .trim()
    .regex(/^\d{2}-\d{4,6}$/),
  // True when the jail printed this booking number for more than one person.
  bookingNumberShared: z.boolean(),
  charges: z.array(LoveChargeSchema).max(100)
});
const LoveRosterSchema = z.object({
  records: z.array(LoveRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

// Only the fields this adapter reads are declared; the response also carries date of birth,
// home address, photo file name, and other details that are ignored and never stored.
const ListResponseSchema = z.object({
  querybookings: z.object({
    total: z.number().int().min(0),
    data: z.array(
      z.object({
        InmateID: z.string(),
        BookingNum: z.string(),
        FullName: z.string(),
        ReleaseDate: z.string().nullable(),
        Charges: z.string().nullable()
      })
    )
  })
});
const IdListResponseSchema = z.object({
  query: z.array(z.object({ InmateID: z.string() }))
});

export type LoveRoster = z.infer<typeof LoveRosterSchema>;
export type LoveRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type LoveRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface LoveRosterAdapterOptions {
  readonly fetch: LoveRosterFetch;
  readonly facilityId: string;
  readonly createId: LoveRosterIdFactory;
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
      "The approved Love County, Oklahoma inmate search could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `LOVE_COUNTY_${code}`.slice(0, 100)
  };
}

/** Charges arrive as one HTML string, each charge after the first opening with a bullet. */
export function parseLoveCharges(fragment: string | null): string[] {
  if (!fragment || !normalizeText(fragment)) return [];
  const $ = load(`<div>${fragment.replace(/<br\s*\/?>/gi, "\n")}</div>`);
  return $("div")
    .first()
    .text()
    .split("\n")
    .map((line) => normalizeText(line.replace(/^\s*\u2022/, "")))
    .filter(Boolean);
}

async function getJson(
  options: LoveRosterAdapterOptions,
  context: AdapterContext,
  url: string
): Promise<unknown> {
  const response = await options.fetch(url, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/json", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

async function crawlRoster(
  options: LoveRosterAdapterOptions,
  context: AdapterContext
): Promise<LoveRoster> {
  const rows: z.infer<typeof ListResponseSchema>["querybookings"]["data"] = [];
  let total: number | null = null;
  for (let offset = 0; offset < MAX_RECORDS; offset += PAGE_LIMIT) {
    const parsed = ListResponseSchema.safeParse(
      await getJson(options, context, `${API_BASE}Read.php?limit=${PAGE_LIMIT}&offset=${offset}`)
    );
    if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
    if (total !== null && parsed.data.querybookings.total !== total) {
      throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    }
    total = parsed.data.querybookings.total;
    rows.push(...parsed.data.querybookings.data);
    if (rows.length >= total || parsed.data.querybookings.data.length === 0) break;
  }
  if (total === null || total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  if (rows.length !== total) throw new Error("RECORD_COUNT_MISMATCH");
  // The search lists only people in custody; a release date means the list is not what it was.
  if (rows.some((row) => normalizeText(row.ReleaseDate ?? "") !== "")) {
    throw new Error("RELEASED_BOOKING_LISTED");
  }

  // The site keeps a second, independent list of everyone in custody; both must agree.
  const idList = IdListResponseSchema.safeParse(
    await getJson(options, context, `${API_BASE}Read2.php`)
  );
  if (!idList.success) throw new Error("ID_LIST_STRUCTURE_CHANGED");
  const listed = rows.map((row) => normalizeText(row.InmateID));
  const confirmed = new Set(idList.data.query.map((row) => normalizeText(row.InmateID)));
  if (confirmed.size !== listed.length || listed.some((id) => !confirmed.has(id))) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  if (new Set(listed).size !== listed.length) throw new Error("DUPLICATE_INMATE_ID");
  // The jail now and then prints one booking number for two different people. Both are still
  // held, so both are kept, but neither is shown with a booking number that may not be theirs.
  const bookingNumberCounts = new Map<string, number>();
  for (const row of rows) {
    const bookingNumber = normalizeText(row.BookingNum);
    bookingNumberCounts.set(bookingNumber, (bookingNumberCounts.get(bookingNumber) ?? 0) + 1);
  }
  const records = rows.map((row) => {
    const inmateId = normalizeText(row.InmateID);
    const bookingNumber = normalizeText(row.BookingNum);
    const displayName = normalizeText(row.FullName);
    if (!displayName || !bookingNumber) throw new Error("INVALID_RECORD_IDENTITY");
    return LoveRecordSchema.parse({
      inmateId,
      displayName,
      bookingNumber,
      bookingNumberShared: (bookingNumberCounts.get(bookingNumber) ?? 0) > 1,
      charges: parseLoveCharges(row.Charges).map((description) => ({
        description,
        statuteCode: null
      }))
    });
  });

  // The jail is never empty; an empty list means the search broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return LoveRosterSchema.parse({ records, validEmptyMarker: false });
}

/** A single small list request; the full crawl already runs once per refresh. */
async function checkListEndpoint(
  options: LoveRosterAdapterOptions,
  context: AdapterContext
): Promise<void> {
  const parsed = ListResponseSchema.safeParse(
    await getJson(options, context, `${API_BASE}Read.php?limit=1&offset=0`)
  );
  if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
}

async function requestRoster(
  options: LoveRosterAdapterOptions,
  context: AdapterContext
): Promise<LoveRoster> {
  if (context.source.sourceUrl !== LOVE_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  // A booking or release can land between the two list requests; start over when it does.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(options, context);
    } catch (error) {
      const changed = error instanceof Error && error.message === "ROSTER_CHANGED_DURING_CRAWL";
      if (!changed || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

export function createLoveCountySourceAdapter(
  options: LoveRosterAdapterOptions
): SourceAdapter<LoveRoster, LoveRoster, LoveRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: LOVE_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: LOVE_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<LoveRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<LoveRoster>> {
      const result = LoveRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<LoveRoster>> {
      const result = LoveRosterSchema.safeParse(payload);
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
                "The official Love County, Oklahoma inmate search reported zero people in custody."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const recordKey = `${record.inmateId}|${record.bookingNumber}`;
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
              id: options.createId("person", `${recordKey}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            bookingIdentifier: record.bookingNumberShared
              ? null
              : {
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
        await checkListEndpoint(options, context);
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
