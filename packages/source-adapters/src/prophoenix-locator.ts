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
import { assertFewWithoutCharges } from "./charge-gaps.js";

/**
 * Minnesota sheriffs whose jail runs the ProPhoenix "Inmate Locator": an ASP.NET page whose
 * results grid lists everyone in custody, and whose charges appear only after a person's row is
 * selected, which posts the page back to itself.
 */
export interface ProPhoenixLocatorConfig {
  readonly adapterKey: string;
  readonly countyName: string;
  readonly diagnosticPrefix: string;
  readonly sourceUrl: string;
  readonly parserVersion: string;
  /** Some locators open with an empty grid until the (blank) search is submitted. */
  readonly searchFirst: boolean;
}

export const HUBBARD_COUNTY_LOCATOR = {
  adapterKey: "hubbard-county-mn-current-roster",
  countyName: "Hubbard County",
  diagnosticPrefix: "HUBBARD_COUNTY",
  sourceUrl: "https://prophoenix.co.hubbard.mn.us/InmateLocator/",
  parserVersion: "1.0.0",
  searchFirst: false
} as const satisfies ProPhoenixLocatorConfig;

export const KANABEC_COUNTY_LOCATOR = {
  adapterKey: "kanabec-county-mn-current-roster",
  countyName: "Kanabec County",
  diagnosticPrefix: "KANABEC_COUNTY",
  sourceUrl: "https://jail.kanabec.org/inmatelocator/",
  parserVersion: "1.0.0",
  searchFirst: true
} as const satisfies ProPhoenixLocatorConfig;

export const PROPHOENIX_LOCATORS: readonly ProPhoenixLocatorConfig[] = [
  HUBBARD_COUNTY_LOCATOR,
  KANABEC_COUNTY_LOCATOR
];

export function proPhoenixLocator(
  adapterKey: string | null | undefined
): ProPhoenixLocatorConfig | undefined {
  return PROPHOENIX_LOCATORS.find((config) => config.adapterKey === adapterKey);
}

const MAX_PAGE_BYTES = 1_000_000;
// The results grid renders up to 500 rows (its virtual-scrolling page); a full page could hide more.
const MAX_GRID_ROWS = 500;
const MAX_RECORDS = MAX_GRID_ROWS - 1;
const RESULTS = "grdSrchResults";
const CHARGES = "grdInmateCharge";
const FIELD = "_ctl0:";
const GENDER = "_ctl0:CpnlMain:ctrlUsrSrchTools:lstGender";
const SEARCH = "_ctl0:CpnlMain:ctrlUsrSrchTools:cmdSearch";
const GRID_STATE = "_ctl0_CpnlMain_ctrlUsrSrchRslt_grdSrchResults_clientState";
const BOOKING_NUMBER = /^\d{10}$/;
const NAME_PART = /^[\p{L}][\p{L}' .-]*$/u;
const LEVELS: Readonly<Record<string, string>> = {
  F: "Felony",
  GM: "Gross Misdemeanor",
  M: "Misdemeanor",
  PM: "Petty Misdemeanor"
};

const ProPhoenixRecordSchema = z.object({
  bookingNumber: z.string().regex(BOOKING_NUMBER),
  displayName: z.string().trim().min(2).max(250),
  charges: z
    .array(
      z.object({
        statuteCode: z.string().trim().min(1).max(100).nullable(),
        description: z.string().trim().min(1).max(1_000)
      })
    )
    .max(200)
});
const ProPhoenixRosterSchema = z.object({
  records: z.array(ProPhoenixRecordSchema).max(MAX_RECORDS),
  validEmptyMarker: z.boolean()
});

export type ProPhoenixRoster = z.infer<typeof ProPhoenixRosterSchema>;
export type ProPhoenixFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type ProPhoenixIdFactory = (
  kind: "snapshot" | "person" | "booking" | "charge",
  sourceKey: string
) => string;

export interface ProPhoenixAdapterOptions {
  readonly fetch: ProPhoenixFetch;
  readonly facilityId: string;
  readonly createId: ProPhoenixIdFactory;
  readonly nowMs?: () => number;
}

type GridRow = Readonly<Record<string, string | null>>;
type LocatorPage = Readonly<{ fields: Record<string, string>; rows: GridRow[] }>;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(
  config: ProPhoenixLocatorConfig,
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  const code =
    error instanceof Error ? error.message.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 80) : "UNKNOWN";
  return {
    stage,
    classification: stage === "fetch" || stage === "health_check" ? "network" : "parser",
    publicMessage: `The approved ${config.countyName}, Minnesota inmate locator could not be processed safely.`,
    retryable: true,
    occurredAt: context.requestedAt,
    diagnosticCode: `${config.diagnosticPrefix}_${code}`.slice(0, 100)
  };
}

