import {
  NormalizedCustodySnapshotSchema,
  type Booking,
  type Charge,
  type NormalizedCustodySnapshot
} from "@jail-atlas/domain";
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

export const DALLAS_COUNTY_ADAPTER_KEY = "dallas-newworld-inmate-inquiry" as const;
export const DALLAS_COUNTY_PARSER_VERSION = "1.0.0" as const;
export const DALLAS_COUNTY_CURRENT_SOURCE_URL =
  "https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True" as const;
export const DALLAS_COUNTY_SOURCE_HOST = "inmates.dallascountyiowa.gov" as const;
export const DALLAS_COUNTY_SOURCE_PATH = "/NewWorld.InmateInquiry/dallas" as const;

const expectedListHeaders = [
  "Photo",
  "Name",
  "In Custody",
  "Race",
  "Gender",
  "Height",
  "Weight",
  "Multiple Bookings"
] as const;

const SourceDocumentSchema = z.object({
  url: z.string().url(),
  html: z.string().min(1).max(2_000_000)
});
type SourceDocument = z.infer<typeof SourceDocumentSchema>;

const DallasFetchedBundleSchema = z.object({
  listDocuments: z.array(SourceDocumentSchema).min(1).max(20),
  detailDocuments: z.array(SourceDocumentSchema).max(500)
});
export type DallasFetchedBundle = z.infer<typeof DallasFetchedBundleSchema>;

const ListRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  custodyStatus: z.literal("Yes"),
  multipleBookings: z.boolean(),
  detailUrl: z.string().url()
});

const ValidatedListPageSchema = z.object({
  url: z.string().url(),
  pageNumber: z.number().int().positive(),
  records: z.array(ListRecordSchema).max(500),
  validEmptyMarker: z.boolean(),
  nextPageUrl: z.string().url().nullable()
});
type ValidatedListPage = z.infer<typeof ValidatedListPageSchema>;

const ParsedRecordSchema = z.object({
  displayName: z.string().trim().min(1).max(250),
  detailUrl: z.string().url(),
  sourceOrder: z.number().int().nonnegative(),
  bookingIdentifier: z.string().trim().min(1).max(200),
  bookingDateText: z.string().trim().min(1).max(200).nullable(),
  charges: z.array(z.string().trim().min(1).max(1_000)).max(100)
});

const DallasValidatedBundleSchema = z.object({
  records: z.array(ParsedRecordSchema).max(500),
  validEmptyMarker: z.boolean()
});
export type DallasValidatedBundle = z.infer<typeof DallasValidatedBundleSchema>;
export type DallasParsedBundle = DallasValidatedBundle;

const DallasAdapterLimitsSchema = z.object({
  maxListPages: z.number().int().min(1).max(20).default(10),
  maxRecords: z.number().int().min(1).max(500).default(250),
  maxDocumentBytes: z.number().int().min(16_384).max(2_000_000).default(1_000_000)
});

export type DallasEntityKind = "snapshot" | "person" | "booking" | "charge" | "bond";
export type DallasIdFactory = (kind: DallasEntityKind, sourceKey: string) => string;
export type DallasSourceFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface DallasCountyAdapterOptions {
  readonly fetch: DallasSourceFetch;
  readonly facilityId: string;
  readonly createId: DallasIdFactory;
  readonly currency: "USD";
  readonly limits?: Partial<z.input<typeof DallasAdapterLimitsSchema>>;
  readonly nowMs?: () => number;
}

type DallasAdapterErrorClassification = FailureClassification["classification"];

export class DallasCountyAdapterError extends Error {
  readonly code: string;
  readonly classification: DallasAdapterErrorClassification;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    classification: DallasAdapterErrorClassification,
    retryable: boolean
  ) {
    super(message);
    this.name = "DallasCountyAdapterError";
    this.code = code;
    this.classification = classification;
    this.retryable = retryable;
  }
}

