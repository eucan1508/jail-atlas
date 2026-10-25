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

function fakeHttpsRequest(
  body: string,
  statusCode = 200,
  setCookie: string[] = ["SYNTHETIC_COOKIE=must-not-propagate"]
) {
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
        "set-cookie": setCookie
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

  it("forwards only an approved accept value from the adapter", async () => {
    const fake = fakeHttpsRequest("%PDF-SYNTHETIC TEST ONLY");
    const fetchSource = createConnectionBoundSourceFetch({
      allowlist,
      allowedPathPrefixes: ["/approved"],
      userAgent: "SyntheticCustodyResearch/1.0 (+https://example.test/source-policy)",
      dnsLookup: publicLookup,
      request: fake.implementation
    });

    await fetchSource(sourceUrl, {
      method: "GET",
      redirect: "error",
      headers: { accept: "application/pdf", cookie: "session=synthetic", "x-extra": "1" }
    });
    await fetchSource(sourceUrl, {
      method: "GET",
      redirect: "error",
      headers: { accept: "*/*" }
    });

    expect(fake.captured[0]?.headers).toMatchObject({ accept: "application/pdf" });
    expect(fake.captured[0]?.headers).not.toHaveProperty("cookie");
    expect(fake.captured[0]?.headers).not.toHaveProperty("x-extra");
    expect(fake.captured[1]?.headers).toMatchObject({ accept: "text/html" });
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

  it("sends URL-encoded form posts only when the source opts in", async () => {
    const options = {
      allowlist,
      allowedPathPrefixes: ["/approved"],
      userAgent: "SyntheticCustodyResearch/1.0 (+https://example.test/source-policy)",
      dnsLookup: publicLookup
    };
    const form = new URLSearchParams({ __VIEWSTATE: "synthetic", page: "2" });

    const closed = fakeHttpsRequest("unused");
    const getOnly = createConnectionBoundSourceFetch({
      ...options,
      request: closed.implementation
    });
    await expect(
      getOnly(sourceUrl, { method: "POST", body: form, redirect: "error" })
    ).rejects.toMatchObject({ code: "METHOD_FORBIDDEN" });
    expect(closed.captured).toHaveLength(0);

    const open = fakeHttpsRequest("<html>posted</html>");
    const formPost = createConnectionBoundSourceFetch({
      ...options,
      allowFormPost: true,
      request: open.implementation
    });
    for (const init of [
      { method: "POST", body: "raw=body" },
      { method: "PUT", body: form },
      { method: "POST", body: new URLSearchParams({ big: "x".repeat(300_000) }) }
    ]) {
      await expect(formPost(sourceUrl, { ...init, redirect: "error" })).rejects.toMatchObject({
        code: "METHOD_FORBIDDEN"
      });
    }
    expect(open.captured).toHaveLength(0);

    const response = await formPost(sourceUrl, {
      method: "POST",
      body: form,
      redirect: "error",
      headers: { cookie: "session=synthetic", "content-type": "text/plain" }
    });
    await expect(response.text()).resolves.toBe("<html>posted</html>");
    expect(open.captured[0]).toMatchObject({ method: "POST" });
    expect(open.captured[0]?.headers).toMatchObject({
      "content-type": "application/x-www-form-urlencoded",
      "content-length": String(form.toString().length)
    });
    expect(open.captured[0]?.headers).not.toHaveProperty("cookie");
  });

  it("sends small JSON object posts only when the source opts in", async () => {
    const options = {
      allowlist,
      allowedPathPrefixes: ["/approved"],
      userAgent: "SyntheticCustodyResearch/1.0 (+https://example.test/source-policy)",
      dnsLookup: publicLookup
    };
    const query = JSON.stringify({ custodyStatus: 1, pagination: { activePage: 1 } });

    const closed = fakeHttpsRequest("unused");
    const formOnly = createConnectionBoundSourceFetch({
      ...options,
      allowFormPost: true,
      request: closed.implementation
    });
    await expect(
      formOnly(sourceUrl, { method: "POST", body: query, redirect: "error" })
    ).rejects.toMatchObject({ code: "METHOD_FORBIDDEN" });
    expect(closed.captured).toHaveLength(0);

    const open = fakeHttpsRequest('{"data":[]}');
    const jsonPost = createConnectionBoundSourceFetch({
      ...options,
      allowJsonPost: true,
      request: open.implementation
    });
    for (const init of [
      { method: "POST", body: "not json" },
      { method: "POST", body: "[1,2]" },
      { method: "POST", body: new URLSearchParams({ page: "2" }) },
      { method: "PUT", body: query },
      { method: "POST", body: JSON.stringify({ big: "x".repeat(20_000) }) }
    ]) {
      await expect(jsonPost(sourceUrl, { ...init, redirect: "error" })).rejects.toMatchObject({
        code: "METHOD_FORBIDDEN"
      });
    }
    expect(open.captured).toHaveLength(0);

    const response = await jsonPost(sourceUrl, {
      method: "POST",
      body: query,
      redirect: "error",
      headers: { accept: "application/json", cookie: "session=synthetic" }
    });
    await expect(response.text()).resolves.toBe('{"data":[]}');
    expect(open.captured[0]).toMatchObject({ method: "POST" });
    expect(open.captured[0]?.headers).toMatchObject({
      accept: "application/json",
      "content-type": "application/json",
      "content-length": String(query.length)
    });
    expect(open.captured[0]?.headers).not.toHaveProperty("cookie");
  });

  it("returns a session portal's cookies and CSRF token only when the source is set up for it", async () => {
    const options = {
      allowlist,
      allowedPathPrefixes: ["/approved"],
      userAgent: "SyntheticCustodyResearch/1.0 (+https://example.test/source-policy)",
      dnsLookup: publicLookup
    };
    const cookies = [
      "XSRF-TOKEN=synthetic-token.abc_1; Path=/",
      "session=synthetic-session; Secure; HttpOnly; Path=/",
      `huge=${"x".repeat(2_000)}; Path=/`,
      "bad name=ignored"
    ];

    const plain = fakeHttpsRequest("{}", 200, cookies);
    const plainFetch = createConnectionBoundSourceFetch({
      ...options,
      request: plain.implementation
    });
    await plainFetch(sourceUrl, { redirect: "error" });
    await plainFetch(sourceUrl, { redirect: "error" });
    expect(plain.captured[1]?.headers).not.toHaveProperty("cookie");
    expect(plain.captured[1]?.headers).not.toHaveProperty("referer");

    const portal = fakeHttpsRequest("{}", 200, cookies);
    const portalFetch = createConnectionBoundSourceFetch({
      ...options,
      allowJsonPost: true,
      sessionCsrf: {
        cookieName: "XSRF-TOKEN",
        headerName: "X-CSRF-TOKEN",
        referer: "https://roster.example.test/approved/"
      },
      request: portal.implementation
    });
    const first = await portalFetch(sourceUrl, { redirect: "error" });
    expect(first.headers.get("set-cookie")).toBeNull();
    expect(portal.captured[0]?.headers).not.toHaveProperty("cookie");
    expect(portal.captured[0]?.headers).not.toHaveProperty("x-csrf-token");

    await portalFetch(sourceUrl, { method: "POST", body: "{}", redirect: "error" });
    expect(portal.captured[1]?.headers).toMatchObject({
      cookie: "XSRF-TOKEN=synthetic-token.abc_1; session=synthetic-session",
      "x-csrf-token": "synthetic-token.abc_1",
      referer: "https://roster.example.test/approved/"
    });

    const elsewhere = fakeHttpsRequest("{}", 200, cookies);
    const elsewhereFetch = createConnectionBoundSourceFetch({
      ...options,
      sessionCsrf: {
        cookieName: "XSRF-TOKEN",
        headerName: "X-CSRF-TOKEN",
        referer: "https://other.example.test/"
      },
      request: elsewhere.implementation
    });
    await elsewhereFetch(sourceUrl, { redirect: "error" });
    await elsewhereFetch(sourceUrl, { redirect: "error" });
    expect(elsewhere.captured[1]?.headers).not.toHaveProperty("cookie");
    expect(elsewhere.captured[1]?.headers).not.toHaveProperty("referer");
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
