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

export const CLINTON_COUNTY_ADAPTER_KEY = "clinton-county-iowa-current-roster" as const;
export const CLINTON_COUNTY_PORTAL_ORIGIN =
  "https://portal.ia-clinton-so.centralsquarecloud.com" as const;
export const CLINTON_COUNTY_CURRENT_SOURCE_URL = `${CLINTON_COUNTY_PORTAL_ORIGIN}/inmates` as const;
export const CLINTON_COUNTY_TOKEN_URL =
  `${CLINTON_COUNTY_PORTAL_ORIGIN}/api/portal/config/xsrf_token` as const;
export const CLINTON_COUNTY_LIST_URL =
  `${CLINTON_COUNTY_PORTAL_ORIGIN}/api/portal/inmates/load` as const;
export const CLINTON_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 900;
const MAX_HOLD_REASONS = 40;
// The jail sits in Clinton, Iowa; the portal's "in custody on" filter takes the local date.
const JAIL_TIME_ZONE = "America/Chicago";
const SET_CSRF_MESSAGE = "CSRF token set";
const STATUTE = String.raw`\d{1,3}[A-Z]?\.\d+[A-Z]?(?:\([0-9A-Za-z]+\))*`;
const CHARGE_TEXT = new RegExp(String.raw`^Charge: (${STATUTE}) - (.+)$`);
// "Bench warrant W2600586 issued by Clinton, IA (908.11 - Violation Of Probation - 1985)"; the
// warrant number and issuing court are sometimes blank.
const WARRANT_TEXT = new RegExp(
  String.raw`^Warrant: ((?:[A-Za-z]+ )*?warrant)(?: [A-Za-z0-9-]+)?(?: issued by [^()]+)? \((${STATUTE}) - (.+)\)$`
);
const SENTENCE_TEXT = /^Sentenced: (Serving .+)$/;
const HOLD_TEXT = /^Hold-Out of County for (.+)$/;
const ARREST_DATE = /^Arrest Date \d{2}\/\d{2}\/\d{4}$/;
const SET_BY = /^Set By [A-Za-z ]+$/;
// "Bond - Cash Only, $5000.00", "Bond - No Bond", "Bond - Cash / Multiple Cases", "Bond - $0.00".
const BOND_TEXT = /^Bond - (?:([^$,][^,]*)(?:, (?=\$)|$))?(?:\$(\d+)\.(\d{2}))?$/;
const NAME_TEXT = /^[^,]+, .+$/;

const PortalRecordSchema = z.object({
  name: z.string(),
  hold_reasons: z.string(),
  is_juvenile: z.boolean(),
  release_date: z.string().nullable(),
  arrest_date: z.string().nullable()
});
const PortalListSchema = z.object({
  records: z.array(z.unknown()).max(MAX_RECORDS),
  total_record_count: z.number().int().nonnegative()
});

