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
import { assertFewWithoutCharges } from "./charge-gaps.js";

export const PULASKI_COUNTY_AR_ADAPTER_KEY = "pulaski-county-ar-current-roster" as const;
const API_BASE_URL = "https://api.correctionsrecordssearch.com/instances";
/** The Sheriff's website links its Inmate Roster to this records-search instance. */
export const PULASKI_COUNTY_AR_LOOKUP_URL = `${API_BASE_URL}/lookup?alias=arpulaskicounty` as const;
export const PULASKI_COUNTY_AR_CURRENT_SOURCE_URL = PULASKI_COUNTY_AR_LOOKUP_URL;
export const PULASKI_COUNTY_AR_PARSER_VERSION = "1.0.0" as const;

const SITE_TITLE = "Pulaski County Regional Detention Center";
// The detention center holds about 1,350 people; leave room for growth.
const MAX_RECORDS = 3_000;
const PAGE_SIZE = 100;
const MAX_PAGES = MAX_RECORDS / PAGE_SIZE;
const MAX_CRAWL_ATTEMPTS = 3;
// Arkansas offense classes; "Z" (warrants and holds), "U", and "CONV" carry no class.
const DEGREES: Readonly<Record<string, string>> = {
  F: "Felony",
  FY: "Class Y Felony",
  FA: "Class A Felony",
  FB: "Class B Felony",
  FC: "Class C Felony",
  FD: "Class D Felony",
  FU: "Unclassified Felony",
  M: "Misdemeanor",
  MA: "Class A Misdemeanor",
  MB: "Class B Misdemeanor",
  MC: "Class C Misdemeanor",
  MU: "Unclassified Misdemeanor",
  V: "Violation",
  VU: "Violation"
};
const UNCLASSIFIED = new Set(["Z", "U", "CONV", ""]);
// "THEFT BY RECEIVING - FIREARM LT $2,500(FD)": the class code the service appends.
const CLASS_SUFFIX = /\s*\((?:[A-Z]{1,2})\)$/;
// "Warrant: FAILURE TO APPEAR- FELONY warrant PC-24-3625 issued by Pulaski County Sheriff's
// Office, AR": the service cuts these at 100 characters, so only the warrant type is kept.
const WARRANT = /^Warrant: ((?:[A-Za-z][A-Za-z-]* )*?warrant)(?:\s|$)/;

// Only the fields this adapter reads are declared; the response also carries dates of birth,
// ages, physical descriptions, photos, booking dates, case numbers, arresting agencies, and
// bonds, which are ignored and never stored.
const LookupSchema = z.object({
  instanceId: z.string().regex(/^[0-9A-Z]{20,40}$/),
  alias: z.literal("arpulaskicounty"),
  branding: z.object({ siteTitle: z.string() })
});
const StatuteSchema = z.object({
  statute: z.object({ description: z.string(), degree: z.string().nullable().optional() })
});
const InmateSchema = z.object({
  soNumber: z.string(),
  IsReleased: z.boolean(),
  name: z.object({ fullName: z.string() }),
  arrests: z.array(z.object({ charges: z.array(StatuteSchema) }))
});
const PageSchema = z.object({
  inmates: z.array(InmateSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    pageNumber: z.number().int().positive()
  })
});

