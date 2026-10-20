import {
  NormalizedCustodySnapshotSchema,
  type BondEntry,
  type Booking,
  type Charge
} from "@jail-atlas/domain";
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

export const BENTON_COUNTY_ADAPTER_KEY = "benton-county-mn-current-roster" as const;
const API_BASE_URL = "https://api.correctionsrecordssearch.com/instances";
/** The county's Current Inmate List runs on this records-search instance. */
export const BENTON_COUNTY_LOOKUP_URL = `${API_BASE_URL}/lookup?alias=bentoncountymn` as const;
export const BENTON_COUNTY_CURRENT_SOURCE_URL = BENTON_COUNTY_LOOKUP_URL;
export const BENTON_COUNTY_PARSER_VERSION = "1.0.0" as const;

const SITE_TITLE = "Benton County Jail (Minnesota)";
const MAX_RECORDS = 1_000;
const PAGE_SIZE = 100;
const MAX_PAGES = MAX_RECORDS / PAGE_SIZE;
// The service cuts charge descriptions at 100 characters. A description that long sometimes ends in
// a cut-off offense category ("…-Drug/Nar"); that trailing category is dropped.
const DESCRIPTION_LIMIT = 100;
const TRAILING_CATEGORY = /^(.*[^\s-])-(?! )[^-]*$/;
const DEGREES: Readonly<Record<string, string>> = {
  F: "Felony",
  G: "Gross Misdemeanor",
  M: "Misdemeanor",
  P: "Petty Misdemeanor"
};

// Only the fields this adapter reads are declared; the response also carries ages, sex, race,
// height, weight, eye and hair color, photos, arresting agencies, and arrest dates, which are
// ignored and never stored.
const LookupSchema = z.object({
  instanceId: z.string().regex(/^[0-9A-Z]{20,40}$/),
  alias: z.literal("bentoncountymn"),
  branding: z.object({ siteTitle: z.string() })
});
const StatuteSchema = z.object({
  statute: z.object({ description: z.string(), degree: z.string().nullable().optional() })
});
const InmateSchema = z.object({
  soNumber: z.string(),
  IsReleased: z.boolean(),
  name: z.object({ fullName: z.string() }),
  arrests: z.array(z.object({ charges: z.array(StatuteSchema) })),
  bonds: z.array(z.object({ type: z.string(), amount: z.number().nonnegative().optional() }))
});
const PageSchema = z.object({
  inmates: z.array(InmateSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    pageNumber: z.number().int().positive()
  })
});

const BentonBondSchema = z.object({
  type: z.string().trim().min(1).max(100),
  amountMinor: z.number().int().nonnegative().max(100_000_000_000).nullable()
});
const BentonRecordSchema = z.object({
  soNumber: z.string().regex(/^[0-9A-Z]{4,20}$/),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100),
  bonds: z.array(BentonBondSchema).max(100)
});
const BentonRosterSchema = z.object({
  records: z.array(BentonRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type BentonRoster = z.infer<typeof BentonRosterSchema>;
export type BentonRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type BentonRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface BentonRosterAdapterOptions {
  readonly fetch: BentonRosterFetch;
  readonly facilityId: string;
  readonly createId: BentonRosterIdFactory;
  readonly nowMs?: () => number;
}

type BentonRecord = z.infer<typeof BentonRecordSchema>;

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
      "The approved Benton County, Minnesota inmate list could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `BENTON_COUNTY_${code}`.slice(0, 100)
  };
}

async function readJson(
  options: BentonRosterAdapterOptions,
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
    throw new Error("RESPONSE_NOT_JSON");
  }
}

/** Drops a cut-off trailing offense category from a description that hit the length limit. */
export function cleanBentonDescription(description: string): string {
  const text = normalizeText(description);
  if (text.length < DESCRIPTION_LIMIT) return text;
  const match = text.match(TRAILING_CATEGORY);
  return match ? match[1]!.trim() : text;
}

function readCharge(item: z.infer<typeof StatuteSchema>): string {
  const description = cleanBentonDescription(item.statute.description);
  if (!description) throw new Error("CHARGE_UNREADABLE");
  const degree = normalizeText(item.statute.degree);
  if (degree && !DEGREES[degree]) throw new Error("CHARGE_DEGREE_UNKNOWN");
  return degree ? `${description} (${DEGREES[degree]})` : description;
}

