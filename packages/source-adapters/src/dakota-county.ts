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

export const DAKOTA_COUNTY_ADAPTER_KEY = "dakota-county-mn-current-roster" as const;
export const DAKOTA_COUNTY_CURRENT_SOURCE_URL =
  "https://dakotacountymn.gov/content/mndakotacountywebsite/api/search.json?method=JailInmateSearch" as const;
export const DAKOTA_COUNTY_PARSER_VERSION = "1.0.0" as const;

const DETAIL_URL =
  "https://dakotacountymn.gov/content/mndakotacountywebsite/api/search.json?method=JailInmateDetails&bookingNumber=";
const MAX_RECORDS = 2_000;
const MAX_CRAWL_ATTEMPTS = 3;
// Detail requests run a few at a time; the jail holds over a hundred people.
const DETAIL_CONCURRENCY = 4;
// A statute closes the charge text in braces: "Murder - 2nd Degree ... - FE {609.19.1(1)}".
const TRAILING_STATUTE = /^(.*\S)\s*\{([^{}]+)\}$/;

const DakotaChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const DakotaRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z
    .string()
    .trim()
    .regex(/^\d{5,12}$/),
  charges: z.array(DakotaChargeSchema).max(100)
});
const DakotaRosterSchema = z.object({
  records: z.array(DakotaRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

// The service converts XML to JSON, so a list with one entry arrives as a single object.
function oneOrMany<T extends z.ZodTypeAny>(item: T) {
  return z
    .union([z.array(item), item])
    .transform((value): z.infer<T>[] => (Array.isArray(value) ? value : [value]));
}

// Only the fields this adapter reads are declared; the responses also carry date of birth, sex,
// race, arrest address and agency, and court dates, which are ignored and never stored.
const ListEntrySchema = z.object({
  In_Jail: z.string(),
  Booking_Number: z.string(),
  Last_Comma_First: z.string()
});
const ListResponseSchema = z.object({
  status: z.literal("SUCCESS"),
  result: z.object({ Bookings: oneOrMany(ListEntrySchema).optional() })
});
const DetailChargeSchema = z.object({
  ChargeDescription: z.string(),
  ClearanceReason: z.string()
});
const DetailResponseSchema = z.object({
  status: z.literal("SUCCESS"),
  result: z.object({
    Bookings: oneOrMany(
      z.object({
        In_Jail: z.string(),
        Booking_Number: z.string(),
        Last_Comma_First: z.string(),
        colCharges: z
          .union([z.object({ Charges: oneOrMany(DetailChargeSchema).optional() }), z.literal("")])
          .optional()
      })
    ).optional()
  })
});

type ListEntry = Readonly<{ bookingNumber: string; displayName: string }>;

export type DakotaRoster = z.infer<typeof DakotaRosterSchema>;
export type DakotaRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type DakotaRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface DakotaRosterAdapterOptions {
  readonly fetch: DakotaRosterFetch;
  readonly facilityId: string;
  readonly createId: DakotaRosterIdFactory;
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
    publicMessage: "The approved Dakota County jail inmate search could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `DAKOTA_COUNTY_${code}`.slice(0, 100)
  };
}

async function request(
  options: DakotaRosterAdapterOptions,
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
  options: DakotaRosterAdapterOptions,
  context: AdapterContext
): Promise<ListEntry[]> {
  const parsed = ListResponseSchema.safeParse(
    await readJson(await request(options, context, DAKOTA_COUNTY_CURRENT_SOURCE_URL))
  );
  if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
  const entries = parsed.data.result.Bookings ?? [];
  if (entries.length > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  // The search returns current bookings only; anything else means its meaning changed.
  if (entries.some((entry) => entry.In_Jail !== "True")) throw new Error("LIST_SCOPE_CHANGED");
  const rows = entries.map((entry) => ({
    bookingNumber: normalizeText(entry.Booking_Number),
    displayName: normalizeText(entry.Last_Comma_First)
  }));
  const ids = rows.map((row) => row.bookingNumber);
  if (new Set(ids).size !== ids.length) throw new Error("DUPLICATE_BOOKING_NUMBER");
  return rows;
}

function readCharge(text: string): z.infer<typeof DakotaChargeSchema> {
  const normalized = normalizeText(text);
  if (!normalized) throw new Error("EMPTY_CHARGE");
  const match = normalized.match(TRAILING_STATUTE);
  return match
    ? { description: match[1]!, statuteCode: normalizeText(match[2]) || null }
    : { description: normalized, statuteCode: null };
}

async function readDetail(
  options: DakotaRosterAdapterOptions,
  context: AdapterContext,
  row: ListEntry
): Promise<z.infer<typeof DakotaRecordSchema>> {
  const response = await request(
    options,
    context,
    `${DETAIL_URL}${encodeURIComponent(row.bookingNumber)}`
  );
  if (response.status === 404) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  const detail = DetailResponseSchema.safeParse(await readJson(response));
  if (!detail.success) throw new Error("DETAIL_STRUCTURE_CHANGED");
  const bookings = detail.data.result.Bookings ?? [];
  // A booking released between the list and its detail request is no longer in jail.
  if (bookings.length !== 1 || bookings[0]!.In_Jail !== "True") {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }
  const booking = bookings[0]!;
  if (
    normalizeText(booking.Booking_Number) !== row.bookingNumber ||
    normalizeText(booking.Last_Comma_First).toUpperCase() !== row.displayName.toUpperCase()
  ) {
    throw new Error("INVALID_RECORD_IDENTITY");
  }
  const charges = (booking.colCharges ? (booking.colCharges.Charges ?? []) : [])
    // A charge with a clearance reason (dismissed, released by a judge, sentence served) is
    // closed; only open charges are kept.
    .filter((charge) => normalizeText(charge.ClearanceReason) === "")
    .map((charge) => readCharge(charge.ChargeDescription));
  return DakotaRecordSchema.parse({
    displayName: row.displayName,
    bookingNumber: row.bookingNumber,
    charges
  });
}

async function crawlRoster(
  options: DakotaRosterAdapterOptions,
  context: AdapterContext
): Promise<DakotaRoster> {
  const rows = await listBookings(options, context);
  const records = new Array<z.infer<typeof DakotaRecordSchema>>(rows.length);
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
  const listed = new Set(rows.map((row) => row.bookingNumber));
  if (after.length !== rows.length || after.some((row) => !listed.has(row.bookingNumber))) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  // The county jail is never empty; an empty list means the search broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return DakotaRosterSchema.parse({ records, validEmptyMarker: false });
}

/** One list request; the full crawl already runs once per refresh. */
async function checkListEndpoint(
  options: DakotaRosterAdapterOptions,
  context: AdapterContext
): Promise<void> {
  await listBookings(options, context);
}

async function requestRoster(
  options: DakotaRosterAdapterOptions,
  context: AdapterContext
): Promise<DakotaRoster> {
  if (context.source.sourceUrl !== DAKOTA_COUNTY_CURRENT_SOURCE_URL) {
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

export function createDakotaCountySourceAdapter(
  options: DakotaRosterAdapterOptions
): SourceAdapter<DakotaRoster, DakotaRoster, DakotaRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: DAKOTA_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: DAKOTA_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<DakotaRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<DakotaRoster>> {
      const result = DakotaRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<DakotaRoster>> {
      const result = DakotaRosterSchema.safeParse(payload);
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
                "The official Dakota County jail inmate search reported zero people in custody."
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
              sourceLabel: "Booking Number",
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
