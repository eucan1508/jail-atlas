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

export const HENNEPIN_COUNTY_ADAPTER_KEY = "hennepin-county-mn-current-roster" as const;
export const HENNEPIN_COUNTY_API_BASE_URL =
  "https://api.hennepincounty.gov/hcso-public-services-api/v1" as const;
export const HENNEPIN_COUNTY_CURRENT_SOURCE_URL =
  `${HENNEPIN_COUNTY_API_BASE_URL}/JailRoster/Search` as const;
/** The public Jail Roster site's settings, which carry the API key the site itself sends. */
export const HENNEPIN_COUNTY_ROSTER_CONFIG_URL =
  "https://jailroster.hennepin.us/config.json" as const;
export const HENNEPIN_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 3_000;
const MAX_CRAWL_ATTEMPTS = 3;
// Detail requests run a few at a time; the jail holds several hundred people.
const DETAIL_CONCURRENCY = 4;
const IN_CUSTODY = 1;
// The jail is split across these two buildings; people housed anywhere else are not kept.
const JAIL_LOCATIONS = new Set(["Public Safety Facility", "City Hall"]);

const ConfigSchema = z.object({
  serverBaseUrl: z.literal(HENNEPIN_COUNTY_API_BASE_URL),
  serverSubscriptionKey: z.string().regex(/^[0-9a-f]{32}$/)
});

// Only the fields this adapter reads are declared; the responses also carry ages, arresting
// agencies, received and release times, case numbers, bail options, and court dates, which are
// ignored and never stored.
const ListEntrySchema = z.object({
  incarcerationId: z.number().int().positive(),
  bookingNumber: z.string(),
  fullName: z.string(),
  custodyStatus: z.number().int()
});
const ListResponseSchema = z.object({
  data: z.array(ListEntrySchema),
  pagination: z.object({
    totalRecords: z.number().int().nonnegative(),
    totalPages: z.number().nonnegative()
  })
});
const DetailChargeSchema = z.object({
  description: z.string().nullable(),
  statute: z.string().nullable()
});
const DetailResponseSchema = ListEntrySchema.extend({
  housingLocationFacility: z.string().nullable(),
  cases: z.array(
    z.object({
      clearReason: z.string().nullable(),
      charges: z.array(DetailChargeSchema)
    })
  )
});

const HennepinChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const HennepinRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z.string().regex(/^\d{6,14}$/),
  charges: z.array(HennepinChargeSchema).max(200)
});
const HennepinRosterSchema = z.object({
  records: z.array(HennepinRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type HennepinRoster = z.infer<typeof HennepinRosterSchema>;
export type HennepinRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type HennepinRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface HennepinRosterAdapterOptions {
  readonly fetch: HennepinRosterFetch;
  readonly facilityId: string;
  readonly createId: HennepinRosterIdFactory;
  readonly nowMs?: () => number;
}

type ListEntry = Readonly<{ incarcerationId: number; bookingNumber: string; displayName: string }>;
type HennepinRecord = z.infer<typeof HennepinRecordSchema>;

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
    publicMessage:
      "The approved Hennepin County, Minnesota jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `HENNEPIN_COUNTY_${code}`.slice(0, 100)
  };
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error("RESPONSE_NOT_JSON");
  }
}