function readRecord(inmate: z.infer<typeof InmateSchema>): BentonRecord {
  if (inmate.IsReleased) throw new Error("LIST_SCOPE_CHANGED");
  return BentonRecordSchema.parse({
    soNumber: normalizeText(inmate.soNumber),
    displayName: normalizeText(inmate.name.fullName),
    charges: inmate.arrests.flatMap((arrest) => arrest.charges.map(readCharge)),
    bonds: inmate.bonds.map((bond) => ({
      type: normalizeText(bond.type),
      amountMinor: bond.amount === undefined ? null : Math.round(bond.amount * 100)
    }))
  });
}

async function requestRoster(
  options: BentonRosterAdapterOptions,
  context: AdapterContext
): Promise<BentonRoster> {
  if (context.source.sourceUrl !== BENTON_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const lookup = LookupSchema.safeParse(await readJson(options, context, BENTON_COUNTY_LOOKUP_URL));
  if (!lookup.success || normalizeText(lookup.data.branding.siteTitle) !== SITE_TITLE) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }

  const records: BentonRecord[] = [];
  let total: number | null = null;
  for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
    const page = PageSchema.safeParse(
      await readJson(
        options,
        context,
        `${API_BASE_URL}/${lookup.data.instanceId}/inmates?page-size=${PAGE_SIZE}&page-number=${pageNumber}`
      )
    );
    if (!page.success) throw new Error("LIST_STRUCTURE_CHANGED");
    const { inmates, pagination } = page.data;
    if (pagination.pageNumber !== pageNumber || pagination.pageSize !== PAGE_SIZE) {
      throw new Error("PAGE_SEQUENCE_MISMATCH");
    }
    if (total === null) total = pagination.total;
    // A booking or release between pages changes the total; the run fails and the next one retries.
    if (pagination.total !== total) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    if (total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
    records.push(...inmates.map(readRecord));
    if (records.length >= total || inmates.length === 0) break;
  }

  if (records.length !== total) throw new Error("ROSTER_TOTAL_MISMATCH");
  if (new Set(records.map((record) => record.soNumber)).size !== records.length) {
    throw new Error("DUPLICATE_SO_NUMBER");
  }
  // The county jail is never empty; an empty list means the service broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return BentonRosterSchema.parse({ records, validEmptyMarker: false });
}

function bondEntries(
  options: BentonRosterAdapterOptions,
  record: BentonRecord,
  bookingId: string
): BondEntry[] {
  return record.bonds.map((bond, sequence) => {
    const id = options.createId(
      "bond",
      `${bookingId}|${sequence}|${bond.type}|${bond.amountMinor}`
    );
    if (bond.type === "Not Bondable") {
      return {
        id,
        bookingId,
        sequence,
        sourceLabel: "Bond",
        note: null,
        state: "no_bond" as const
      };
    }
    if (bond.amountMinor === null) {
      return {
        id,
        bookingId,
        sequence,
        sourceLabel: "Bond",
        note: bond.type,
        state: "unknown" as const
      };
    }
    return {
      id,
      bookingId,
      sequence,
      sourceLabel: "Bond",
      note: bond.type,
      state: "monetary" as const,
      amountMinor: bond.amountMinor,
      currency: "USD"
    };
  });
}

export function createBentonCountySourceAdapter(
  options: BentonRosterAdapterOptions
): SourceAdapter<BentonRoster, BentonRoster, BentonRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: BENTON_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: BENTON_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<BentonRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<BentonRoster>> {
      const result = BentonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<BentonRoster>> {
      const result = BentonRosterSchema.safeParse(payload);
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
              evidence: "The official Benton County inmate list reported no one in custody."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.soNumber);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${record.soNumber}|${sequence}|${description}`),
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
              id: options.createId("person", `${record.soNumber}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The list's SO number may follow the person across bookings, so it is not shown as one.
            bookingIdentifier: null,
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            bondEntries: bondEntries(options, record, bookingId),
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
