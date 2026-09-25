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

export const CEDAR_COUNTY_ADAPTER_KEY = "cedar-county-iowa-current-roster" as const;
export const BLACK_HAWK_COUNTY_ADAPTER_KEY = "black-hawk-county-iowa-current-roster" as const;
export const CEDAR_COUNTY_CURRENT_SOURCE_URL =
  "https://cedarcounty.iowa.gov/sheriff/inmate_roster/" as const;
export const BLACK_HAWK_COUNTY_CURRENT_SOURCE_URL = "https://www.bhcso.org/whos-in-jail" as const;

const SourceDocumentSchema = z.object({
  url: z.string().url(),
  html: z.string().min(1).max(3_000_000)
});
type SourceDocument = z.infer<typeof SourceDocumentSchema>;

const ParsedBondSchema = z.object({
  state: z.enum(["monetary", "no_bond"]),
  amountMinor: z.number().int().nonnegative().optional(),
  note: z.string().max(500).nullable()
});
const ParsedRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  bookingText: z.string().trim().max(200).nullable(),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100),
  bond: ParsedBondSchema
});
const ParsedRosterSchema = z.object({
  records: z.array(ParsedRecordSchema).max(2_000),
  validEmptyMarker: z.boolean()
});
export type IowaParsedRoster = z.infer<typeof ParsedRosterSchema>;

export type IowaRosterSource = "cedar" | "black_hawk";
export type IowaRosterFetch = (input: string, init: RequestInit) => Promise<Response>;
export type IowaRosterIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge" | "bond",
  sourceKey: string
) => string;

export interface IowaRosterAdapterOptions {
  readonly source: IowaRosterSource;
  readonly fetch: IowaRosterFetch;
  readonly facilityId: string;
  readonly createId: IowaRosterIdFactory;
  readonly nowMs?: () => number;
}

function sourceConfig(source: IowaRosterSource) {
  return source === "cedar"
    ? {
        key: CEDAR_COUNTY_ADAPTER_KEY,
        url: CEDAR_COUNTY_CURRENT_SOURCE_URL,
        host: "cedarcounty.iowa.gov"
      }
    : {
        key: BLACK_HAWK_COUNTY_ADAPTER_KEY,
        url: BLACK_HAWK_COUNTY_CURRENT_SOURCE_URL,
        host: "www.bhcso.org"
      };
}

function text(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value: string): number | null {
  const match = /^\$\s*([\d,]+)(?:\.(\d{2}))?$/.exec(text(value));
  if (!match) return null;
  return Number((match[1] ?? "0").replaceAll(",", "")) * 100 + Number(match[2] ?? "00");
}

function parseCedar(document: SourceDocument): IowaParsedRoster {
  const $ = load(document.html);
  const title = text($("title").first().text());
  if (!title.includes("Cedar County") || !title.includes("Inmate Roster")) {
    throw new Error("Cedar source identity was not present");
  }
  const records = $(".jailInmate:not(.header)")
    .toArray()
    .map((element) => {
      const row = $(element);
      const displayName = text(row.find(".inmateName").text());
      const bookingText = text(row.find(".inmateDate").text()) || null;
      const info = row
        .find(".inmateInfo")
        .text()
        .split(/\n|(?=Age:|Sex:|Booked:|Bond:)/)
        .map(text)
        .filter(Boolean);
      const booked =
        info.find((value) => value.startsWith("Booked:"))?.replace(/^Booked:\s*/, "") ??
        "Booking information not published";
      const bondText =
        info.find((value) => value.startsWith("Bond:"))?.replace(/^Bond:\s*/, "") ?? "";
      const amountMinor = parseMoney(bondText);
      return ParsedRecordSchema.parse({
        displayName,
        bookingText,
        charges: [booked],
        bond:
          amountMinor === null
            ? { state: "no_bond", note: bondText || "No bond amount published" }
            : { state: "monetary", amountMinor, note: "Bond" }
      });
    });
  return ParsedRosterSchema.parse({ records, validEmptyMarker: records.length === 0 });
}

