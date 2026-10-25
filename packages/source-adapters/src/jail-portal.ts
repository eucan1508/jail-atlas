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

/**
 * A sheriff's jail portal of the kind several Iowa counties run (Zuercher, now CentralSquare).
 * The Inmates page posts a JSON query for everyone in custody on a date and gets back each
 * person with their hold reasons: charges, warrants, sentences, and holds for other agencies.
 */
export type JailPortalConfig = Readonly<{
  adapterKey: string;
  /** "Clinton County"; used in the failure message. */
  countyName: string;
  diagnosticPrefix: string;
  origin: string;
  /**
   * The Inmates page path the sheriff's site links, which the source row records. Older portals
   * route it in the browser ("/#/inmates"); the bare path answers 404 there.
   */
  sourcePath: string;
  /**
   * Newer CentralSquare-hosted portals guard the list with a session-bound CSRF token, handed out
   * by a token endpoint before the list is asked for.
   */
  sessionToken: boolean;
  /**
   * Newer portals take the "in custody on" filter as a local date; older Zuercher-hosted ones
   * take the browser's full filter set with a timestamp.
   */
  inCustodyFilter: "local_date" | "timestamp_with_filters";
}>;

export const CLINTON_COUNTY_JAIL_PORTAL: JailPortalConfig = {
  adapterKey: "clinton-county-iowa-current-roster",
  countyName: "Clinton County",
  diagnosticPrefix: "CLINTON_COUNTY",
  origin: "https://portal.ia-clinton-so.centralsquarecloud.com",
  sourcePath: "/inmates",
  sessionToken: true,
  inCustodyFilter: "local_date"
};

export const MARSHALL_COUNTY_JAIL_PORTAL: JailPortalConfig = {
  adapterKey: "marshall-county-iowa-current-roster",
  countyName: "Marshall County",
  diagnosticPrefix: "MARSHALL_COUNTY",
  origin: "https://marshall-so-ia.zuercherportal.com",
  sourcePath: "/#/inmates",
  sessionToken: false,
  inCustodyFilter: "timestamp_with_filters"
};

const JAIL_PORTALS = [CLINTON_COUNTY_JAIL_PORTAL, MARSHALL_COUNTY_JAIL_PORTAL] as const;

/** The portal configuration for an adapter key, or undefined when the key is not a jail portal. */
export function jailPortal(adapterKey: string | null | undefined): JailPortalConfig | undefined {
  return JAIL_PORTALS.find((portal) => portal.adapterKey === adapterKey);
}

export const CLINTON_COUNTY_ADAPTER_KEY = CLINTON_COUNTY_JAIL_PORTAL.adapterKey;
export const MARSHALL_COUNTY_ADAPTER_KEY = MARSHALL_COUNTY_JAIL_PORTAL.adapterKey;
export const CLINTON_COUNTY_CURRENT_SOURCE_URL = jailPortalSourceUrl(CLINTON_COUNTY_JAIL_PORTAL);
export const MARSHALL_COUNTY_CURRENT_SOURCE_URL = jailPortalSourceUrl(MARSHALL_COUNTY_JAIL_PORTAL);
export const JAIL_PORTAL_PARSER_VERSION = "1.0.0" as const;

/** The Inmates page a sheriff's site links; the source row records this URL. */
export function jailPortalSourceUrl(config: JailPortalConfig): string {
  return `${config.origin}${config.sourcePath}`;
}
export function jailPortalTokenUrl(config: JailPortalConfig): string {
  return `${config.origin}/api/portal/config/xsrf_token`;
}
export function jailPortalInitUrl(config: JailPortalConfig): string {
  return `${config.origin}/api/portal/inmates/init`;
}
export function jailPortalListUrl(config: JailPortalConfig): string {
  return `${config.origin}/api/portal/inmates/load`;
}
/** The API paths the transport must allow for a portal. */
export function jailPortalPaths(config: JailPortalConfig): string[] {
  return config.sessionToken
    ? ["/api/portal/config/xsrf_token", "/api/portal/inmates/load"]
    : ["/api/portal/inmates/init", "/api/portal/inmates/load"];
}