function adapterError(
  code: string,
  message: string,
  classification: DallasAdapterErrorClassification = "validation",
  retryable = false
): DallasCountyAdapterError {
  return new DallasCountyAdapterError(code, message, classification, retryable);
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBookingHeading(value: string): boolean {
  return value !== "Booking History" && /^Booking\s+\S/.test(value);
}

function exactUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw adapterError("DALLAS_INVALID_URL", "The source emitted an invalid URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== DALLAS_COUNTY_SOURCE_HOST ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw adapterError("DALLAS_URL_BOUNDARY", "The source URL left its approved boundary.");
  }
  return url;
}

function validateListUrl(input: string): URL {
  const url = exactUrl(input);
  if (url.pathname !== DALLAS_COUNTY_SOURCE_PATH) {
    throw adapterError("DALLAS_LIST_PATH", "The list URL used an unexpected path.");
  }

  const keys = [...url.searchParams.keys()];
  if (
    keys.some((key) => key !== "InCustody" && key !== "Page") ||
    url.searchParams.getAll("InCustody").length !== 1 ||
    url.searchParams.get("InCustody")?.toLowerCase() !== "true" ||
    url.searchParams.getAll("Page").length > 1
  ) {
    throw adapterError("DALLAS_LIST_SCOPE", "The list URL lost its exact current-custody scope.");
  }

  const page = url.searchParams.get("Page");
  if (page !== null && !/^[1-9]\d*$/.test(page)) {
    throw adapterError("DALLAS_PAGE_VALUE", "The source emitted an invalid page number.");
  }
  return url;
}

function validateDetailUrl(input: string, base: string): URL {
  let resolved: URL;
  try {
    resolved = new URL(input, base);
  } catch {
    throw adapterError("DALLAS_DETAIL_URL", "The source emitted an invalid detail URL.");
  }
  const url = exactUrl(resolved.href);
  const prefix = `${DALLAS_COUNTY_SOURCE_PATH}/Inmate/Detail/`;
  if (!url.pathname.startsWith(prefix) || url.search !== "") {
    throw adapterError("DALLAS_DETAIL_PATH", "A detail URL left its approved path.");
  }
  const locator = url.pathname.slice(prefix.length);
  if (
    locator.length === 0 ||
    locator.length > 300 ||
    locator.includes("/") ||
    !/^[A-Za-z0-9._~%-]+$/.test(locator)
  ) {
    throw adapterError("DALLAS_DETAIL_LOCATOR", "A detail URL contained an invalid locator.");
  }
  return url;
}

function tableHeaders($: CheerioAPI, table: ReturnType<CheerioAPI>): readonly string[] {
  return table
    .find("thead th")
    .map((_index, element) => normalizeText($(element).text()))
    .get();
}

function hasEveryHeader(headers: readonly string[], expected: readonly string[]): boolean {
  return expected.every((header) => headers.includes(header));
}

function assertSourceIdentity($: CheerioAPI, detailName?: string): void {
  const title = normalizeText($("title").first().text());
  const heading = $("h1, h2")
    .toArray()
    .some((element) => normalizeText($(element).text()) === "Dallas County Inmate Inquiry");
  const disclaimer = $(".disclaimer, #disclaimer, [data-disclaimer], .alert")
    .toArray()
    .some((element) => normalizeText($(element).text()).length > 0);
  const inlineDisclaimer = $(".Header")
    .toArray()
    .some((element) => {
      const text = normalizeText($(element).text());
      return (
        text.includes("Disclaimer:") &&
        text.includes("Record of an arrest is not an indication of guilt.")
      );
    });
  // The reviewed official page changed its document title to "Inmate Search"
  // while retaining the Dallas heading, disclaimer, current-custody filter,
  // and table structure. Require those body markers so the relaxed title is
  // still bound to the reviewed official source.
  const reviewedTitle =
    title === "Dallas County Inmate Inquiry" ||
    (detailName === undefined
      ? title === "Inmate Search"
      : title === `Inmate Detail - ${detailName}`);
  if (!reviewedTitle || !heading || (!disclaimer && !inlineDisclaimer)) {
    throw adapterError(
      "DALLAS_IDENTITY_MISSING",
      "The response did not contain the reviewed Dallas County inquiry identity.",
      "invalid_response",
      true
    );
  }
}