/** A grid cell's value, as the grid prints it: a quoted string, a number, or null. */
function cellValue(dataIg: string | undefined): string | null {
  // Columns the grid never fills (court dates, facility) are printed without a value.
  if (dataIg === undefined) return null;
  const raw = dataIg.match(/:val:([\s\S]*)$/)?.[1];
  if (raw === undefined) throw new Error("GRID_UNREADABLE");
  if (raw === "null") return null;
  if (raw.startsWith('"')) {
    try {
      return normalizeText(JSON.parse(raw) as string);
    } catch {
      throw new Error("GRID_UNREADABLE");
    }
  }
  return normalizeText(raw);
}

/** Reads one Infragistics grid on the page into rows keyed by column key. */
export function readProPhoenixGrid(html: string, grid: string): GridRow[] {
  const $ = load(html);
  const keys = new Map<string, string>();
  $(`th[id^="${grid}_columnheader_"]`).each((_, header) => {
    const key = $(header)
      .attr("data-ig")
      ?.match(/:key:([A-Za-z0-9_]+):/)?.[1];
    if (key) keys.set($(header).attr("id")!, key);
  });
  const cells = $(`td[role="gridcell"][aria-describedby^="${grid}_columnheader_"]`);
  // An empty grid can render without its header row; cells without headers mean it changed.
  if (keys.size === 0) {
    if (cells.length > 0) throw new Error("GRID_UNREADABLE");
    return [];
  }
  const rows: GridRow[] = [];
  cells.each((_, cell) => {
    const row = $(cell).closest('tr[role="row"]');
    const index = Number(row.attr("adr"));
    if (!Number.isInteger(index) || index < 0) throw new Error("GRID_UNREADABLE");
    const key = keys.get($(cell).attr("aria-describedby")!);
    if (!key) throw new Error("GRID_UNREADABLE");
    const target = (rows[index] ??= {}) as Record<string, string | null>;
    target[key] = cellValue($(cell).attr("data-ig"));
  });
  // Rows must run 0..n-1 with no gaps, or the grid was cut short.
  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index] === undefined) throw new Error("GRID_UNREADABLE");
  }
  return rows;
}

function readPage(config: ProPhoenixLocatorConfig, html: string): LocatorPage {
  const $ = load(html);
  const title = normalizeText($("title").first().text());
  if (title !== `:: ${config.countyName} :: Inmate Locator`) {
    throw new Error("SOURCE_IDENTITY_MISMATCH");
  }
  if (!html.trimEnd().toLowerCase().endsWith("</html>")) throw new Error("PAGE_TRUNCATED");
  const fields: Record<string, string> = {};
  $("form#aspnetForm input[name]").each((_, input) => {
    const type = ($(input).attr("type") ?? "text").toLowerCase();
    if (type === "submit" || type === "image" || type === "button") return;
    fields[$(input).attr("name")!] = $(input).attr("value") ?? "";
  });
  if (!fields["__VIEWSTATE"] || !(GRID_STATE in fields)) throw new Error("FORM_UNREADABLE");
  fields[GENDER] = "U";
  return { fields, rows: readProPhoenixGrid(html, RESULTS) };
}

