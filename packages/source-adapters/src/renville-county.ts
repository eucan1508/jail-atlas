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

export const RENVILLE_COUNTY_ADAPTER_KEY = "renville-county-mn-current-roster" as const;
export const RENVILLE_COUNTY_CURRENT_SOURCE_URL =
  "https://custody.renvillecountymn.gov/custody.html" as const;
export const RENVILLE_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;

// The roster is rebuilt every few minutes; a stamp older than this means the export stopped.
const MAX_SOURCE_AGE_MS = 72 * 60 * 60 * 1_000;
const EXPECTED_COLUMNS = [
  "Photo",
  "MNI",
  "Name",
  "Sex",
  "Age",
  "Booking #",
  "Intake Date",
  "Charges",
  "Bail\\Bond"
] as const;

const RenvilleChargeSchema = z.object({
  description: z.string().trim().min(1).max(1_000),
  statuteCode: z.string().trim().min(1).max(100).nullable()
});
const RenvilleRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingNumber: z
    .string()
    .trim()
    .regex(/^\d{1,12}$/),
  charges: z.array(RenvilleChargeSchema).max(100)
});

const RenvilleRosterSchema = z.object({
  records: z.array(RenvilleRecordSchema).max(MAX_RECORDS),
  sourceStampText: z.string().trim().min(1).max(40),
  validEmptyMarker: z.boolean()
});

export type RenvilleRoster = z.infer<typeof RenvilleRosterSchema>;
export type RenvilleRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type RenvilleRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface RenvilleRosterAdapterOptions {
  readonly fetch: RenvilleRosterFetch;
  readonly facilityId: string;
  readonly createId: RenvilleRosterIdFactory;
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
    publicMessage: "The approved Renville County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `RENVILLE_COUNTY_${code}`.slice(0, 100)
  };
}

/** Central-time "In Custody MM-DD-YYYY HH:MM" stamp as an approximate UTC instant (CDT, -5h). */
function stampToDate(stamp: string): Date | null {
  const match = stamp.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, month, day, year, hour, minute] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number
  ];
  return new Date(Date.UTC(year, month - 1, day, hour + 5, minute));
}

/**
 * Reads the jail's "In Custody" export: one DataGrid row per person, with a nested table that
 * lists each charge as a status row (level, status, statute) followed by its description row.
 * The Bail\Bond column is not read: it shows 0.00 for nearly everyone on the list.
 */
export function parseRenvilleRosterHtml(html: string, requestedAt: string): RenvilleRoster {
  // A cut-off download would lose people from the end of the list.
  if (!/<\/HTML>\s*$/i.test(html)) throw new Error("RESPONSE_TRUNCATED");
  const $ = load(html);
  $("br").replaceWith(" ");
  const stamp = normalizeText($("body").text()).match(
    /Renville County Jail In Custody (\d{2}-\d{2}-\d{4} \d{2}:\d{2})/
  )?.[1];
  if (normalizeText($("title").first().text()) !== "Custody" || !stamp) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  const stampDate = stampToDate(stamp);
  if (!stampDate || Date.parse(requestedAt) - stampDate.getTime() > MAX_SOURCE_AGE_MS) {
    throw new Error("SOURCE_STALE");
  }

  const grid = $("table#PopulationReport1_DataGrid1");
  if (grid.length !== 1) throw new Error("ROSTER_STRUCTURE_MISSING");
  const rows = grid.children("tbody").length
    ? grid.children("tbody").children("tr")
    : grid.children("tr");
  const headerCells = rows
    .first()
    .children("td")
    .toArray()
    .map((cell) => normalizeText($(cell).text()));
  if (JSON.stringify(headerCells) !== JSON.stringify(EXPECTED_COLUMNS)) {
    throw new Error("ROSTER_COLUMNS_CHANGED");
  }

  const seen = new Set<string>();
  const records = rows
    .slice(1)
    .toArray()
    .map((row) => {
      const cells = $(row).children("td");
      if (cells.length !== EXPECTED_COLUMNS.length) throw new Error("ROW_STRUCTURE_CHANGED");
      const displayName = normalizeText(cells.eq(2).text());
      const bookingNumber = normalizeText(cells.eq(5).text());
      if (!displayName || !/^\d{1,12}$/.test(bookingNumber)) {
        throw new Error("INVALID_RECORD_IDENTITY");
      }
      if (seen.has(bookingNumber)) throw new Error("DUPLICATE_BOOKING_NUMBER");
      seen.add(bookingNumber);

      const chargeRows = cells.eq(7).find("table").first().find("tr").toArray();
      const charges: z.infer<typeof RenvilleChargeSchema>[] = [];
      chargeRows.forEach((chargeRow, index) => {
        const chargeCells = $(chargeRow).children("td");
        if (chargeCells.length < 5) return;
        // Holds such as "BOP Hold." sit in the statute column; only keep real statute citations.
        const statuteText = normalizeText(chargeCells.eq(4).text());
        const statute = /^\d/.test(statuteText) ? statuteText : "";
        const next = chargeRows[index + 1];
        const descriptionCell = next ? $(next).children("td[colspan]") : null;
        const description = descriptionCell ? normalizeText(descriptionCell.text()) : "";
        if (!description && !statute) throw new Error("EMPTY_CHARGE");
        charges.push({ description: description || statute, statuteCode: statute || null });
      });
      return RenvilleRecordSchema.parse({ displayName, bookingNumber, charges });
    });

  // A 72-bed jail that also holds federal inmates is never empty; an empty grid means a broken export.
  if (records.length === 0) throw new Error("ROSTER_EMPTY");
  return RenvilleRosterSchema.parse({ records, sourceStampText: stamp, validEmptyMarker: false });
}

async function requestRoster(
  options: RenvilleRosterAdapterOptions,
  context: AdapterContext
): Promise<RenvilleRoster> {
  if (context.source.sourceUrl !== RENVILLE_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(RENVILLE_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return parseRenvilleRosterHtml(html, context.requestedAt);
}

export function createRenvilleCountySourceAdapter(
  options: RenvilleRosterAdapterOptions
): SourceAdapter<RenvilleRoster, RenvilleRoster, RenvilleRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: RENVILLE_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: RENVILLE_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<RenvilleRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<RenvilleRoster>> {
      const result = RenvilleRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<RenvilleRoster>> {
      const result = RenvilleRosterSchema.safeParse(payload);
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
              evidence: "The official Renville County roster reported zero people in custody."
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