function assertCurrentFilter($: CheerioAPI): void {
  const checkedCurrentFilter = $('input[name="InCustody"]')
    .toArray()
    .some((element) => {
      const input = $(element);
      return (
        (input.attr("value") ?? "").toLowerCase() === "true" && input.attr("checked") !== undefined
      );
    });
  if (!checkedCurrentFilter) {
    throw adapterError(
      "DALLAS_CURRENT_FILTER_MISSING",
      "The response did not preserve the explicit current-custody filter.",
      "invalid_response",
      true
    );
  }
}

function findListTable($: CheerioAPI): ReturnType<CheerioAPI> {
  const element = $("table")
    .toArray()
    .find((candidate) => hasEveryHeader(tableHeaders($, $(candidate)), expectedListHeaders));
  if (element === undefined) {
    throw adapterError(
      "DALLAS_LIST_HEADERS",
      "The response did not contain the reviewed custody table headers.",
      "parser",
      true
    );
  }
  return $(element);
}

function pageNumber(url: URL): number {
  return Number(url.searchParams.get("Page") ?? "1");
}

function parseListPage(document: SourceDocument): ValidatedListPage {
  const url = validateListUrl(document.url);
  const $ = load(document.html);
  assertSourceIdentity($);
  assertCurrentFilter($);
  const table = findListTable($);
  const headers = tableHeaders($, table);
  const nameIndex = headers.indexOf("Name");
  const custodyIndex = headers.indexOf("In Custody");
  const multipleIndex = headers.indexOf("Multiple Bookings");
  const records: z.infer<typeof ListRecordSchema>[] = [];
  let validEmptyMarker = false;

  table.find("tbody tr").each((_rowIndex, rowElement) => {
    const cells = $(rowElement).find("td");
    const values = cells
      .map((_cellIndex, cellElement) => normalizeText($(cellElement).text()))
      .get();
    if (values.length === 1 && values[0] === "No data") {
      validEmptyMarker = true;
      return;
    }
    if (values.length < headers.length) {
      throw adapterError("DALLAS_LIST_ROW_SHAPE", "A custody row did not match its headers.");
    }

    const nameCell = cells.eq(nameIndex);
    const displayName = normalizeText(nameCell.text());
    const custodyStatus = values[custodyIndex];
    const multipleText = values[multipleIndex];
    const detailHref = nameCell.find('a[href*="/Inmate/Detail/"]').first().attr("href");
    if (
      displayName.length === 0 ||
      custodyStatus !== "Yes" ||
      (multipleText !== "Yes" && multipleText !== "No" && multipleText !== "") ||
      detailHref === undefined
    ) {
      throw adapterError(
        "DALLAS_LIST_ROW_VALUE",
        "A custody row did not contain the required explicit source values."
      );
    }
    records.push(
      ListRecordSchema.parse({
        displayName,
        custodyStatus,
        multipleBookings: multipleText === "Yes",
        detailUrl: validateDetailUrl(detailHref, url.href).href
      })
    );
  });

  if (validEmptyMarker && records.length > 0) {
    throw adapterError(
      "DALLAS_EMPTY_WITH_RECORDS",
      "The source mixed records with its empty marker."
    );
  }
  if (!validEmptyMarker && records.length === 0) {
    throw adapterError(
      "DALLAS_UNMARKED_EMPTY",
      "The source returned no records without its reviewed empty marker.",
      "validation",
      true
    );
  }

  const currentPage = pageNumber(url);
  const emittedFuturePages = $("a[href]")
    .toArray()
    .flatMap((element) => {
      const href = $(element).attr("href");
      if (href === undefined) return [];
      let candidate: URL;
      try {
        candidate = new URL(href, url);
      } catch {
        return [];
      }
      if (!candidate.searchParams.has("Page")) return [];
      const validated = validateListUrl(candidate.href);
      const candidatePage = pageNumber(validated);
      return candidatePage > currentPage ? [{ page: candidatePage, url: validated.href }] : [];
    })
    .sort((left, right) => left.page - right.page);
  const next = emittedFuturePages[0] ?? null;
  if (next !== null && next.page !== currentPage + 1) {
    throw adapterError("DALLAS_PAGE_GAP", "The emitted paginator skipped a page.");
  }
  if (validEmptyMarker && next !== null) {
    throw adapterError(
      "DALLAS_EMPTY_WITH_PAGER",
      "An empty roster unexpectedly emitted a next page."
    );
  }

  return ValidatedListPageSchema.parse({
    url: url.href,
    pageNumber: currentPage,
    records,
    validEmptyMarker,
    nextPageUrl: next?.url ?? null
  });
}