/** The grid's client state after a click on a row's name cell, as the browser posts it. */
function selectionState(total: number, index: number): string {
  const pair = `{"index":${index},"key":[${index}]}`;
  return (
    `[[[[null,${total},0]],[[[[[0]],[],null],[null,null],[null]],[[[[4]],[],null],[null,null],[null]],` +
    `[[[["Activation",null]],[],[]],[{"0":[1,{"rowIDPair":${pair},"columnIDPair":{"index":21,"key":["FullName"]}}]},[]],null],` +
    `[[[["Selection",1,null,1,null,null,null]],[],[]],[{"2":[6,[${pair}]]},[]],null],` +
    `[[[["Sorting"]],[],[{}]],[{},[{}]],null],` +
    `[[[["VirtualScrolling",500,"igg_VirtualScrollTooltip",null,null,null,null,451]],[],[]],[{},[]],null]],null],[{},[{},{}]],[]]`
  );
}

function displayName(row: GridRow): string {
  const last = normalizeText(row["LastName"]);
  const first = normalizeText(row["FirstName"]);
  const rest = [row["MiddleName"], row["NameSuffix"]].map(normalizeText).filter(Boolean);
  if (
    !NAME_PART.test(last) ||
    !NAME_PART.test(first) ||
    rest.some((part) => !NAME_PART.test(part))
  ) {
    throw new Error("NAME_UNREADABLE");
  }
  // The grid's own name column ("Last,First") must agree with the separate parts.
  if (normalizeText(row["FullName"]) !== `${last},${first}`) throw new Error("NAME_UNREADABLE");
  return [`${last},`, first, ...rest].join(" ");
}

/** "F-Assault-2nd Degree-Dangerous Weapon" with severity F → "Assault-2nd Degree-Dangerous Weapon (Felony)". */
export function formatProPhoenixCharge(description: string, severity: string): string {
  const level = LEVELS[severity];
  let text = description;
  if (text.startsWith(`${severity}-`)) text = text.slice(severity.length + 1).trim();
  // Some entries already open with the level ("(Felony) Sentences - …").
  if (level && text.startsWith(`(${level}) `)) text = text.slice(level.length + 3).trim();
  return level ? `${text} (${level})` : text;
}