const PulaskiRecordSchema = z.object({
  soNumber: z.string().regex(/^[0-9A-Z-]{3,20}$/),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(200)
});
const PulaskiRosterSchema = z.object({
  records: z.array(PulaskiRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type PulaskiRoster = z.infer<typeof PulaskiRosterSchema>;
export type PulaskiRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type PulaskiRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface PulaskiRosterAdapterOptions {
  readonly fetch: PulaskiRosterFetch;
  readonly facilityId: string;
  readonly createId: PulaskiRosterIdFactory;
  readonly nowMs?: () => number;
}

type PulaskiRecord = z.infer<typeof PulaskiRecordSchema>;

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
      "The approved Pulaski County, Arkansas inmate roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `PULASKI_COUNTY_AR_${code}`.slice(0, 100)
  };
}

async function readJson(
  options: PulaskiRosterAdapterOptions,
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

/** One charge as shown: the offense (or a warrant's type) followed by its class, if any. */
export function formatPulaskiCharge(
  description: string,
  degree: string | null | undefined
): string {
  const text = normalizeText(description);
  const warrant = text.match(WARRANT);
  const offense = warrant ? warrant[1]! : text.replace(CLASS_SUFFIX, "");
  if (!offense) throw new Error("CHARGE_UNREADABLE");
  const code = normalizeText(degree);
  if (UNCLASSIFIED.has(code)) return offense;
  const level = DEGREES[code];
  if (!level) throw new Error("CHARGE_DEGREE_UNKNOWN");
  // "FAILURE TO APPEAR (FELONY)" already names its level.
  const kind = level.split(" ").at(-1)!;
  if (new RegExp(`\\(${kind}\\)$`, "i").test(offense)) return offense;
  return `${offense} (${level})`;
}

function readRecord(inmate: z.infer<typeof InmateSchema>): PulaskiRecord {
  if (inmate.IsReleased) throw new Error("LIST_SCOPE_CHANGED");
  return PulaskiRecordSchema.parse({
    soNumber: normalizeText(inmate.soNumber),
    displayName: normalizeText(inmate.name.fullName),
    charges: inmate.arrests.flatMap((arrest) =>
      arrest.charges.map((charge) =>
        formatPulaskiCharge(charge.statute.description, charge.statute.degree)
      )
    )
  });
}

async function crawlRoster(
  options: PulaskiRosterAdapterOptions,
  context: AdapterContext,
  instanceId: string
): Promise<PulaskiRoster> {
  const records: PulaskiRecord[] = [];
  let total: number | null = null;
  for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
    const page = PageSchema.safeParse(
      await readJson(
        options,
        context,
        `${API_BASE_URL}/${instanceId}/inmates?page-size=${PAGE_SIZE}&page-number=${pageNumber}`
      )
    );
    if (!page.success) throw new Error("LIST_STRUCTURE_CHANGED");
    const { inmates, pagination } = page.data;
    if (pagination.pageNumber !== pageNumber || pagination.pageSize !== PAGE_SIZE) {
      throw new Error("PAGE_SEQUENCE_MISMATCH");
    }
    if (total === null) total = pagination.total;
    if (pagination.total !== total) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
    if (total > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
    records.push(...inmates.map(readRecord));
    if (records.length >= total || inmates.length === 0) break;
  }
  if (records.length !== total) throw new Error("ROSTER_TOTAL_MISMATCH");
  if (new Set(records.map((record) => record.soNumber)).size !== records.length) {
    // A booking or release between pages can shift someone onto two pages.
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  // The detention center is never empty; an empty list means the service broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return PulaskiRosterSchema.parse({ records, validEmptyMarker: false });
}

async function requestRoster(
  options: PulaskiRosterAdapterOptions,
  context: AdapterContext
): Promise<PulaskiRoster> {
  if (context.source.sourceUrl !== PULASKI_COUNTY_AR_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const lookup = LookupSchema.safeParse(
    await readJson(options, context, PULASKI_COUNTY_AR_LOOKUP_URL)
  );
  if (!lookup.success || normalizeText(lookup.data.branding.siteTitle) !== SITE_TITLE) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  // A booking or release while the pages are read changes the total; start over when it does.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await crawlRoster(options, context, lookup.data.instanceId);
    } catch (error) {
      const changed = error instanceof Error && error.message === "ROSTER_CHANGED_DURING_CRAWL";
      if (!changed || attempt >= MAX_CRAWL_ATTEMPTS) throw error;
    }
  }
}

export function createPulaskiCountyArSourceAdapter(
  options: PulaskiRosterAdapterOptions
): SourceAdapter<PulaskiRoster, PulaskiRoster, PulaskiRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: PULASKI_COUNTY_AR_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: PULASKI_COUNTY_AR_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<PulaskiRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<PulaskiRoster>> {
      const result = PulaskiRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<PulaskiRoster>> {
      const result = PulaskiRosterSchema.safeParse(payload);
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
              evidence: "The official Pulaski County inmate roster listed no one."
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
            // The roster's SO number identifies the person, not the booking.
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
        const lookup = LookupSchema.safeParse(
          await readJson(options, context, PULASKI_COUNTY_AR_LOOKUP_URL)
        );
        if (!lookup.success) throw new Error("SOURCE_IDENTITY_MISMATCH");
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
