import { describe, expect, it } from "vitest";

import {
  createPhaseOneSourceFetch,
  isPublicNetworkAddress,
  PhaseOneNetworkDisabledError,
  validateSourceUrl
} from "./network-policy.ts";

const publicLookup = () => Promise.resolve([{ address: "93.184.216.34", family: 4 }] as const);

describe("source URL policy", () => {
  it("accepts an HTTPS exact-host allowlist match resolving only to public addresses", async () => {
    const result = await validateSourceUrl(
      "https://roster.example.test/current?view=public",
      ["roster.example.test"],
      publicLookup
    );

    expect(result.url.hostname).toBe("roster.example.test");
    expect(result.resolvedAddresses).toEqual(["93.184.216.34"]);
  });

  it.each([
    ["http://roster.example.test/current", ["roster.example.test"], "HTTPS_REQUIRED"],
    [
      "https://user:pass@roster.example.test/current",
      ["roster.example.test"],
      "CREDENTIALS_FORBIDDEN"
    ],
    ["https://roster.example.test:8443/current", ["roster.example.test"], "PORT_FORBIDDEN"],
    ["https://roster.example.test/current#fragment", ["roster.example.test"], "FRAGMENT_FORBIDDEN"],
    ["https://sub.roster.example.test/current", ["roster.example.test"], "HOST_NOT_ALLOWLISTED"],
    ["https://127.0.0.1/current", ["127.0.0.1"], "IP_LITERAL_FORBIDDEN"],
    ["https://[::1]/current", ["[::1]"], "IP_LITERAL_FORBIDDEN"]
  ] as const)("rejects unsafe URL %s", async (url, allowlist, code) => {
    await expect(validateSourceUrl(url, allowlist, publicLookup)).rejects.toMatchObject({ code });
  });

  it.each([
    "127.0.0.1",
    "10.10.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "192.88.99.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1"
  ])("recognizes %s as non-public", (address) => {
    expect(isPublicNetworkAddress(address)).toBe(false);
  });

  it.each(["93.184.216.34", "2001:4860:4860::8888", "::ffff:93.184.216.34"])(
    "recognizes %s as public",
    (address) => {
      expect(isPublicNetworkAddress(address)).toBe(true);
    }
  );

  it("rejects an allowlisted hostname if any DNS answer is non-public", async () => {
    await expect(
      validateSourceUrl("https://roster.example.test/current", ["roster.example.test"], () =>
        Promise.resolve([
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 }
        ])
      )
    ).rejects.toMatchObject({ code: "NON_PUBLIC_ADDRESS" });
  });

  it("makes all external source fetch attempts fail closed in Phase 1", async () => {
    await expect(
      createPhaseOneSourceFetch()("https://roster.example.test/current")
    ).rejects.toBeInstanceOf(PhaseOneNetworkDisabledError);
  });
});
