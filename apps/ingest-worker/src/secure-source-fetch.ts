import { lookup as defaultLookup } from "node:dns/promises";
import { request as defaultHttpsRequest, type RequestOptions } from "node:https";
import { isIP, type LookupFunction } from "node:net";

import { z } from "zod";

import { type DnsLookup, SourceNetworkPolicyError, validateSourceUrl } from "./network-policy.ts";

const SecureSourceFetchOptionsSchema = z.object({
  allowlist: z.array(z.string().trim().min(1)).min(1),
  allowedPathPrefixes: z.array(z.string().startsWith("/").min(1)).min(1),
  userAgent: z.string().trim().min(8).max(300),
  timeoutMs: z.number().int().min(1_000).max(60_000).default(15_000),
  maxResponseBytes: z.number().int().min(16_384).max(8_000_000).default(1_000_000),
  allowFormPost: z.boolean().default(false),
  allowJsonPost: z.boolean().default(false),
  sessionCsrf: z
    .object({
      cookieName: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/),
      headerName: z.string().regex(/^[A-Za-z0-9-]{1,64}$/),
      referer: z.string().url()
    })
    .optional()
});

// ASP.NET rosters page through form posts that carry the page's view state back to the server.
const MAX_FORM_BODY_BYTES = 262_144;
// JSON search APIs take a small query object; anything larger is not a search.
const MAX_JSON_BODY_BYTES = 16_384;
// A session portal sets a handful of short cookies; anything beyond this is not kept.
const MAX_SESSION_COOKIES = 8;
const MAX_SESSION_COOKIE_BYTES = 1_024;
const SET_COOKIE_PAIR = /^([A-Za-z0-9_.-]{1,64})=([^;\s",\\]*)/;

export class SecureSourceFetchError extends Error {
  readonly code:
    | "METHOD_FORBIDDEN"
    | "REDIRECT_MODE_REQUIRED"
    | "PATH_FORBIDDEN"
    | "REDIRECT_FORBIDDEN"
    | "CONTENT_ENCODING_FORBIDDEN"
    | "RESPONSE_TOO_LARGE"
    | "TIMEOUT"
    | "NETWORK_FAILURE";

  constructor(code: SecureSourceFetchError["code"], message: string) {
    super(message);
    this.name = "SecureSourceFetchError";
    this.code = code;
  }
}

export interface ConnectionBoundSourceFetchOptions {
  readonly allowlist: readonly string[];
  readonly allowedPathPrefixes: readonly string[];
  readonly userAgent: string;
  readonly timeoutMs?: number;
  readonly maxResponseBytes?: number;
  /** Lets an adapter send URL-encoded form posts to the approved paths; GET-only otherwise. */
  readonly allowFormPost?: boolean;
  /** Lets an adapter send a small JSON object as a POST body to the approved paths. */
  readonly allowJsonPost?: boolean;
  /**
   * Keeps the cookies the source sets and sends them back on later requests, with the named
   * cookie echoed in a header and a same-origin Referer, for portals that guard their search
   * with a session-bound CSRF token.
   */
  readonly sessionCsrf?: Readonly<{ cookieName: string; headerName: string; referer: string }>;
  readonly dnsLookup?: DnsLookup;
  readonly request?: typeof defaultHttpsRequest;
}

function asNodeError(error: unknown): NodeJS.ErrnoException {
  if (error instanceof Error) return error;
  return new SourceNetworkPolicyError("DNS_LOOKUP_FAILED", "Source DNS validation failed");
}

export function createConnectionBoundLookup(
  sourceUrl: string,
  allowlist: readonly string[],
  dnsLookup: DnsLookup
): LookupFunction {
  const expectedHostname = new URL(sourceUrl).hostname.toLowerCase().replace(/\.$/, "");
  return (hostname, lookupOptions, callback): void => {
    const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
    if (normalizedHostname !== expectedHostname) {
      callback(
        new SourceNetworkPolicyError(
          "HOST_NOT_ALLOWLISTED",
          "Connection-time hostname changed from the validated source"
        ),
        "",
        0
      );
      return;
    }

    void validateSourceUrl(sourceUrl, allowlist, dnsLookup)
      .then(({ resolvedAddresses }) => {
        const requestedFamily = lookupOptions.family;
        const answers = resolvedAddresses
          .map((address) => ({ address, family: isIP(address) }))
          .filter(({ family }) =>
            family === 4 || family === 6
              ? requestedFamily === 0 || requestedFamily === undefined || requestedFamily === family
              : false
          );
        if (answers.length === 0) {
          callback(
            new SourceNetworkPolicyError(
              "DNS_LOOKUP_FAILED",
              "No validated address matched the requested network family"
            ),
            "",
            0
          );
          return;
        }
        if (lookupOptions.all) {
          callback(null, answers);
          return;
        }
        const first = answers[0];
        if (first === undefined) {
          callback(
            new SourceNetworkPolicyError(
              "DNS_LOOKUP_FAILED",
              "No validated source address remained"
            ),
            "",
            0
          );
          return;
        }
        callback(null, first.address, first.family);
      })
      .catch((error: unknown) => callback(asNodeError(error), "", 0));
  };
}

function responseHeaders(
  sourceHeaders: Readonly<Record<string, string | readonly string[] | undefined>>
): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(sourceHeaders)) {
    if (value === undefined || name.toLowerCase() === "set-cookie") continue;
    if (typeof value === "string") {
      headers.set(name, value);
    } else {
      for (const item of value) headers.append(name, item);
    }
  }
  return headers;
}

