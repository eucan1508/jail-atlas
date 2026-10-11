import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
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

export const SHERBURNE_COUNTY_ADAPTER_KEY = "sherburne-county-mn-current-roster" as const;
export const SHERBURNE_COUNTY_CURRENT_SOURCE_URL =
  "https://inmatelocatorext.co.sherburne.mn.us/InmateLocatorAPI/api/Inmates/search" as const;
export const SHERBURNE_COUNTY_PARSER_VERSION = "1.0.0" as const;

const API_BASE = "https://inmatelocatorext.co.sherburne.mn.us/InmateLocatorAPI/api/Inmates/";
const MAX_RECORDS = 2_000;
const PAGE_SIZE = 200;
const MAX_CRAWL_ATTEMPTS = 3;
// Detail requests run a few at a time; the jail holds several hundred people.
const DETAIL_CONCURRENCY = 4;

const SherburneChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const SherburneRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/),
  charges: z.array(SherburneChargeSchema).max(100)
});
const SherburneRosterSchema = z.object({
  records: z.array(SherburneRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

// Only the fields this adapter reads are declared; the responses also carry date of birth, SPN,
// physical description, bail, and court details, which are ignored and never stored.
const ListResponseSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  data: z.array(z.object({ bookingNo: z.string(), fullName: z.string() }))
});
const DetailResponseSchema = z.object({
  bookingNo: z.string(),
  fullName: z.string(),
  releaseDate: z.string().nullable(),
  charges: z.array(z.object({ charge: z.string().nullable(), chargeDesc: z.string().nullable() }))
});

export type SherburneRoster = z.infer<typeof SherburneRosterSchema>;
export type SherburneRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type SherburneRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface SherburneRosterAdapterOptions {
  readonly fetch: SherburneRosterFetch;
  readonly facilityId: string;
  readonly createId: SherburneRosterIdFactory;
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
    publicMessage: "The approved Sherburne County inmate search could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `SHERBURNE_COUNTY_${code}`.slice(0, 100)
  };
}

async function request(
  options: SherburneRosterAdapterOptions,
  context: AdapterContext,
  url: string
): Promise<Response> {
  return options.fetch(url, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/json", "accept-encoding": "identity" }
  });
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

async function listBookings(
  options: SherburneRosterAdapterOptions,
  context: AdapterContext
): Promise<z.infer<typeof ListResponseSchema>["data"]> {
  const rows: z.infer<typeof ListResponseSchema>["data"] = [];
  let total: number | null = null;
  for (let page = 1; page <= Math.ceil(MAX_RECORDS / PAGE_SIZE); page += 1) {
    const parsed = ListResponseSchema.safeParse(
      await readJson(
        await request(options, context, `${API_BASE}search?page=${page}&pageSize=${PAGE_SIZE}`)
      )
    );
    if (!parsed.success || parsed.data.page !== page) throw new Error("LIST_STRUCTURE_CHANGED");
    if (total !== null && parsed.data.total !== total) {
      throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    }
    total = parsed.data.total;
    rows.push(...parsed.data.data);
    if (rows.length >= total || parsed.data.data.length === 0) break;
  }
  if (total === null || total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  if (rows.length !== total) throw new Error("RECORD_COUNT_MISMATCH");
  const ids = rows.map((row) => normalizeText(row.bookingNo));
  if (new Set(ids).size !== ids.length) throw new Error("DUPLICATE_BOOKING_NUMBER");
  return rows;
}

async function readDetail(
  options: SherburneRosterAdapterOptions,
  context: AdapterContext,
  row: z.infer<typeof ListResponseSchema>["data"][number]
): Promise<z.infer<typeof SherburneRecordSchema>> {
  const bookingNumber = normalizeText(row.bookingNo);
  const response = await request(
    options,
    context,
    `${API_BASE}${encodeURIComponent(bookingNumber)}`
  );
  // A booking released between the list and its detail request is no longer found.
  if (response.status === 404) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  const detail = DetailResponseSchema.safeParse(await readJson(response));
  if (!detail.success) throw new Error("DETAIL_STRUCTURE_CHANGED");
  if (normalizeText(detail.data.releaseDate) !== "") throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  const displayName = normalizeText(row.fullName);
  if (
    normalizeText(detail.data.bookingNo) !== bookingNumber ||
    normalizeText(detail.data.fullName).toUpperCase() !== displayName.toUpperCase()
  ) {
    throw new Error("INVALID_RECORD_IDENTITY");
  }
  return SherburneRecordSchema.parse({
    displayName,
    bookingNumber,
    charges: detail.data.charges.map((charge) => {
      const statuteCode = normalizeText(charge.charge) || null;
      const description = normalizeText(charge.chargeDesc) || statuteCode;
      if (!description) throw new Error("EMPTY_CHARGE");
      return { description, statuteCode };
    })
  });
}

async function crawlRoster(
  options: SherburneRosterAdapterOptions,
  context: AdapterContext
): Promise<SherburneRoster> {
  const rows = await listBookings(options, context);
  const records = new Array<z.infer<typeof SherburneRecordSchema>>(rows.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, rows.length) }, async () => {
      while (next < rows.length) {
        const index = next;
        next += 1;
        records[index] = await readDetail(options, context, rows[index]!);
      }
    })
  );

  // The list must be unchanged once every detail has been read, or someone may be missing.
  const after = await listBookings(options, context);
  const listed = new Set(rows.map((row) => normalizeText(row.bookingNo)));
  if (
    after.length !== rows.length ||
    after.some((row) => !listed.has(normalizeText(row.bookingNo)))
  ) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  // The jail is never empty; an empty list means the search broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return SherburneRosterSchema.parse({ records, validEmptyMarker: false });
}

/** A single small list request; the full crawl already runs once per refresh. */
async function checkListEndpoint(
  options: SherburneRosterAdapterOptions,
  context: AdapterContext
): Promise<void> {
  const parsed = ListResponseSchema.safeParse(
    await readJson(await request(options, context, `${API_BASE}search?page=1&pageSize=1`))
  );
  if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
}

async function requestRoster(
  options: SherburneRosterAdapterOptions,
  context: AdapterContext
): Promise<SherburneRoster> {
  if (context.source.sourceUrl !== SHERBURNE_COUNTY_CURRENT_SOURCE_URL) {
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

export function createSherburneCountySourceAdapter(
  options: SherburneRosterAdapterOptions
): SourceAdapter<SherburneRoster, SherburneRoster, SherburneRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: SHERBURNE_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: SHERBURNE_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<SherburneRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<SherburneRoster>> {
      const result = SherburneRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<SherburneRoster>> {
      const result = SherburneRosterSchema.safeParse(payload);
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
                "The official Sherburne County inmate search reported zero people in custody."
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