function ownText($: CheerioAPI, element: ReturnType<CheerioAPI>): string {
  const clone = element.clone();
  clone.children().remove();
  return normalizeText(clone.text()).replace(/:$/, "");
}

function labeledValue($: CheerioAPI, scope: ReturnType<CheerioAPI>, label: string): string | null {
  const labelElement = scope
    .find("dt, th, td, label, strong, b, span, .field-label")
    .toArray()
    .find((element) => ownText($, $(element)) === label);
  if (labelElement === undefined) return null;

  const candidate = $(labelElement);
  const sibling = candidate.next("dd, td, span, div").first();
  if (sibling.length > 0) return normalizeText(sibling.text());
  const rowSibling = candidate.closest("tr").find("td").eq(1);
  if (rowSibling.length > 0) return normalizeText(rowSibling.text());

  const parent = candidate.parent().clone();
  parent.find("dt, th, td, label, strong, b, span, .field-label").first().remove();
  const parentValue = normalizeText(parent.text());
  return parentValue.length > 0 ? parentValue : "";
}

function findBookingContainers($: CheerioAPI): readonly ReturnType<CheerioAPI>[] {
  const headings = $("h1, h2, h3, h4, h5, h6")
    .toArray()
    .filter((element) => isBookingHeading(normalizeText($(element).text())));
  if (headings.length === 0) {
    throw adapterError("DALLAS_BOOKING_HEADING", "The detail page had no labeled booking section.");
  }

  return headings.map((heading) => {
    const candidate = $(heading).closest("[data-booking], .booking-panel, .panel, .card, article");
    const container = candidate.length > 0 ? candidate.first() : $(heading).parent();
    const bookingHeadingCount = container
      .find("h1, h2, h3, h4, h5, h6")
      .toArray()
      .filter((element) => isBookingHeading(normalizeText($(element).text()))).length;
    if (bookingHeadingCount !== 1) {
      throw adapterError(
        "DALLAS_BOOKING_BOUNDARY",
        "The detail page did not preserve one booking per reviewed container."
      );
    }
    return container;
  });
}

function matchingTable(
  $: CheerioAPI,
  scope: ReturnType<CheerioAPI>,
  headers: readonly string[]
): ReturnType<CheerioAPI> | null {
  const element = scope
    .find("table")
    .toArray()
    .find((candidate) => hasEveryHeader(tableHeaders($, $(candidate)), headers));
  return element === undefined ? null : $(element);
}

function parseCharges($: CheerioAPI, booking: ReturnType<CheerioAPI>): readonly string[] {
  const table = matchingTable($, booking, ["Number", "Charge Description"]);
  if (table === null) return [];
  const headers = tableHeaders($, table);
  const descriptionIndex = headers.indexOf("Charge Description");
  const charges: string[] = [];
  table.find("tbody tr").each((_index, row) => {
    const cells = $(row).find("td");
    if (cells.length === 1 && normalizeText(cells.text()) === "No data") return;
    if (cells.length < headers.length) {
      throw adapterError("DALLAS_CHARGE_ROW_SHAPE", "A charge row did not match its headers.");
    }
    const description = normalizeText(cells.eq(descriptionIndex).text());
    if (description.length === 0) {
      throw adapterError("DALLAS_CHARGE_DESCRIPTION", "A charge row lacked its description.");
    }
    charges.push(description);
  });
  return charges;
}