const MAX_RECORDS = 900;
const MAX_HOLD_REASONS = 40;
// Both jails sit in Iowa; the "in custody on" filter takes the local date.
const JAIL_TIME_ZONE = "America/Chicago";
const SET_CSRF_MESSAGE = "CSRF token set";
const STATUTE = String.raw`\d{1,3}[A-Z]?\.\d+[A-Z]?(?:\([0-9A-Za-z]+\))*`;
const CHARGE_TEXT = new RegExp(String.raw`^Charge: (${STATUTE}) - (.+)$`);
// "Bench warrant W2600586 issued by Clinton, IA (908.11 - Violation Of Probation - 1985)"; the
// warrant number, the issuing court, and the charge in parentheses are each sometimes left out.
const WARRANT_TEXT = new RegExp(
  String.raw`^Warrant: ((?:[A-Za-z]+ )*?warrant)(?: [A-Za-z0-9-]+)?(?: issued by [^()]+)?(?: \((${STATUTE}) - (.+)\))?$`
);
const SENTENCE_TEXT = /^(Sentenced|Mittimus): (Serving .+)$/;
// "Hold-Out of County for Scott County Sheriff's Office", "Additional Hold for State of Iowa",
// "Hold For Court for Marshall County Court", "Federal for Federal".
const HOLD_TEXT = /^([A-Z][A-Za-z -]{0,40}) for (.+)$/;
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

