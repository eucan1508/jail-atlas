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
import { assertFewWithoutCharges } from "./charge-gaps.js";

export const CANADIAN_COUNTY_ADAPTER_KEY = "canadian-county-ok-current-roster" as const;
export const CANADIAN_COUNTY_CURRENT_SOURCE_URL =
  "https://ccsheriff.net/dmxConnect/api/Booking/Read.php" as const;
export const CANADIAN_COUNTY_PARSER_VERSION = "1.0.0" as const;

const API_BASE = "https://ccsheriff.net/dmxConnect/api/Booking/";
const MAX_RECORDS = 1_000;
const PAGE_LIMIT = 200;
const MAX_CRAWL_ATTEMPTS = 3;

const CanadianChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.null()
});
const CanadianRecordSchema = z.object({
  bookingId: z.string().trim().min(1).max(20),
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/),
  // True when the jail printed this booking number on more than one booking.
  bookingNumberShared: z.boolean(),
  charges: z.array(CanadianChargeSchema).max(100)
});
const CanadianRosterSchema = z.object({
  records: z.array(CanadianRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

// Only the fields this adapter reads are declared; everything else in the response (date of
// birth, home address, photo name, and so on) is ignored and never stored.
const ListResponseSchema = z.object({
  bookings: z.object({
    total: z.number().int().min(0),
    data: z.array(
      z.object({
        BookingID: z.string(),
        LName: z.string(),
        FName: z.string()
      })
    )
  })
});
const IdListResponseSchema = z.object({
  query: z.array(z.object({ BookingID: z.string() }))
});
const DetailResponseSchema = z.object({
  bookie: z.array(
    z.object({
      BookingID: z.string(),
      BookingNum: z.string(),
      LName: z.string(),
      FName: z.string(),
      ReleaseDate: z.string().nullable(),
      Charges: z.string().nullable()
    })
  )
});

export type CanadianRoster = z.infer<typeof CanadianRosterSchema>;
export type CanadianRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type CanadianRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface CanadianRosterAdapterOptions {
  readonly fetch: CanadianRosterFetch;
  readonly facilityId: string;
  readonly createId: CanadianRosterIdFactory;
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
    publicMessage: "The approved Canadian County inmate search could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `CANADIAN_COUNTY_${code}`.slice(0, 100)
  };
}

function displayName(lastName: string, firstName: string): string {
  const last = normalizeText(lastName);
  const first = normalizeText(firstName);
  return first ? `${last}, ${first}` : last;
}

/** Charges arrive as one HTML string, each charge after the first opening with a bullet. */
export function parseCanadianCharges(fragment: string | null): string[] {
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
  options: CanadianRosterAdapterOptions,
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

async function listBookings(options: CanadianRosterAdapterOptions, context: AdapterContext) {
  const rows: z.infer<typeof ListResponseSchema>["bookings"]["data"] = [];
  let total: number | null = null;
  for (let offset = 0; offset < MAX_RECORDS; offset += PAGE_LIMIT) {
    const parsed = ListResponseSchema.safeParse(
      await getJson(options, context, `${API_BASE}Read.php?limit=${PAGE_LIMIT}&offset=${offset}`)
    );
    if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
    if (total !== null && parsed.data.bookings.total !== total) {
      throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    }
    total = parsed.data.bookings.total;
    rows.push(...parsed.data.bookings.data);
    if (rows.length >= total || parsed.data.bookings.data.length === 0) break;
  }
  if (total === null || total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  if (rows.length !== total) throw new Error("RECORD_COUNT_MISMATCH");
  return rows;
}

async function crawlRoster(
  options: CanadianRosterAdapterOptions,
  context: AdapterContext
): Promise<CanadianRoster> {
  const rows = await listBookings(options, context);
  const ids = rows.map((row) => normalizeText(row.BookingID));
  if (new Set(ids).size !== ids.length) throw new Error("DUPLICATE_BOOKING_ID");

  // The site keeps a second, independent list of every booking in custody; both must agree.
  const idList = IdListResponseSchema.safeParse(
    await getJson(options, context, `${API_BASE}Read2.php`)
  );
  if (!idList.success) throw new Error("ID_LIST_STRUCTURE_CHANGED");
  const confirmed = new Set(idList.data.query.map((row) => normalizeText(row.BookingID)));
  if (confirmed.size !== ids.length || ids.some((id) => !confirmed.has(id))) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  const records: z.infer<typeof CanadianRecordSchema>[] = [];
  for (const row of rows) {
    const bookingId = normalizeText(row.BookingID);
    const detail = DetailResponseSchema.safeParse(
      await getJson(
        options,
        context,
        `${API_BASE}getbookie.php?bookingid=${encodeURIComponent(bookingId)}`
      )
    );
    if (!detail.success || detail.data.bookie.length > 1) {
      throw new Error("DETAIL_STRUCTURE_CHANGED");
    }
    const inmate = detail.data.bookie[0];
    // A booking released between the list and its detail request comes back empty or with a
    // release date.
    if (!inmate || normalizeText(inmate.ReleaseDate ?? "") !== "") {
      throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    }
    // The detail carries the jail's booking number; the list's BookingID is an internal key.
    const bookingNumber = normalizeText(inmate.BookingNum);
    const name = displayName(row.LName, row.FName);
    if (
      normalizeText(inmate.BookingID) !== bookingId ||
      displayName(inmate.LName, inmate.FName).toUpperCase() !== name.toUpperCase()
    ) {
      throw new Error("INVALID_RECORD_IDENTITY");
    }
    records.push(
      CanadianRecordSchema.parse({
        bookingId,
        displayName: name,
        bookingNumber,
        bookingNumberShared: false,
        charges: parseCanadianCharges(inmate.Charges).map((description) => ({
          description,
          statuteCode: null
        }))
      })
    );
  }

  // Should the jail print one booking number on two bookings, both people are kept, but neither
  // is shown with a number that may not be theirs.
  const numberCounts = new Map<string, number>();
  for (const record of records) {
    numberCounts.set(record.bookingNumber, (numberCounts.get(record.bookingNumber) ?? 0) + 1);
  }
  for (const record of records) {
    record.bookingNumberShared = (numberCounts.get(record.bookingNumber) ?? 0) > 1;
  }

  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  // The jail is never empty; an empty list means the search broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return CanadianRosterSchema.parse({ records, validEmptyMarker: false });
}

/** A single small list request; the full crawl already runs once per refresh. */
async function checkListEndpoint(
  options: CanadianRosterAdapterOptions,
  context: AdapterContext
): Promise<void> {
  const parsed = ListResponseSchema.safeParse(
    await getJson(options, context, `${API_BASE}Read.php?limit=1&offset=0`)
  );
  if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
}

async function requestRoster(
  options: CanadianRosterAdapterOptions,
  context: AdapterContext
): Promise<CanadianRoster> {
  if (context.source.sourceUrl !== CANADIAN_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  // Bookings and releases can land while the details are being read; start over when they do.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(options, context);
    } catch (error) {
      const changed = error instanceof Error && error.message === "ROSTER_CHANGED_DURING_CRAWL";
      if (!changed || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

export function createCanadianCountySourceAdapter(
  options: CanadianRosterAdapterOptions
): SourceAdapter<CanadianRoster, CanadianRoster, CanadianRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: CANADIAN_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: CANADIAN_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<CanadianRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<CanadianRoster>> {
      const result = CanadianRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<CanadianRoster>> {
      const result = CanadianRosterSchema.safeParse(payload);
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
                "The official Canadian County inmate search reported zero people in custody."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.bookingId);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId("charge", `${record.bookingId}|${sequence}|${charge.description}`),
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
              id: options.createId("person", `${record.bookingId}|${record.displayName}`),
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
