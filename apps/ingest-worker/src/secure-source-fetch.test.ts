import { EventEmitter } from "node:events";
import type { ClientRequest, IncomingMessage } from "node:http";
import type { RequestOptions, request as httpsRequest } from "node:https";
import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import type { DnsLookup } from "./network-policy.ts";
import {
  createConnectionBoundLookup,
  createConnectionBoundSourceFetch,
  SecureSourceFetchError
} from "./secure-source-fetch.ts";

const sourceUrl = "https://roster.example.test/approved/current";
const allowlist = ["roster.example.test"] as const;
const publicLookup: DnsLookup = () =>
  Promise.resolve([{ address: "93.184.216.34", family: 4 }] as const);

function runLookup(
  lookup: ReturnType<typeof createConnectionBoundLookup>,
  hostname = "roster.example.test"
): Promise<readonly { readonly address: string; readonly family: number }[]> {
  return new Promise((resolve, reject) => {
    lookup(hostname, { all: true }, (error, addresses) => {
      if (error !== null) {
        reject(error);
        return;
      }
      if (!Array.isArray(addresses)) {
        reject(new Error("Expected all connection-bound addresses"));
        return;
      }
      resolve(addresses);
    });
  });
}

function fakeHttpsRequest(body: string, statusCode = 200) {
  const captured: RequestOptions[] = [];
  const implementation = ((
    _url: URL,
    options: RequestOptions,
    onResponse: (response: IncomingMessage) => void
  ) => {
    captured.push(options);
    const request = new EventEmitter() as ClientRequest;
    request.setTimeout = vi.fn(() => request);
    request.destroy = vi.fn(() => request);
    request.end = vi.fn(() => {
      const stream = new PassThrough();
      const incoming = stream as unknown as IncomingMessage;
      incoming.statusCode = statusCode;
      incoming.headers = {
        "content-type": "text/html; charset=utf-8",
        "content-length": String(Buffer.byteLength(body)),
        "set-cookie": ["SYNTHETIC_COOKIE=must-not-propagate"]
      };
      onResponse(incoming);
      stream.end(body);
      return request;
    });
    return request;
  }) as typeof httpsRequest;
  return { implementation, captured };
}

describe("connection-bound source transport", () => {
  it("resolves and validates the destination inside every socket lookup", async () => {
    const dnsLookup = vi.fn(publicLookup);
    const lookup = createConnectionBoundLookup(sourceUrl, allowlist, dnsLookup);

    await expect(runLookup(lookup)).resolves.toEqual([{ address: "93.184.216.34", family: 4 }]);
    await expect(runLookup(lookup)).resolves.toHaveLength(1);
    expect(dnsLookup).toHaveBeenCalledTimes(2);
  });

  it("fails a DNS rebinding response containing a private destination", async () => {
    let attempt = 0;
    const dnsLookup: DnsLookup = () => {
      attempt += 1;
      return Promise.resolve(
        attempt === 1
          ? [{ address: "93.184.216.34", family: 4 }]
          : [{ address: "127.0.0.1", family: 4 }]
      );
    };
    const lookup = createConnectionBoundLookup(sourceUrl, allowlist, dnsLookup);

    await expect(runLookup(lookup)).resolves.toHaveLength(1);
    await expect(runLookup(lookup)).rejects.toMatchObject({ code: "NON_PUBLIC_ADDRESS" });
  });

  it("rejects a connection-time hostname change", async () => {
    const lookup = createConnectionBoundLookup(sourceUrl, allowlist, publicLookup);
    await expect(runLookup(lookup, "redirect.example.test")).rejects.toMatchObject({
      code: "HOST_NOT_ALLOWLISTED"
    });
  });

  it("uses fixed safe headers, strips cookies, and exposes a bounded Response", async () => {
    const fake = fakeHttpsRequest("<html>SYNTHETIC TEST ONLY</html>");
    const fetchSource = createConnectionBoundSourceFetch({
      allowlist,
      allowedPathPrefixes: ["/approved"],
      userAgent: "SyntheticCustodyResearch/1.0 (+https://example.test/source-policy)",
      dnsLookup: publicLookup,
      request: fake.implementation
    });

    const response = await fetchSource(sourceUrl, { method: "GET", redirect: "error" });
    expect(await response.text()).toContain("SYNTHETIC TEST ONLY");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fake.captured[0]?.headers).toMatchObject({
      accept: "text/html",
      "accept-encoding": "identity"
    });
    expect(typeof fake.captured[0]?.lookup).toBe("function");
  });

  it("rejects alternate methods, redirect modes, and paths before connecting", async () => {
    const fake = fakeHttpsRequest("unused");
    const fetchSource = createConnectionBoundSourceFetch({
      allowlist,
      allowedPathPrefixes: ["/approved"],
      userAgent: "SyntheticCustodyResearch/1.0 (+https://example.test/source-policy)",
      dnsLookup: publicLookup,
      request: fake.implementation
    });

    await expect(fetchSource(sourceUrl, { method: "POST" })).rejects.toBeInstanceOf(
      SecureSourceFetchError
    );
    await expect(fetchSource(sourceUrl, { redirect: "follow" })).rejects.toMatchObject({
      code: "REDIRECT_MODE_REQUIRED"
    });
    await expect(
      fetchSource("https://roster.example.test/unapproved/current", { redirect: "error" })
    ).rejects.toMatchObject({ code: "PATH_FORBIDDEN" });
    expect(fake.captured).toHaveLength(0);
  });

  it("never follows a source redirect", async () => {
    const fake = fakeHttpsRequest("", 302);
    const fetchSource = createConnectionBoundSourceFetch({
      allowlist,
      allowedPathPrefixes: ["/approved"],
      userAgent: "SyntheticCustodyResearch/1.0 (+https://example.test/source-policy)",
      dnsLookup: publicLookup,
      request: fake.implementation
    });

    await expect(fetchSource(sourceUrl, { redirect: "error" })).rejects.toMatchObject({
      code: "REDIRECT_FORBIDDEN"
    });
  });
});
