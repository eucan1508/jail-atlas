import { describe, expect, it } from "vitest";

import { assertAllowlistedSourceUrl, assertPublicResolvedAddress } from "./source-url-policy.js";

describe("source URL policy", () => {
  const allowlist = [{ hostname: "example.test", includeSubdomains: true }];

  it("allows only configured HTTPS hosts", () => {
    expect(
      assertAllowlistedSourceUrl("https://roster.example.test/current", allowlist).hostname
    ).toBe("roster.example.test");
    expect(() =>
      assertAllowlistedSourceUrl("http://roster.example.test/current", allowlist)
    ).toThrow();
    expect(() =>
      assertAllowlistedSourceUrl("https://unapproved.test/current", allowlist)
    ).toThrow();
  });

  it("rejects private or local network destinations", () => {
    expect(() => assertPublicResolvedAddress("127.0.0.1")).toThrow();
    expect(() => assertPublicResolvedAddress("192.168.1.10")).toThrow();
    expect(() => assertPublicResolvedAddress("203.0.113.10")).toThrow();
    expect(() => assertPublicResolvedAddress("::1")).toThrow();
    expect(() => assertPublicResolvedAddress("8.8.8.8")).not.toThrow();
  });
});