function parseDetailDocument(
  document: SourceDocument,
  listRecord: z.infer<typeof ListRecordSchema>
) {
  const url = validateDetailUrl(document.url, DALLAS_COUNTY_CURRENT_SOURCE_URL);
  if (url.href !== listRecord.detailUrl) {
    throw adapterError(
      "DALLAS_DETAIL_MISMATCH",
      "A detail response did not match its list record."
    );
  }
  const $ = load(document.html);
  assertSourceIdentity($, listRecord.displayName);
  const hasDemographicHeading = $("h1, h2, h3")
    .toArray()
    .some((element) => normalizeText($(element).text()) === "Demographic Information");
  const hasBookingHistoryHeading = $("h1, h2, h3")
    .toArray()
    .some((element) => normalizeText($(element).text()) === "Booking History");
  if (!hasDemographicHeading || !hasBookingHistoryHeading) {
    throw adapterError(
      "DALLAS_DETAIL_IDENTITY",
      "The detail response lacked its reviewed sections."
    );
  }

  const body = $("body");
  const detailName = labeledValue($, body, "Name");
  if (detailName !== listRecord.displayName) {
    throw adapterError("DALLAS_NAME_MISMATCH", "The list and detail records did not match.");
  }

  const containers = findBookingContainers($);
  if (listRecord.multipleBookings !== containers.length > 1) {
    throw adapterError(
      "DALLAS_MULTIPLE_BOOKING_MISMATCH",
      "The list multiple-booking marker contradicted the detail response."
    );
  }
  const active = containers.filter((container) => {
    const releaseDate = labeledValue($, container, "Release Date");
    const housingFacility = labeledValue($, container, "Housing Facility");
    return releaseDate === "" && housingFacility !== null && housingFacility.length > 0;
  });
  if (active.length !== 1) {
    throw adapterError(
      "DALLAS_ACTIVE_BOOKING_AMBIGUOUS",
      "The detail response did not identify exactly one active booking."
    );
  }

  const booking = active[0];
  if (booking === undefined) {
    throw adapterError("DALLAS_ACTIVE_BOOKING_MISSING", "The active booking was unavailable.");
  }
  const heading = booking
    .find("h1, h2, h3, h4, h5, h6")
    .toArray()
    .find((element) => isBookingHeading(normalizeText($(element).text())));
  const headingText = heading === undefined ? "" : normalizeText($(heading).text());
  const bookingIdentifier = headingText.replace(/^Booking\s+/, "");
  if (bookingIdentifier.length === 0) {
    throw adapterError("DALLAS_BOOKING_IDENTIFIER", "The booking heading lacked its identifier.");
  }

  const bookingDate = labeledValue($, booking, "Booking Date");
  if (bookingDate === null || bookingDate.length === 0) {
    throw adapterError("DALLAS_BOOKING_DATE", "The active booking lacked its reviewed date field.");
  }
  return {
    displayName: listRecord.displayName,
    detailUrl: listRecord.detailUrl,
    bookingIdentifier,
    bookingDateText: bookingDate,
    charges: parseCharges($, booking)
  };
}

async function readBoundedHtml(
  response: Response,
  url: string,
  maxDocumentBytes: number
): Promise<SourceDocument> {
  if (
    response.redirected ||
    response.headers.has("location") ||
    (response.status >= 300 && response.status < 400)
  ) {
    throw adapterError(
      "DALLAS_REDIRECT_FORBIDDEN",
      "The approved source attempted a redirect.",
      "invalid_response",
      false
    );
  }
  if (!response.ok) {
    const blocked = response.status === 401 || response.status === 403 || response.status === 429;
    throw adapterError(
      blocked ? "DALLAS_SOURCE_BLOCKED" : "DALLAS_HTTP_STATUS",
      "The approved source returned an unsuccessful status.",
      blocked ? "blocked_by_source" : "http_status",
      response.status >= 500 || response.status === 429
    );
  }
  const mediaType = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "text/html") {
    throw adapterError(
      "DALLAS_CONTENT_TYPE",
      "The approved source returned an unexpected content type.",
      "invalid_response",
      true
    );
  }
  const contentEncoding = (response.headers.get("content-encoding") ?? "identity").toLowerCase();
  if (contentEncoding !== "identity") {
    throw adapterError(
      "DALLAS_CONTENT_ENCODING",
      "The approved source returned an unreviewed content encoding.",
      "invalid_response",
      true
    );
  }
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxDocumentBytes) {
    throw adapterError("DALLAS_RESPONSE_TOO_LARGE", "The source response exceeded its byte limit.");
  }

  const reader = response.body?.getReader();
  if (reader === undefined) {
    throw adapterError(
      "DALLAS_EMPTY_BODY",
      "The source response had no body.",
      "invalid_response",
      true
    );
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let byteCount = 0;
  let html = "";
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      byteCount += result.value.byteLength;
      if (byteCount > maxDocumentBytes) {
        await reader.cancel();
        throw adapterError(
          "DALLAS_RESPONSE_TOO_LARGE",
          "The source response exceeded its byte limit."
        );
      }
      html += decoder.decode(result.value, { stream: true });
    }
    html += decoder.decode();
  } catch (error) {
    if (error instanceof DallasCountyAdapterError) throw error;
    throw adapterError(
      "DALLAS_BODY_DECODE",
      "The source response body could not be decoded.",
      "invalid_response",
      true
    );
  }
  return SourceDocumentSchema.parse({ url, html });
}