function request(
  options: HennepinRosterAdapterOptions,
  context: AdapterContext,
  url: string,
  body?: unknown
): Promise<Response> {
  return options.fetch(url, {
    method: body === undefined ? "GET" : "POST",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "application/json", "accept-encoding": "identity" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

/** Reads the key from the roster site on every run, so a rotated key is picked up. */
async function apiKey(
  options: HennepinRosterAdapterOptions,
  context: AdapterContext
): Promise<string> {
  const config = ConfigSchema.safeParse(
    await readJson(await request(options, context, HENNEPIN_COUNTY_ROSTER_CONFIG_URL))
  );
  if (!config.success) throw new Error("CONFIG_CHANGED");
  return config.data.serverSubscriptionKey;
}

async function listInCustody(
  options: HennepinRosterAdapterOptions,
  context: AdapterContext,
  key: string
): Promise<ListEntry[]> {
  const parsed = ListResponseSchema.safeParse(
    await readJson(
      await request(
        options,
        context,
        `${HENNEPIN_COUNTY_CURRENT_SOURCE_URL}?subscription-key=${key}`,
        {
          fullName: null,
          arrestedBy: null,
          custodyStatus: IN_CUSTODY,
          receivedDate: null,
          releasedDate: null,
          pagination: { activePage: 1, pageSize: MAX_RECORDS },
          sort: null
        }
      )
    )
  );
  if (!parsed.success) throw new Error("LIST_STRUCTURE_CHANGED");
  const { data, pagination } = parsed.data;
  if (pagination.totalRecords > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  // The whole in-custody list must come back on one page.
  if (data.length !== pagination.totalRecords || pagination.totalPages > 1) {
    throw new Error("LIST_INCOMPLETE");
  }
  if (data.some((entry) => entry.custodyStatus !== IN_CUSTODY))
    throw new Error("LIST_SCOPE_CHANGED");
  const entries = data.map((entry) => ({
    incarcerationId: entry.incarcerationId,
    bookingNumber: normalizeText(entry.bookingNumber),
    displayName: normalizeText(entry.fullName)
  }));
  if (new Set(entries.map((entry) => entry.incarcerationId)).size !== entries.length) {
    throw new Error("DUPLICATE_INCARCERATION_ID");
  }
  return entries;
}

/** Reads one person's detail; null for someone housed outside the jail's two buildings. */
async function readDetail(
  options: HennepinRosterAdapterOptions,
  context: AdapterContext,
  key: string,
  entry: ListEntry
): Promise<HennepinRecord | null> {
  const response = await request(
    options,
    context,
    `${HENNEPIN_COUNTY_API_BASE_URL}/JailRoster/${entry.incarcerationId}?subscription-key=${key}`
  );
  if (response.status === 404) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  const detail = DetailResponseSchema.safeParse(await readJson(response));
  if (!detail.success) throw new Error("DETAIL_STRUCTURE_CHANGED");
  // Released between the list and this request.
  if (detail.data.custodyStatus !== IN_CUSTODY) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  if (
    detail.data.incarcerationId !== entry.incarcerationId ||
    normalizeText(detail.data.bookingNumber) !== entry.bookingNumber ||
    normalizeText(detail.data.fullName) !== entry.displayName
  ) {
    throw new Error("INVALID_RECORD_IDENTITY");
  }
  if (!JAIL_LOCATIONS.has(normalizeText(detail.data.housingLocationFacility))) return null;

  // A case with a clear reason (dismissed, bail posted, hold dropped) is closed; only open
  // cases' charges are kept.
  const charges = detail.data.cases
    .filter((item) => normalizeText(item.clearReason) === "")
    .flatMap((item) => item.charges)
    .map((charge) => ({
      description: normalizeText(charge.description),
      statuteCode: normalizeText(charge.statute) || null
    }))
    .filter((charge) => charge.description !== "");
  return HennepinRecordSchema.parse({
    displayName: entry.displayName,
    bookingNumber: entry.bookingNumber,
    charges
  });
}

async function crawlRoster(
  options: HennepinRosterAdapterOptions,
  context: AdapterContext,
  key: string
): Promise<HennepinRoster> {
  const entries = await listInCustody(options, context, key);
  const details = new Array<HennepinRecord | null>(entries.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, entries.length) }, async () => {
      while (next < entries.length) {
        const index = next;
        next += 1;
        details[index] = await readDetail(options, context, key, entries[index]!);
      }
    })
  );

  // The list must be unchanged once every detail has been read, or someone may be missing.
  const after = await listInCustody(options, context, key);
  const listed = new Set(entries.map((entry) => entry.incarcerationId));
  if (
    after.length !== entries.length ||
    after.some((entry) => !listed.has(entry.incarcerationId))
  ) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  const records = details.filter((record): record is HennepinRecord => record !== null);
  // The county jail is never empty; an empty list means the search or housing data broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return HennepinRosterSchema.parse({ records, validEmptyMarker: false });
}

async function requestRoster(
  options: HennepinRosterAdapterOptions,
  context: AdapterContext
): Promise<HennepinRoster> {
  if (context.source.sourceUrl !== HENNEPIN_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const key = await apiKey(options, context);
  // Bookings and releases land while the details are read; start over when they do.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(options, context, key);
    } catch (error) {
      const changed = error instanceof Error && error.message === "ROSTER_CHANGED_DURING_CRAWL";
      if (!changed || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

export function createHennepinCountySourceAdapter(
  options: HennepinRosterAdapterOptions
): SourceAdapter<HennepinRoster, HennepinRoster, HennepinRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: HENNEPIN_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: HENNEPIN_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<HennepinRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<HennepinRoster>> {
      const result = HennepinRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<HennepinRoster>> {
      const result = HennepinRosterSchema.safeParse(payload);
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
              evidence: "The official Hennepin County jail roster reported no one in custody."
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
              `${record.bookingNumber}|${sequence}|${charge.statuteCode ?? ""}|${charge.description}`
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
        await listInCustody(options, context, await apiKey(options, context));
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
