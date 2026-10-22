import {
  NormalizedCustodySnapshotSchema,
  type BondEntry,
  type Booking,
  type Charge
} from "@jail-atlas/domain";
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

export const ANGELINA_COUNTY_ADAPTER_KEY = "angelina-county-tx-current-roster" as const;
export const ANGELINA_COUNTY_CURRENT_SOURCE_URL = "https://www.angelinacounty.net/injail/" as const;
export const ANGELINA_COUNTY_PARSER_VERSION = "1.0.0" as const;

const DETAIL_URL = "https://www.angelinacounty.net/injail/inmate/?jailid=";
const MAX_RECORDS = 2_000;
const MAX_PAGE_BYTES = 3_000_000;
const MAX_CRAWL_ATTEMPTS = 3;
// Detail pages are read a few at a time; the jail holds over four hundred people.
const DETAIL_CONCURRENCY = 4;
const LIST_COLUMNS = ["Name", "Sex", "Height", "Weight", "Eye Color", "Hair Color", "Booking Date"];
const CHARGE_COLUMNS = ["Offense", "Degree", "Bond Amount", "Hold Reason", "Arresting Agency"];
const JAIL_ID = /^\/injail\/inmate\/\?jailid=(\d{1,12})$/;
const ROW_LINK = /^location\.href='(\/injail\/inmate\/\?jailid=\d{1,12})'$/;
const TOTAL_TEXT = /^Total Inmates: (\d+)$/;
const BOOKING_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
// "$20,000 (Bail/Attorney)", "$500 (Misd Class C)", or a bare "$0".
const BOND_TEXT = /^\$(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?(?: \(([^()]{1,100})\))?$/;

const AngelinaChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  bondAmountMinor: z.number().int().nonnegative().max(100_000_000_000),
  bondType: z.string().trim().min(1).max(100).nullable()
});
const AngelinaRecordSchema = z.object({
  jailId: z.string().regex(/^\d{1,12}$/),
  displayName: z.string().trim().min(2).max(250),
  charges: z.array(AngelinaChargeSchema).max(100)
});
const AngelinaRosterSchema = z.object({
  records: z.array(AngelinaRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type AngelinaRoster = z.infer<typeof AngelinaRosterSchema>;
export type AngelinaRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type AngelinaRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface AngelinaRosterAdapterOptions {
  readonly fetch: AngelinaRosterFetch;
  readonly facilityId: string;
  readonly createId: AngelinaRosterIdFactory;
  readonly nowMs?: () => number;
}

export type AngelinaListedInmate = Readonly<{ jailId: string; displayName: string }>;
type AngelinaRecord = z.infer<typeof AngelinaRecordSchema>;

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
    publicMessage: "The approved Angelina County, Texas jail roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `ANGELINA_COUNTY_${code}`.slice(0, 100)
  };
}

/** Reads the Jail Roster list: every person in custody with the link to their detail page. */
export function parseAngelinaList(html: string): AngelinaListedInmate[] {
  const $ = load(html);
  const roster = $("div.jail-roster");
  if (roster.length !== 1) throw new Error("SOURCE_IDENTITY_MISMATCH");
  const total = normalizeText(roster.find("h2").first().text()).match(TOTAL_TEXT);
  if (!total) throw new Error("ROSTER_TOTAL_MISSING");

  const table = roster.find("table").first();
  const header = table
    .find("thead th")
    .toArray()
    .map((cell) => normalizeText($(cell).text()));
  if (JSON.stringify(header) !== JSON.stringify(LIST_COLUMNS)) {
    throw new Error("ROSTER_COLUMNS_CHANGED");
  }

  const listed = table
    .find("tbody tr")
    .toArray()
    .map((row) => {
      const link = ($(row).attr("onclick") ?? "").match(ROW_LINK);
      const jailId = link?.[1]?.match(JAIL_ID)?.[1];
      const cells = $(row)
        .children("td")
        .toArray()
        .map((cell) => normalizeText($(cell).text()));
      const displayName = cells[0];
      const bookingDate = cells[LIST_COLUMNS.length - 1];
      if (
        !jailId ||
        cells.length !== LIST_COLUMNS.length ||
        !displayName ||
        !displayName.includes(",") ||
        // A booking still being entered can be listed with its date left blank.
        (bookingDate !== "" && !BOOKING_DATE.test(bookingDate ?? ""))
      ) {
        throw new Error("ROW_STRUCTURE_CHANGED");
      }
      return { jailId, displayName };
    });

  if (listed.length !== Number(total[1])) throw new Error("ROSTER_TOTAL_MISMATCH");
  if (new Set(listed.map((row) => row.jailId)).size !== listed.length) {
    throw new Error("DUPLICATE_JAIL_ID");
  }
  return listed;
}

/**
 * The list shows "LAST, FIRST MIDDLE[, SUFFIX]" and the detail page "FIRST MIDDLE LAST" without
 * the suffix; both must name the same person.
 */
function detailName(listName: string): string {
  const [last, first] = listName.split(",").map((part) => normalizeText(part));
  return normalizeText(`${first ?? ""} ${last ?? ""}`).toUpperCase();
}

function bondMinor(text: string): { amountMinor: number; type: string | null } {
  const match = text.match(BOND_TEXT);
  if (!match) throw new Error("BOND_UNREADABLE");
  const amountMinor = Number(match[1]!.replace(/,/g, "")) * 100 + Number(match[2] ?? "0");
  if (!Number.isSafeInteger(amountMinor)) throw new Error("BOND_UNREADABLE");
  return { amountMinor, type: match[3] ? normalizeText(match[3]) : null };
}

/** Reads one person's detail page; null when the page no longer shows anyone (released). */
export function parseAngelinaDetail(
  html: string,
  listed: AngelinaListedInmate
): AngelinaRecord | null {
  const $ = load(html);
  const details = $("div.inmate-details");
  if (details.length !== 1) throw new Error("DETAIL_STRUCTURE_CHANGED");
  const name = normalizeText(details.find("h2").first().text());
  // A released booking still answers, with an empty name and no charge rows.
  if (!name) return null;
  if (name.toUpperCase() !== detailName(listed.displayName)) {
    throw new Error("INVALID_RECORD_IDENTITY");
  }

  const table = $("table.table-mobile-full");
  if (table.length !== 1) throw new Error("DETAIL_STRUCTURE_CHANGED");
  const header = table
    .find("thead th")
    .toArray()
    .map((cell) => normalizeText($(cell).text()));
  if (JSON.stringify(header) !== JSON.stringify(CHARGE_COLUMNS)) {
    throw new Error("CHARGE_COLUMNS_CHANGED");
  }

  // Hold reasons and arresting agencies are read past and never stored.
  const charges = table
    .find("tbody tr")
    .toArray()
    .map((row) => {
      const cells = $(row)
        .children("td")
        .toArray()
        .map((cell) => normalizeText($(cell).text()));
      const [offense, degree, bond] = cells;
      if (cells.length !== CHARGE_COLUMNS.length || !offense || bond === undefined) {
        throw new Error("CHARGE_ROW_UNREADABLE");
      }
      const { amountMinor, type } = bondMinor(bond);
      return {
        description: degree && degree !== "Not Applicable" ? `${offense} (${degree})` : offense,
        bondAmountMinor: amountMinor,
        bondType: type
      };
    });
  return AngelinaRecordSchema.parse({
    jailId: listed.jailId,
    displayName: listed.displayName,
    charges
  });
}

async function readHtml(
  options: AngelinaRosterAdapterOptions,
  context: AdapterContext,
  url: string
): Promise<string> {
  const response = await options.fetch(url, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return html;
}

async function listInmates(
  options: AngelinaRosterAdapterOptions,
  context: AdapterContext
): Promise<AngelinaListedInmate[]> {
  return parseAngelinaList(await readHtml(options, context, ANGELINA_COUNTY_CURRENT_SOURCE_URL));
}

async function crawlRoster(
  options: AngelinaRosterAdapterOptions,
  context: AdapterContext
): Promise<AngelinaRoster> {
  const rows = await listInmates(options, context);
  if (rows.length > MAX_RECORDS) throw new Error("ROSTER_TOO_LARGE");
  const records = new Array<AngelinaRecord>(rows.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, rows.length) }, async () => {
      while (next < rows.length) {
        const index = next;
        next += 1;
        const row = rows[index]!;
        const html = await readHtml(options, context, `${DETAIL_URL}${row.jailId}`);
        const record = parseAngelinaDetail(html, row);
        // Someone released after the list was read; start over from a fresh list.
        if (!record) throw new Error("ROSTER_CHANGED_DURING_CRAWL");
        records[index] = record;
      }
    })
  );

  // The list must be unchanged once every detail has been read, or someone may be missing.
  const after = await listInmates(options, context);
  const listed = new Set(rows.map((row) => row.jailId));
  if (after.length !== rows.length || after.some((row) => !listed.has(row.jailId))) {
    throw new Error("ROSTER_CHANGED_DURING_CRAWL");
  }

  // The county jail is never empty; an empty list means the page broke.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return AngelinaRosterSchema.parse({ records, validEmptyMarker: false });
}

