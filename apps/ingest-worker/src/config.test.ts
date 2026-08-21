import { describe, expect, it } from "vitest";

import { EnvironmentValidationError, readWorkerConfig } from "./config.ts";

describe("readWorkerConfig", () => {
  it("defaults to a closed synthetic-only environment", () => {
    expect(readWorkerConfig({})).toMatchObject({
      ingestMode: "synthetic",
      networkAccess: "disabled",
      databaseWrites: "disabled",
      allowLiveSourceFetches: false,
      scottCountyLiveSourceEnabled: false,
      sourceHostAllowlist: []
    });
  });

  it.each([
    ["ALLOW_LIVE_SOURCE_FETCHES", "true"],
    ["SCOTT_COUNTY_LIVE_SOURCE_ENABLED", "true"],
    ["INGEST_NETWORK_ACCESS", "enabled"],
    ["INGEST_DATABASE_WRITES", "enabled"],
    ["INGEST_MODE", "live"]
  ])("rejects Phase 2 capability %s=%s", (name, value) => {
    expect(() => readWorkerConfig({ [name]: value })).toThrow(EnvironmentValidationError);
  });

  it("accepts only PostgreSQL database URLs and never includes their value in an error", () => {
    const secretValue = "https://person:secret@example.test/database";

    try {
      readWorkerConfig({ DATABASE_URL: secretValue });
      expect.unreachable("Expected an invalid database protocol");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect(String(error)).not.toContain(secretValue);
      expect(String(error)).not.toContain("secret");
    }
  });

  it("normalizes and de-duplicates exact-host allowlist entries", () => {
    const config = readWorkerConfig({
      SOURCE_HOST_ALLOWLIST: "Roster.Example.Test, roster.example.test.,official.example.test"
    });

    expect(config.sourceHostAllowlist).toEqual(["roster.example.test", "official.example.test"]);
  });
});