const ClintonBondSchema = z.object({
  type: z.string().min(1).max(100).nullable(),
  noBond: z.boolean(),
  amountMinor: z.number().int().nonnegative().max(100_000_000_000).nullable()
});
const ClintonHoldReasonSchema = z.object({
  label: z.string().min(1).max(150),
  statuteCode: z.string().min(1).max(100).nullable(),
  description: z.string().min(1).max(1_000),
  bond: ClintonBondSchema.nullable()
});
const ClintonRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  holdReasons: z.array(ClintonHoldReasonSchema).max(MAX_HOLD_REASONS)
});
const ClintonRosterSchema = z.object({
  records: z.array(ClintonRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type ClintonRoster = z.infer<typeof ClintonRosterSchema>;
type ClintonHoldReason = z.infer<typeof ClintonHoldReasonSchema>;
type ClintonBond = z.infer<typeof ClintonBondSchema>;
export type ClintonRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type ClintonRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface ClintonRosterAdapterOptions {
  readonly fetch: ClintonRosterFetch;
  readonly facilityId: string;
  readonly createId: ClintonRosterIdFactory;
  readonly nowMs?: () => number;
}

function normalizeText(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
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
    publicMessage: "The approved Clinton County, Iowa jail portal could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `CLINTON_COUNTY_${code}`.slice(0, 100)
  };
}

function parseBond(text: string): ClintonBond {
  const match = text.match(BOND_TEXT);
  if (!match || (match[1] === undefined && match[2] === undefined)) {
    throw new Error("BOND_UNREADABLE");
  }
  const type = match[1] ?? null;
  const amountMinor = match[2] === undefined ? null : Number(match[2]) * 100 + Number(match[3]);
  if (amountMinor !== null && !Number.isSafeInteger(amountMinor))
    throw new Error("BOND_UNREADABLE");
  const noBond = type === "No Bond";
  // "No Bond, $0.00" is how the portal prints a hold with no bond; any other amount is a conflict.
  if (noBond && amountMinor !== null && amountMinor !== 0) throw new Error("BOND_UNREADABLE");
  return { type, noBond, amountMinor: noBond ? null : amountMinor };
}

/**
 * One hold reason reads "<what>; Arrest Date mm/dd/yyyy; Bond - <type>, $<amount>; Set By <who>;".
 * The arrest date is left out; anything else the portal adds fails closed.
 */
export function parseClintonHoldReason(entry: string): ClintonHoldReason {
  // Entities are decoded first so an apostrophe's "&#39;" is not read as a separator.
  const [head = "", ...parts] = normalizeText(entry)
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  let bond: ClintonBond | null = null;
  for (const part of parts) {
    if (ARREST_DATE.test(part) || SET_BY.test(part)) continue;
    if (part.startsWith("Bond - ") && bond === null) {
      bond = parseBond(part);
      continue;
    }
    throw new Error("HOLD_REASON_UNREADABLE");
  }

  const charge = head.match(CHARGE_TEXT);
  if (charge) {
    return { label: "Charge", statuteCode: charge[1]!, description: charge[2]!, bond };
  }
  const warrant = head.match(WARRANT_TEXT);
  if (warrant) {
    const label = `${warrant[1]![0]!.toUpperCase()}${warrant[1]!.slice(1)}`;
    return { label, statuteCode: warrant[2]!, description: warrant[3]!, bond };
  }
  const sentence = head.match(SENTENCE_TEXT);
  if (sentence) {
    return { label: "Sentenced", statuteCode: null, description: sentence[1]!, bond };
  }
  const hold = head.match(HOLD_TEXT);
  if (hold) {
    return { label: "Hold", statuteCode: null, description: `Held for ${hold[1]!}`, bond };
  }
  throw new Error("HOLD_REASON_UNREADABLE");
}

function localDate(requestedAt: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(requestedAt));
  const part = (type: string): string => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    throw new Error("RESPONSE_NOT_JSON");
  }
}

async function requestToken(
  options: ClintonRosterAdapterOptions,
  context: AdapterContext
): Promise<void> {
  const answer = await readJson(
    await options.fetch(CLINTON_COUNTY_TOKEN_URL, {
      method: "GET",
      redirect: "error",
      signal: context.signal,
      headers: { accept: "application/json" }
    })
  );
  const parsed = z.object({ message: z.literal(SET_CSRF_MESSAGE) }).safeParse(answer);
  if (!parsed.success) throw new Error("SESSION_TOKEN_MISSING");
}