async function requestRoster(
  options: AngelinaRosterAdapterOptions,
  context: AdapterContext
): Promise<AngelinaRoster> {
  if (context.source.sourceUrl !== ANGELINA_COUNTY_CURRENT_SOURCE_URL) {
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

export function createAngelinaCountySourceAdapter(
  options: AngelinaRosterAdapterOptions
): SourceAdapter<AngelinaRoster, AngelinaRoster, AngelinaRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: ANGELINA_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: ANGELINA_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<AngelinaRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<AngelinaRoster>> {
      const result = AngelinaRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<AngelinaRoster>> {
      const result = AngelinaRosterSchema.safeParse(payload);
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
              evidence: "The official Angelina County Jail Roster reported zero inmates."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId("booking", record.jailId);
          const charges: Charge[] = record.charges.map((charge, sequence) => ({
            id: options.createId("charge", `${record.jailId}|${sequence}|${charge.description}`),
            bookingId,
            sequence,
            description: charge.description,
            sourceLabel: "Offense",
            statuteCode: null,
            disposition: null
          }));
          // Each charge row carries its own bond.
          const bondEntries: BondEntry[] = record.charges.map((charge, sequence) => ({
            id: options.createId("bond", `${bookingId}|${sequence}|${charge.bondAmountMinor}`),
            bookingId,
            sequence,
            sourceLabel: "Bond Amount",
            note:
              charge.bondAmountMinor === 0
                ? "The source displays $0; this is not interpreted as no bond."
                : charge.bondType,
            state: "monetary",
            amountMinor: charge.bondAmountMinor,
            currency: "USD"
          }));
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: options.createId("person", `${record.jailId}|${record.displayName}`),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The roster shows no booking number; its jail ID only addresses the detail page.
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
        await listInmates(options, context);
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
