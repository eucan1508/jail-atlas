import { NormalizedCustodySnapshotSchema, type Booking, type Charge } from "@jail-atlas/domain";
import { load, type CheerioAPI } from "cheerio/slim";
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

export const DOUGLAS_COUNTY_ADAPTER_KEY = "douglas-county-mn-current-roster" as const;
export const DOUGLAS_COUNTY_CURRENT_SOURCE_URL =
  "https://www.douglascountymn.gov/inmate-roster" as const;
export const DOUGLAS_COUNTY_PARSER_VERSION = "1.0.0" as const;

const MAX_RECORDS = 1_000;
const MAX_PAGE_BYTES = 3_000_000;

const DouglasRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});

const DouglasRosterSchema = z.object({
  records: z.array(DouglasRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type DouglasRoster = z.infer<typeof DouglasRosterSchema>;
export type DouglasRosterFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type DouglasRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface DouglasRosterAdapterOptions {
  readonly fetch: DouglasRosterFetch;
  readonly facilityId: string;
  readonly createId: DouglasRosterIdFactory;
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
    publicMessage: "The approved Douglas County roster could not be processed safely.",
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `DOUGLAS_COUNTY_${code}`.slice(0, 100)
  };
}

function sourceIdentity($: CheerioAPI): void {
  const title = normalizeText($("title").first().text());
  const body = normalizeText($("body").text());
  if (
    !title.includes("Douglas County") ||
    !title.includes("Inmate Roster") ||
    !/Inmate Roster sorted by Name as of \d{1,2}\/\d{1,2}\/\d{4}/.test(body)
  ) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
}

/** Reads the roster page. Each person is one result item; each charge is a block split by <hr>. */
export function parseDouglasRosterHtml(html: string): DouglasRoster {
  const $ = load(html);
  sourceIdentity($);

  // The page must show every result at once: "Results 1 - 40 of 40". A paged view fails closed.
  const resultLines = $("[id$='_paginationtop'], [id$='_paginationbtm']")
    .toArray()
    .map((element) => normalizeText($(element).text()));
  const totals = resultLines.map((line) => line.match(/^Results (\d+) - (\d+) of (\d+)$/));
  const items = $(".news-results-view-item").toArray();
  let declaredCount: number;
  if (totals.length > 0 && totals.every((match) => match !== null)) {
    const [first, last, total] = (totals[0] as RegExpMatchArray).slice(1).map(Number) as [
      number,
      number,
      number
    ];
    if (first !== 1 || last !== total || totals.some((match) => match?.[0] !== totals[0]?.[0])) {
      throw new Error("ROSTER_PAGINATED");
    }
    declaredCount = total;
  } else if (totals.length === 0 && items.length === 0) {
    throw new Error("ROSTER_STRUCTURE_MISSING");
  } else {
    throw new Error("RESULT_COUNT_UNREADABLE");
  }

  const records = items.map((item) => {
    const card = $(item);
    const displayName = normalizeText(card.children("h3").first().text());
    if (!displayName || /:$/.test(displayName)) throw new Error("INVALID_RECORD_IDENTITY");
    const charges = card
      .children("p")
      .toArray()
      .map((paragraph) => $(paragraph))
      .filter((paragraph) => normalizeText(paragraph.find("strong").first().text()) === "Charges:")
      .map((paragraph) => {
        const clone = paragraph.clone();
        clone.find("strong").first().remove();
        return normalizeText(clone.text());
      })
      .filter(Boolean);
    return DouglasRecordSchema.parse({ displayName, charges });
  });

  if (records.length !== declaredCount) throw new Error("RECORD_COUNT_MISMATCH");
  return DouglasRosterSchema.parse({ records, validEmptyMarker: declaredCount === 0 });
}

async function requestRoster(
  options: DouglasRosterAdapterOptions,
  context: AdapterContext
): Promise<DouglasRoster> {
  if (context.source.sourceUrl !== DOUGLAS_COUNTY_CURRENT_SOURCE_URL) {
    throw new Error("SOURCE_URL_MISMATCH");
  }
  const response = await options.fetch(DOUGLAS_COUNTY_CURRENT_SOURCE_URL, {
    method: "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" }
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return parseDouglasRosterHtml(html);
}

export function createDouglasCountySourceAdapter(
  options: DouglasRosterAdapterOptions
): SourceAdapter<DouglasRoster, DouglasRoster, DouglasRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  return {
    key: DOUGLAS_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: DOUGLAS_COUNTY_PARSER_VERSION,
    async fetch(context): Promise<FetchResult<DouglasRoster>> {
      try {
        return { ok: true, value: await requestRoster(options, context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<DouglasRoster>> {
      const result = DouglasRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: classify(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<DouglasRoster>> {
      const result = DouglasRosterSchema.safeParse(payload);
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
                "The official Douglas County inmate roster explicitly reported zero results."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          // No booking number is published; the roster order and name identify the entry.
          const recordKey = `${sourceOrder}|${record.displayName}`;
          const bookingId = options.createId("booking", recordKey);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${recordKey}|${sequence}|${description}`),
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
              id: options.createId("person", recordKey),
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
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