export function parseClintonList(answer: unknown): ClintonRoster {
  const list = PortalListSchema.safeParse(answer);
  if (!list.success) throw new Error("LIST_SHAPE_CHANGED");
  if (list.data.records.length !== list.data.total_record_count) {
    throw new Error("ROSTER_COUNT_MISMATCH");
  }

  const records: ClintonRoster["records"] = [];
  for (const raw of list.data.records) {
    const parsed = PortalRecordSchema.safeParse(raw);
    if (!parsed.success) throw new Error("RECORD_SHAPE_CHANGED");
    const record = parsed.data;
    // The list covers everyone held at any point today; anyone already released is left out,
    // and the portal withholds juveniles.
    if (record.release_date !== null || record.is_juvenile) continue;
    const displayName = normalizeText(record.name);
    if (!NAME_TEXT.test(displayName)) throw new Error("NAME_UNREADABLE");
    const holdReasons = record.hold_reasons
      .split(/<br\s*\/?>/i)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => parseClintonHoldReason(entry));
    records.push({
      recordKey: `${displayName}|${record.arrest_date ?? ""}`,
      displayName,
      holdReasons
    });
  }

  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_ROSTER_ENTRY");
  }
  // A jail of this size is never empty; an empty answer is the portal failing.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  if (records.filter((record) => record.holdReasons.length === 0).length > 2) {
    throw new Error("HOLD_REASONS_MISSING");
  }
  return ClintonRosterSchema.parse({ records, validEmptyMarker: false });
}

async function requestRoster(
  options: ClintonRosterAdapterOptions,
  context: AdapterContext
): Promise<ClintonRoster> {
  if (context.source.sourceUrl !== CLINTON_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  await requestToken(options, context);
  const query = {
    paging: { start: 0, count: MAX_RECORDS },
    sorting: { sort_by_column_tag: "name", sort_descending: false },
    in_custody: localDate(context.requestedAt)
  };
  const answer = await readJson(
    await options.fetch(CLINTON_COUNTY_LIST_URL, {
      method: "POST",
      redirect: "error",
      signal: context.signal,
      headers: { accept: "application/json" },
      body: JSON.stringify(query)
    })
  );
  return parseClintonList(answer);
}

function bondEntry(
  options: ClintonRosterAdapterOptions,
  bookingId: string,
  sequence: number,
  bond: ClintonBond
): BondEntry {
  const id = options.createId(
    "bond",
    `${bookingId}|${sequence}|${bond.type ?? ""}|${bond.amountMinor ?? ""}`
  );
  if (bond.noBond) {
    return { id, bookingId, sequence, sourceLabel: "Bond", note: null, state: "no_bond" };
  }
  if (bond.amountMinor === null) {
    return { id, bookingId, sequence, sourceLabel: "Bond", note: bond.type, state: "unknown" };
  }
  return {
    id,
    bookingId,
    sequence,
    sourceLabel: "Bond",
    note:
      bond.amountMinor === 0
        ? [bond.type, "The source displays $0.00; this is not interpreted as no bond."]
            .filter(Boolean)
            .join(". ")
        : bond.type,
    state: "monetary",
    amountMinor: bond.amountMinor,
    currency: "USD"
  };
}

export function createClintonCountySourceAdapter(
  options: ClintonRosterAdapterOptions
): SourceAdapter<ClintonRoster, ClintonRoster, ClintonRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: CLINTON_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: CLINTON_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<ClintonRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<ClintonRoster>> {
      const result = ClintonRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<ClintonRoster>> {
      const result = ClintonRosterSchema.safeParse(payload);
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
              evidence: "The official Clinton County jail portal listed 0 people in custody."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.recordKey);
          const charges: Charge[] = record.holdReasons.map((reason, sequence) => ({
            id: options.createId(
              "charge",
              `${record.recordKey}|${sequence}|${reason.statuteCode ?? ""}|${reason.description}`
            ),
            bookingId,
            sequence,
            description: reason.description,
            sourceLabel: reason.label,
            statuteCode: reason.statuteCode,
            disposition: null
          }));
          const bondEntries: BondEntry[] = record.holdReasons.flatMap((reason, sequence) =>
            reason.bond ? [bondEntry(options, bookingId, sequence, reason.bond)] : []
          );
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", record.recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The portal shows no booking number.
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
        await requestToken(options, context);
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