function parseBlackHawk(document: SourceDocument): IowaParsedRoster {
  const $ = load(document.html);
  const title = text($("title").first().text());
  if (!title.includes("Black Hawk County") || !title.includes("Who's In Jail")) {
    throw new Error("Black Hawk source identity was not present");
  }
  const records = $("li.jsListItem")
    .toArray()
    .map((element) => {
      const row = $(element);
      const nameElement = row.find(".jsName").first();
      const displayName = text(nameElement.text());
      const bookingText = text(row.find(".jsTimestamp").first().text()) || null;
      let charges: string[] = [];
      try {
        const raw = nameElement.attr("data-charges");
        const parsed = raw ? (JSON.parse(raw) as Array<{ charge?: unknown }>) : [];
        charges = parsed
          .map((item) => text(typeof item.charge === "string" ? item.charge : ""))
          .filter(Boolean);
      } catch {
        throw new Error("Black Hawk charge payload was invalid");
      }
      const bondElement = row.find(".jsBond").first();
      const bondText = text(bondElement.text());
      const amountMinor = parseMoney(bondText) ?? parseMoney(bondElement.attr("data-bond") ?? "");
      const noBond = /no bond/i.test(bondText);
      return ParsedRecordSchema.parse({
        displayName,
        bookingText,
        charges: charges.length > 0 ? charges : ["Charge information not published"],
        bond: noBond
          ? { state: "no_bond", note: bondText }
          : amountMinor === null
            ? { state: "no_bond", note: "Bond amount not published" }
            : { state: "monetary", amountMinor, note: bondText || "Bond" }
      });
    });
  return ParsedRosterSchema.parse({ records, validEmptyMarker: records.length === 0 });
}

function classify(
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const config = sourceConfig(
    context.source.adapterKey === CEDAR_COUNTY_ADAPTER_KEY ? "cedar" : "black_hawk"
  );
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: "parser",
    publicMessage: `The approved ${config.host} source could not be processed safely.`,
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `${config.key.toUpperCase().replaceAll("-", "_")}_${code}`.slice(0, 100)
  };
}

function bondsFor(
  record: IowaParsedRoster["records"][number],
  bookingId: string,
  createId: IowaRosterIdFactory
): BondEntry[] {
  const base = {
    id: createId("bond", `${bookingId}|bond`),
    bookingId,
    sequence: 0,
    sourceLabel: "Bond Amount",
    note: record.bond.note
  };
  return record.bond.state === "monetary"
    ? [
        {
          ...base,
          state: "monetary" as const,
          amountMinor: record.bond.amountMinor ?? 0,
          currency: "USD"
        }
      ]
    : [{ ...base, state: "no_bond" as const }];
}

export function createIowaCurrentRosterAdapter(
  options: IowaRosterAdapterOptions
): SourceAdapter<SourceDocument, IowaParsedRoster, IowaParsedRoster> {
  const config = sourceConfig(options.source);
  const nowMs = options.nowMs ?? (() => Date.now());
  const requestDocument = async (context: AdapterContext): Promise<SourceDocument> => {
    const response = await options.fetch(config.url, {
      method: "GET",
      redirect: "error",
      signal: context.signal,
      headers: { accept: "text/html", "accept-encoding": "identity" }
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const html = await response.text();
    if (!html || html.length > 3_000_000) throw new Error("RESPONSE_SIZE");
    return SourceDocumentSchema.parse({ url: config.url, html });
  };
  const parse = (document: SourceDocument): IowaParsedRoster =>
    options.source === "cedar" ? parseCedar(document) : parseBlackHawk(document);
  return {
    key: config.key,
    adapterVersion: "1.0.0",
    parserVersion: "1.0.0",
    async fetch(context): Promise<FetchResult<SourceDocument>> {
      try {
        return { ok: true, value: await requestDocument(context) };
      } catch (error) {
        return { ok: false, failure: classify(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<IowaParsedRoster>> {
      try {
        return Promise.resolve({ ok: true, value: parse(payload) });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "validate", error) });
      }
    },
    parse(payload, context): Promise<ParseResult<IowaParsedRoster>> {
      try {
        return Promise.resolve({ ok: true, value: ParsedRosterSchema.parse(payload) });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: classify(context, "parse", error) });
      }
    },
    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      return Promise.resolve(
        payload.validEmptyMarker
          ? {
              kind: "valid_empty",
              recordCount: 0,
              evidence:
                "The approved current-roster structure was present and contained no records."
            }
          : { kind: "not_empty", recordCount: payload.records.length }
      );
    },
    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId("snapshot", `${context.source.id}|${context.runId}`);
        const bookings: Booking[] = payload.records.map((record, sourceOrder) => {
          const bookingId = options.createId(
            "booking",
            `${record.displayName}|${record.bookingText ?? sourceOrder}`
          );
          const personId = options.createId("person", record.displayName);
          const charges: Charge[] = record.charges.map((description, sequence) => ({
            id: options.createId("charge", `${bookingId}|${sequence}`),
            bookingId,
            sequence,
            description,
            sourceLabel: "Source charge",
            statuteCode: null,
            disposition: null
          }));
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: personId,
              snapshotId,
              displayName: record.displayName,
              sourceDisplayText: record.displayName
            },
            // The Iowa pages publish a booked date, but neither page labels it as
            // a booking/case identifier. Keep it out of the identifier field so
            // the public model never presents a date as a source ID.
            bookingIdentifier: null,
            custodyScope: "current_custody" as const,
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            bondEntries: bondsFor(record, bookingId, options.createId),
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
        parse(await requestDocument(context));
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