// Adapters may ask for one of these source formats; any other value falls back to text/html.
// Every other request header stays fixed.
const ALLOWED_ACCEPT_VALUES = new Set([
  "text/html",
  "application/json",
  "application/javascript",
  "application/pdf"
]);

function isJsonObject(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function requestedAccept(init: RequestInit): string {
  const accept = new Headers(init.headers).get("accept")?.trim().toLowerCase();
  return accept && ALLOWED_ACCEPT_VALUES.has(accept) ? accept : "text/html";
}

export function createConnectionBoundSourceFetch(
  inputOptions: ConnectionBoundSourceFetchOptions
): (input: string, init?: RequestInit) => Promise<Response> {
  const options = SecureSourceFetchOptionsSchema.parse(inputOptions);
  const dnsLookup: DnsLookup =
    inputOptions.dnsLookup ??
    (async (hostname) => defaultLookup(hostname, { all: true, verbatim: true }));
  const httpsRequest = inputOptions.request ?? defaultHttpsRequest;
  const sessionCookies = new Map<string, string>();

  const keepSessionCookies = (setCookie: string | readonly string[] | undefined): void => {
    if (!options.sessionCsrf || setCookie === undefined) return;
    for (const line of typeof setCookie === "string" ? [setCookie] : setCookie) {
      const pair = line.match(SET_COOKIE_PAIR);
      if (!pair || pair[2]!.length > MAX_SESSION_COOKIE_BYTES) continue;
      if (!sessionCookies.has(pair[1]!) && sessionCookies.size >= MAX_SESSION_COOKIES) continue;
      sessionCookies.set(pair[1]!, pair[2]!);
    }
  };

  const sessionHeaders = (url: URL): Record<string, string> => {
    const session = options.sessionCsrf;
    if (!session || new URL(session.referer).origin !== url.origin) return {};
    const token = sessionCookies.get(session.cookieName);
    return {
      referer: session.referer,
      ...(sessionCookies.size > 0
        ? {
            cookie: [...sessionCookies].map(([name, value]) => `${name}=${value}`).join("; ")
          }
        : {}),
      ...(token ? { [session.headerName.toLowerCase()]: token } : {})
    };
  };

  return async (input, init = {}): Promise<Response> => {
    const method = (init.method ?? "GET").toUpperCase();
    let formBody: Buffer | undefined;
    let jsonBody: Buffer | undefined;
    if (method === "POST" && options.allowFormPost && init.body instanceof URLSearchParams) {
      formBody = Buffer.from(init.body.toString());
      if (formBody.byteLength > MAX_FORM_BODY_BYTES) {
        throw new SecureSourceFetchError("METHOD_FORBIDDEN", "The form post body is too large");
      }
    } else if (method === "POST" && options.allowJsonPost && typeof init.body === "string") {
      jsonBody = Buffer.from(init.body);
      if (jsonBody.byteLength > MAX_JSON_BODY_BYTES || !isJsonObject(init.body)) {
        throw new SecureSourceFetchError("METHOD_FORBIDDEN", "The JSON post body is not allowed");
      }
    } else if (method !== "GET" || init.body !== undefined) {
      throw new SecureSourceFetchError("METHOD_FORBIDDEN", "Source transport permits GET only");
    }
    if (init.redirect !== undefined && init.redirect !== "error") {
      throw new SecureSourceFetchError(
        "REDIRECT_MODE_REQUIRED",
        "Source transport requires redirects to fail"
      );
    }

    const validated = await validateSourceUrl(input, options.allowlist, dnsLookup);
    if (
      !options.allowedPathPrefixes.some(
        (prefix) =>
          validated.url.pathname === prefix || validated.url.pathname.startsWith(`${prefix}/`)
      )
    ) {
      throw new SecureSourceFetchError(
        "PATH_FORBIDDEN",
        "Source URL path is outside the approved prefix"
      );
    }

    const lookup = createConnectionBoundLookup(input, options.allowlist, dnsLookup);
    return new Promise<Response>((resolve, reject) => {
      let settled = false;
      const totalTimer: { value: ReturnType<typeof setTimeout> | undefined } = {
        value: undefined
      };
      const clearTotalTimer = (): void => {
        if (totalTimer.value !== undefined) clearTimeout(totalTimer.value);
      };
      const fail = (error: unknown): void => {
        if (settled) return;
        settled = true;
        clearTotalTimer();
        reject(
          error instanceof Error
            ? error
            : new SecureSourceFetchError("NETWORK_FAILURE", "The source transport failed")
        );
      };
      const requestOptions: RequestOptions = {
        method: formBody || jsonBody ? "POST" : "GET",
        lookup,
        signal: init.signal ?? undefined,
        headers: {
          accept: requestedAccept(init),
          "accept-encoding": "identity",
          "cache-control": "no-cache",
          "user-agent": options.userAgent,
          ...sessionHeaders(validated.url),
          ...(formBody
            ? {
                "content-type": "application/x-www-form-urlencoded",
                "content-length": String(formBody.byteLength)
              }
            : {}),
          ...(jsonBody
            ? {
                "content-type": "application/json",
                "content-length": String(jsonBody.byteLength)
              }
            : {})
        }
      };
      const request = httpsRequest(validated.url, requestOptions, (incoming) => {
        const status = incoming.statusCode ?? 0;
        keepSessionCookies(incoming.headers["set-cookie"]);
        if (status < 200 || status > 599) {
          incoming.resume();
          fail(
            new SecureSourceFetchError(
              "NETWORK_FAILURE",
              "The source returned an invalid final status"
            )
          );
          return;
        }
        if (status >= 300 && status < 400) {
          incoming.resume();
          fail(
            new SecureSourceFetchError(
              "REDIRECT_FORBIDDEN",
              "The approved source attempted a redirect"
            )
          );
          return;
        }

        const encodingResult = z
          .union([z.string(), z.array(z.string())])
          .optional()
          .safeParse(incoming.headers["content-encoding"]);
        if (!encodingResult.success) {
          incoming.resume();
          fail(
            new SecureSourceFetchError(
              "CONTENT_ENCODING_FORBIDDEN",
              "The source returned an invalid content encoding header"
            )
          );
          return;
        }
        const encoding = Array.isArray(encodingResult.data)
          ? encodingResult.data[0]
          : encodingResult.data;
        if (encoding !== undefined && encoding.toLowerCase() !== "identity") {
          incoming.resume();
          fail(
            new SecureSourceFetchError(
              "CONTENT_ENCODING_FORBIDDEN",
              "The source returned an unreviewed content encoding"
            )
          );
          return;
        }

        const lengthHeader = incoming.headers["content-length"];
        const declaredLength = Number(Array.isArray(lengthHeader) ? lengthHeader[0] : lengthHeader);
        if (Number.isFinite(declaredLength) && declaredLength > options.maxResponseBytes) {
          incoming.resume();
          fail(
            new SecureSourceFetchError(
              "RESPONSE_TOO_LARGE",
              "The source response exceeded its byte limit"
            )
          );
          return;
        }

        const chunks: Buffer[] = [];
        let bytes = 0;
        incoming.on("data", (chunk: Buffer | string) => {
          if (settled) return;
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bytes += buffer.byteLength;
          if (bytes > options.maxResponseBytes) {
            incoming.destroy();
            fail(
              new SecureSourceFetchError(
                "RESPONSE_TOO_LARGE",
                "The source response exceeded its byte limit"
              )
            );
            return;
          }
          chunks.push(buffer);
        });
        incoming.on("error", () => {
          fail(new SecureSourceFetchError("NETWORK_FAILURE", "The source response stream failed"));
        });
        incoming.on("aborted", () => {
          fail(new SecureSourceFetchError("NETWORK_FAILURE", "The source response was aborted"));
        });
        incoming.on("end", () => {
          if (settled) return;
          settled = true;
          clearTotalTimer();
          resolve(
            new Response(Buffer.concat(chunks), {
              status,
              headers: responseHeaders(incoming.headers)
            })
          );
        });
      });

      request.setTimeout(options.timeoutMs, () => {
        request.destroy();
        fail(new SecureSourceFetchError("TIMEOUT", "The source request timed out"));
      });
      request.on("error", (error) => {
        if (settled) return;
        fail(
          error instanceof SecureSourceFetchError
            ? error
            : new SecureSourceFetchError("NETWORK_FAILURE", "The source connection failed")
        );
      });
      totalTimer.value = setTimeout(() => {
        request.destroy();
        fail(new SecureSourceFetchError("TIMEOUT", "The source request exceeded its total time"));
      }, options.timeoutMs);
      request.end(formBody ?? jsonBody);
    });
  };
}