function publicFailure(
  context: AdapterContext,
  stage: AdapterStage,
  error: unknown
): FailureClassification {
  if (error instanceof DallasCountyAdapterError) {
    return {
      stage,
      classification: error.classification,
      publicMessage: "The approved Dallas County source could not be processed safely.",
      retryable: error.retryable,
      occurredAt: context.requestedAt,
      diagnosticCode: error.code.slice(0, 100)
    };
  }
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    const transportCode = error.code;
    const timeout = transportCode === "TIMEOUT";
    const network = transportCode === "NETWORK_FAILURE";
    const redirect = transportCode === "REDIRECT_FORBIDDEN";
    return {
      stage,
      classification: timeout
        ? "timeout"
        : network
          ? "network"
          : redirect
            ? "invalid_response"
            : "configuration",
      publicMessage: "The approved Dallas County source could not be processed safely.",
      retryable: timeout || network,
      occurredAt: context.requestedAt,
      diagnosticCode: `DALLAS_TRANSPORT_${transportCode}`.slice(0, 100)
    };
  }
  const aborted = error instanceof Error && error.name === "AbortError";
  return {
    stage,
    classification: aborted ? "timeout" : "unknown",
    publicMessage: "The approved Dallas County source could not be processed safely.",
    retryable: aborted,
    occurredAt: context.requestedAt,
    diagnosticCode: aborted ? "DALLAS_REQUEST_ABORTED" : "DALLAS_UNCLASSIFIED_FAILURE"
  };
}

function createCharges(
  row: DallasParsedBundle["records"][number],
  bookingId: string,
  createId: DallasIdFactory
): Charge[] {
  return row.charges.map((description, sequence) => ({
    id: createId("charge", `${row.detailUrl}|${row.bookingIdentifier}|charge|${sequence}`),
    bookingId,
    sequence,
    description,
    sourceLabel: "Charge Description",
    statuteCode: null,
    disposition: null
  }));
}

function assertDallasSourceContract(context: AdapterContext): void {
  if (
    context.source.adapterKey !== DALLAS_COUNTY_ADAPTER_KEY ||
    context.source.parserVersion !== DALLAS_COUNTY_PARSER_VERSION ||
    context.source.sourceType !== "officially_linked_vendor" ||
    context.source.custodyDataScope.length !== 1 ||
    context.source.custodyDataScope[0] !== "current_custody" ||
    context.source.retentionScope.kind !== "current_only"
  ) {
    throw adapterError(
      "DALLAS_SOURCE_CONTRACT",
      "The source record did not match the reviewed Dallas adapter contract.",
      "configuration",
      false
    );
  }
  if (validateListUrl(context.source.sourceUrl).href !== DALLAS_COUNTY_CURRENT_SOURCE_URL) {
    throw adapterError(
      "DALLAS_SOURCE_CONFIGURATION",
      "The configured source URL did not match the reviewed current-custody URL.",
      "configuration",
      false
    );
  }
}