const JailPortalBondSchema = z.object({
  type: z.string().min(1).max(100).nullable(),
  noBond: z.boolean(),
  amountMinor: z.number().int().nonnegative().max(100_000_000_000).nullable()
});
const JailPortalHoldReasonSchema = z.object({
  label: z.string().min(1).max(150),
  statuteCode: z.string().min(1).max(100).nullable(),
  description: z.string().min(1).max(1_000),
  bond: JailPortalBondSchema.nullable()
});
const JailPortalRecordSchema = z.object({
  recordKey: z.string().min(1).max(400),
  displayName: z.string().trim().min(2).max(250),
  holdReasons: z.array(JailPortalHoldReasonSchema).max(MAX_HOLD_REASONS)
});
const JailPortalRosterSchema = z.object({
  records: z.array(JailPortalRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type JailPortalRoster = z.infer<typeof JailPortalRosterSchema>;
type JailPortalHoldReason = z.infer<typeof JailPortalHoldReasonSchema>;
type JailPortalBond = z.infer<typeof JailPortalBondSchema>;
export type JailPortalFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type JailPortalIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface JailPortalAdapterOptions {
  readonly fetch: JailPortalFetch;
  readonly facilityId: string;
  readonly createId: JailPortalIdFactory;
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
  config: JailPortalConfig,
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage: `The approved ${config.countyName}, Iowa jail portal could not be processed safely.`,
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `${config.diagnosticPrefix}_${code}`.slice(0, 100)
  };
}

function parseBond(text: string): JailPortalBond {
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
 * The trailing parts are read from the end, so a semicolon inside a charge name stays with the
 * charge. The arrest date is left out; anything else the portal adds fails closed.
 */
export function parseJailPortalHoldReason(entry: string): JailPortalHoldReason {
  // Entities are decoded first so an apostrophe's "&#39;" is not read as a separator.
  const parts = normalizeText(entry)
    .split(";")
    .map((part) => part.trim());
  while (parts.length > 1 && parts.at(-1) === "") parts.pop();
  let bond: JailPortalBond | null = null;
  while (parts.length > 1) {
    const part = parts.at(-1)!;
    if (ARREST_DATE.test(part) || SET_BY.test(part)) {
      parts.pop();
    } else if (part.startsWith("Bond - ") && bond === null) {
      bond = parseBond(part);
      parts.pop();
    } else {
      break;
    }
  }
  const head = parts.join("; ");

  const charge = head.match(CHARGE_TEXT);
  if (charge) {
    return { label: "Charge", statuteCode: charge[1]!, description: charge[2]!, bond };
  }
  const warrant = head.match(WARRANT_TEXT);
  if (warrant) {
    const label = `${warrant[1]![0]!.toUpperCase()}${warrant[1]!.slice(1)}`;
    return {
      label,
      statuteCode: warrant[2] ?? null,
      description: warrant[3] ?? label,
      bond
    };
  }
  const sentence = head.match(SENTENCE_TEXT);
  if (sentence) {
    return { label: sentence[1]!, statuteCode: null, description: sentence[2]!, bond };
  }
  const hold = head.match(HOLD_TEXT);
  if (hold && !head.includes(":")) {
    const description = hold[1] === "Federal" && hold[2] === "Federal" ? "Federal hold" : head;
    return { label: "Hold", statuteCode: null, description, bond };
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

/** Opens the portal: takes the session token where the portal uses one, else reads its setup. */
async function openPortal(
  config: JailPortalConfig,
  options: JailPortalAdapterOptions,
  context: AdapterContext
): Promise<void> {
  const answer = await readJson(
    await options.fetch(
      config.sessionToken ? jailPortalTokenUrl(config) : jailPortalInitUrl(config),
      {
        method: "GET",
        redirect: "error",
        signal: context.signal,
        headers: { accept: "application/json" }
      }
    )
  );
  const parsed = config.sessionToken
    ? z.object({ message: z.literal(SET_CSRF_MESSAGE) }).safeParse(answer)
    : z.object({ page_config: z.object({ dob_format: z.string() }) }).safeParse(answer);
  if (!parsed.success) throw new Error("PORTAL_SETUP_MISSING");
}

export function parseJailPortalList(answer: unknown): JailPortalRoster {
  const list = PortalListSchema.safeParse(answer);
  if (!list.success) throw new Error("LIST_SHAPE_CHANGED");
  if (list.data.records.length !== list.data.total_record_count) {
    throw new Error("ROSTER_COUNT_MISMATCH");
  }

  const records: JailPortalRoster["records"] = [];
  for (const raw of list.data.records) {
    const parsed = PortalRecordSchema.safeParse(raw);
    if (!parsed.success) throw new Error("RECORD_SHAPE_CHANGED");
    const record = parsed.data;
    // The list covers everyone held at any point today; anyone already released is left out,
    // and the portal withholds juveniles.
    if (record.release_date || record.is_juvenile) continue;
    const displayName = normalizeText(record.name);
    if (!NAME_TEXT.test(displayName)) throw new Error("NAME_UNREADABLE");
    const holdReasons = record.hold_reasons
      .split(/<br\s*\/?>/i)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => parseJailPortalHoldReason(entry));
    records.push({
      recordKey: `${displayName}|${record.arrest_date ?? ""}`,
      displayName,
      holdReasons
    });
  }

  if (new Set(records.map((record) => record.recordKey)).size !== records.length) {
    throw new Error("DUPLICATE_ROSTER_ENTRY");
  }
  // A county jail is never empty; an empty answer is the portal failing.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  if (records.filter((record) => record.holdReasons.length === 0).length > 2) {
    throw new Error("HOLD_REASONS_MISSING");
  }
  return JailPortalRosterSchema.parse({ records, validEmptyMarker: false });
}

function listQuery(config: JailPortalConfig, requestedAt: string): Record<string, unknown> {
  const paging = { start: 0, count: MAX_RECORDS };
  const sorting = { sort_by_column_tag: "name", sort_descending: false };
  return config.inCustodyFilter === "local_date"
    ? { paging, sorting, in_custody: localDate(requestedAt) }
    : {
        name: "",
        race: "all",
        sex: "all",
        cell_block: "all",
        held_for_agency: "any",
        in_custody: new Date(requestedAt).toISOString(),
        paging,
        sorting
      };
}

async function requestRoster(
  config: JailPortalConfig,
  options: JailPortalAdapterOptions,
  context: AdapterContext
): Promise<JailPortalRoster> {
  if (context.source.sourceUrl !== jailPortalSourceUrl(config)) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  await openPortal(config, options, context);
  const answer = await readJson(
    await options.fetch(jailPortalListUrl(config), {
      method: "POST",
      redirect: "error",
      signal: context.signal,
      headers: { accept: "application/json" },
      body: JSON.stringify(listQuery(config, context.requestedAt))
    })
  );
  return parseJailPortalList(answer);
}

function bondEntry(
  options: JailPortalAdapterOptions,
  bookingId: string,
  sequence: number,
  bond: JailPortalBond
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

export function createJailPortalAdapter(
  config: JailPortalConfig,
  options: JailPortalAdapterOptions
): SourceAdapter<JailPortalRoster, JailPortalRoster, JailPortalRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  const fail = (context: AdapterContext, stage: AdapterStage, error: unknown) =>
    classify(config, context, stage, error);
  return {
    key: config.adapterKey,
    adapterVersion: "1.0.0",
    parserVersion: JAIL_PORTAL_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<JailPortalRoster>> {
      try {
        return { ok: true, value: await requestRoster(config, options, context) };
      } catch (error) {
        return { ok: false, failure: fail(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<JailPortalRoster>> {
      const result = JailPortalRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: fail(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<JailPortalRoster>> {
      const result = JailPortalRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: fail(context, "parse", result.error) }
      );
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.records.length === 0 && payload.validEmptyMarker
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence: `The official ${config.countyName} jail portal listed 0 people in custody.`
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
        return Promise.resolve({ ok: false, failure: fail(context, "normalize", error) });
      }
    },
    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        await openPortal(config, options, context);
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
          failure: fail(context, "health_check", error)
        };
      }
    },
    classifyFailure(error, stage, context) {
      return fail(context, stage, error);
    }
  };
}