async function requestHtml(
  options: ProPhoenixAdapterOptions,
  context: AdapterContext,
  url: string,
  body?: URLSearchParams
): Promise<string> {
  const response = await options.fetch(url, {
    method: body ? "POST" : "GET",
    redirect: "error",
    signal: context.signal,
    headers: { accept: "text/html", "accept-encoding": "identity" },
    ...(body ? { body } : {})
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length > MAX_PAGE_BYTES) throw new Error("RESPONSE_SIZE");
  return html;
}

async function requestRoster(
  config: ProPhoenixLocatorConfig,
  options: ProPhoenixAdapterOptions,
  context: AdapterContext
): Promise<ProPhoenixRoster> {
  if (context.source.sourceUrl !== config.sourceUrl) throw new Error("SOURCE_URL_MISMATCH");
  let list = readPage(config, await requestHtml(options, context, config.sourceUrl));
  if (config.searchFirst) {
    if (list.rows.length > 0) throw new Error("LAYOUT_CHANGED");
    const search = new URLSearchParams({ ...list.fields, [SEARCH]: "Search" });
    list = readPage(config, await requestHtml(options, context, config.sourceUrl, search));
  }
  if (list.rows.length >= MAX_GRID_ROWS) throw new Error("ROSTER_TOO_LARGE");
  // The county jail is never empty; a grid without people means the locator broke.
  if (list.rows.length === 0) throw new Error("ROSTER_EMPTY");

  const records: ProPhoenixRoster["records"] = [];
  for (const [index, row] of list.rows.entries()) {
    const bookingNumber = normalizeText(row["BookingNbr"]);
    if (!BOOKING_NUMBER.test(bookingNumber)) throw new Error("BOOKING_NUMBER_UNREADABLE");
    const name = displayName(row);
    const senderId = normalizeText(row["BookId"]);
    if (!/^\d{1,20}$/.test(senderId)) throw new Error("GRID_UNREADABLE");
    const select = new URLSearchParams({
      ...list.fields,
      [GRID_STATE]: selectionState(list.rows.length, index),
      [`${FIELD}hdnSenderId`]: senderId,
      [`${FIELD}hdnSrchResultCellClick`]: "1",
      [`${FIELD}hdnSelectedCellIndex`]: String(index),
      [`${FIELD}hdnBookNbr`]: ""
    });
    const detail = await requestHtml(options, context, config.sourceUrl, select);
    const $ = load(detail);
    // The detail must be this person's: the page echoes the selected booking number and name.
    const echoed = normalizeText($(`input[name="${FIELD}hdnBookNbr"]`).attr("value"));
    const shown = normalizeText($("#_ctl0_CpnlMain_ctrlUsrInmateDtl_lblInmateName").text());
    if (echoed !== bookingNumber || shown !== normalizeText(row["FullName"])) {
      throw new Error("DETAIL_MISMATCH");
    }
    const charges = readProPhoenixGrid(detail, CHARGES).map((charge) => {
      const description = normalizeText(charge["Description"]);
      const severity = normalizeText(charge["Severity"]);
      if (!description) throw new Error("CHARGE_UNREADABLE");
      return {
        statuteCode: normalizeText(charge["Charge"]) || null,
        description: formatProPhoenixCharge(description, severity)
      };
    });
    records.push({ bookingNumber, displayName: name, charges });
  }

  if (new Set(records.map((record) => record.bookingNumber)).size !== records.length) {
    throw new Error("DUPLICATE_BOOKING");
  }
  assertFewWithoutCharges(
    records.filter((record) => record.charges.length === 0).length,
    records.length
  );
  return ProPhoenixRosterSchema.parse({ records, validEmptyMarker: false });
}

/** A single page load; the full crawl, one request per person, runs once per refresh. */
async function checkLocator(
  config: ProPhoenixLocatorConfig,
  options: ProPhoenixAdapterOptions,
  context: AdapterContext
): Promise<void> {
  if (context.source.sourceUrl !== config.sourceUrl) throw new Error("SOURCE_URL_MISMATCH");
  readPage(config, await requestHtml(options, context, config.sourceUrl));
}

export function createProPhoenixLocatorAdapter(
  config: ProPhoenixLocatorConfig,
  options: ProPhoenixAdapterOptions
): SourceAdapter<ProPhoenixRoster, ProPhoenixRoster, ProPhoenixRoster> {
  const nowMs = options.nowMs ?? (() => Date.now());
  const fail = (context: AdapterContext, stage: AdapterStage, error: unknown) =>
    classify(config, context, stage, error);
  return {
    key: config.adapterKey,
    adapterVersion: "1.0.0",
    parserVersion: config.parserVersion,
    async fetch(context): Promise<FetchResult<ProPhoenixRoster>> {
      try {
        return { ok: true, value: await requestRoster(config, options, context) };
      } catch (error) {
        return { ok: false, failure: fail(context, "fetch", error) };
      }
    },
    validate(payload, context): Promise<ValidationResult<ProPhoenixRoster>> {
      const result = ProPhoenixRosterSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: fail(context, "validate", result.error) }
      );
    },
    parse(payload, context): Promise<ParseResult<ProPhoenixRoster>> {
      const result = ProPhoenixRosterSchema.safeParse(payload);
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
              evidence: `The official ${config.countyName} inmate locator listed no one.`
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
              sourceLabel: "Booking#",
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
        return Promise.resolve({ ok: false, failure: fail(context, "normalize", error) });
      }
    },
    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        await checkLocator(config, options, context);
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
      return classify(config, context, stage, error);
    }
  };
}