export function createDallasCountySourceAdapter(
  options: DallasCountyAdapterOptions
): SourceAdapter<DallasFetchedBundle, DallasValidatedBundle, DallasParsedBundle> {
  const limits = DallasAdapterLimitsSchema.parse(options.limits ?? {});
  const nowMs = options.nowMs ?? (() => Date.now());

  const requestDocument = async (url: string, signal: AbortSignal): Promise<SourceDocument> => {
    const response = await options.fetch(url, {
      method: "GET",
      redirect: "error",
      signal,
      headers: {
        accept: "text/html",
        "accept-encoding": "identity"
      }
    });
    return readBoundedHtml(response, url, limits.maxDocumentBytes);
  };

  const collect = async (context: AdapterContext): Promise<DallasFetchedBundle> => {
    assertDallasSourceContract(context);

    const listDocuments: SourceDocument[] = [];
    const listRecords: z.infer<typeof ListRecordSchema>[] = [];
    const seenListUrls = new Set<string>();
    const seenDetails = new Set<string>();
    let nextUrl: string | null = context.source.sourceUrl;
    while (nextUrl !== null) {
      if (listDocuments.length >= limits.maxListPages || seenListUrls.has(nextUrl)) {
        throw adapterError("DALLAS_PAGINATION_LIMIT", "The paginator exceeded its safe boundary.");
      }
      seenListUrls.add(nextUrl);
      const document = await requestDocument(nextUrl, context.signal);
      const page = parseListPage(document);
      if (page.pageNumber !== listDocuments.length + 1) {
        throw adapterError(
          "DALLAS_PAGE_SEQUENCE",
          "The paginator returned an unexpected sequence."
        );
      }
      if (listDocuments.length > 0 && page.validEmptyMarker) {
        throw adapterError(
          "DALLAS_PAGINATED_EMPTY",
          "A source-emitted next page unexpectedly returned an empty result.",
          "validation",
          true
        );
      }
      for (const record of page.records) {
        if (seenDetails.has(record.detailUrl)) {
          throw adapterError("DALLAS_DUPLICATE_DETAIL", "The source repeated a detail locator.");
        }
        seenDetails.add(record.detailUrl);
        listRecords.push(record);
      }
      if (listRecords.length > limits.maxRecords) {
        throw adapterError("DALLAS_RECORD_LIMIT", "The source exceeded its approved record limit.");
      }
      listDocuments.push(document);
      nextUrl = page.nextPageUrl;
    }

    const detailDocuments: SourceDocument[] = [];
    for (const record of listRecords) {
      detailDocuments.push(await requestDocument(record.detailUrl, context.signal));
    }
    return DallasFetchedBundleSchema.parse({ listDocuments, detailDocuments });
  };

  const validateBundle = (bundle: DallasFetchedBundle): DallasValidatedBundle => {
    const fetched = DallasFetchedBundleSchema.parse(bundle);
    const pages = fetched.listDocuments.map(parseListPage);
    const first = pages[0];
    if (first === undefined) {
      throw adapterError("DALLAS_LIST_MISSING", "The fetched bundle contained no list page.");
    }
    const records = pages.flatMap((page) => page.records);
    if (first.validEmptyMarker) {
      if (pages.length !== 1 || records.length !== 0 || fetched.detailDocuments.length !== 0) {
        throw adapterError(
          "DALLAS_EMPTY_BUNDLE",
          "The empty source bundle was internally inconsistent."
        );
      }
      return DallasValidatedBundleSchema.parse({ records: [], validEmptyMarker: true });
    }
    if (records.length !== fetched.detailDocuments.length) {
      throw adapterError("DALLAS_DETAIL_COUNT", "The source detail count did not match the list.");
    }

    const details = new Map(fetched.detailDocuments.map((document) => [document.url, document]));
    const parsedRecords = records.map((record, sourceOrder) => {
      const detail = details.get(record.detailUrl);
      if (detail === undefined) {
        throw adapterError(
          "DALLAS_DETAIL_MISSING",
          "A list record had no matching detail response."
        );
      }
      return ParsedRecordSchema.parse({
        ...parseDetailDocument(detail, record),
        sourceOrder
      });
    });
    if (new Set(parsedRecords.map((record) => record.detailUrl)).size !== parsedRecords.length) {
      throw adapterError(
        "DALLAS_DETAIL_DUPLICATE",
        "The validated source repeated a detail record."
      );
    }
    return DallasValidatedBundleSchema.parse({ records: parsedRecords, validEmptyMarker: false });
  };

  return {
    key: DALLAS_COUNTY_ADAPTER_KEY,
    adapterVersion: "1.0.0",
    parserVersion: DALLAS_COUNTY_PARSER_VERSION,

    async fetch(context): Promise<FetchResult<DallasFetchedBundle>> {
      try {
        return { ok: true, value: await collect(context) };
      } catch (error) {
        return { ok: false, failure: publicFailure(context, "fetch", error) };
      }
    },

    validate(payload, context): Promise<ValidationResult<DallasValidatedBundle>> {
      try {
        return Promise.resolve({ ok: true, value: validateBundle(payload) });
      } catch (error) {
        return Promise.resolve({ ok: false, failure: publicFailure(context, "validate", error) });
      }
    },

    parse(payload, context): Promise<ParseResult<DallasParsedBundle>> {
      const result = DallasValidatedBundleSchema.safeParse(payload);
      return Promise.resolve(
        result.success
          ? { ok: true, value: result.data }
          : { ok: false, failure: publicFailure(context, "parse", result.error) }
      );
    },

    interpretEmptyResult(payload): Promise<EmptyResultInterpretation> {
      if (payload.validEmptyMarker && payload.records.length === 0) {
        return Promise.resolve({
          kind: "valid_empty",
          recordCount: 0,
          evidence:
            "Page 1 of the exact current-custody query contained the validated source identity, scope, headers, and literal No data marker."
        });
      }
      return Promise.resolve(
        payload.records.length > 0
          ? { kind: "not_empty", recordCount: payload.records.length }
          : {
              kind: "unexpected_empty",
              recordCount: 0,
              reason: "The source did not provide every reviewed whole-roster empty marker."
            }
      );
    },

    normalize(payload, emptyResult, context): Promise<NormalizationResult> {
      try {
        const snapshotId = options.createId(
          "snapshot",
          `${context.source.id}|${context.runId}|${context.requestedAt}`
        );
        const bookings: Booking[] = payload.records.map((row) => {
          const bookingId = options.createId(
            "booking",
            `${row.detailUrl}|${row.bookingIdentifier}`
          );
          const personId = options.createId("person", row.detailUrl);
          const charges = createCharges(row, bookingId, options.createId);
          return {
            id: bookingId,
            snapshotId,
            person: {
              id: personId,
              snapshotId,
              displayName: row.displayName,
              sourceDisplayText: row.displayName
            },
            bookingIdentifier: {
              value: row.bookingIdentifier,
              sourceLabel: "Booking",
              sourceIdentifiesAsBookingIdentifier: true
            },
            custodyScope: "current_custody",
            bookedAt: null,
            releasedAt: null,
            facilityId: options.facilityId,
            charges,
            // Bond values are intentionally excluded from the public product.
            // The official Dallas page can publish contradictory bond rows;
            // ignoring that optional section keeps custody ingestion reliable.
            bondEntries: [],
            sourceOrder: row.sourceOrder
          };
        });
        const candidate: NormalizedCustodySnapshot = {
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
        };
        const result = NormalizedCustodySnapshotSchema.safeParse(candidate);
        return Promise.resolve(
          result.success
            ? { ok: true, value: result.data }
            : { ok: false, failure: publicFailure(context, "normalize", result.error) }
        );
      } catch (error) {
        return Promise.resolve({ ok: false, failure: publicFailure(context, "normalize", error) });
      }
    },

    async healthCheck(context): Promise<SourceHealth> {
      const started = nowMs();
      try {
        assertDallasSourceContract(context);
        parseListPage(await requestDocument(context.source.sourceUrl, context.signal));
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
          failure: publicFailure(context, "health_check", error)
        };
      }
    },

    classifyFailure(error, stage, context): FailureClassification {
      return publicFailure(context, stage, error);
    }
  };
}
