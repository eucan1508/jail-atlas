import { describe, expect, it } from "vitest";

import { createStructuredLogger } from "./logger.ts";

describe("createStructuredLogger", () => {
  it("emits machine-readable logs while redacting secrets, personal data, and URL queries", () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      minimumLevel: "debug",
      now: () => new Date("2026-01-02T03:04:05.000Z"),
      write: (line) => lines.push(line)
    });

    logger.info("ingest.synthetic.complete", {
      sourceId: "00000000-0000-4000-8000-000000000005",
      recordCount: 25,
      level: "forged",
      event: "forged.event",
      name: "Fictional Test Person",
      authorization: "Bearer do-not-log",
      error: new Error("Parser saw Synthetic Person Secret"),
      message: "request failed at https://roster.example.test/current?person=private#details"
    });

    expect(lines).toHaveLength(1);
    const payload = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(payload).toMatchObject({
      timestamp: "2026-01-02T03:04:05.000Z",
      level: "info",
      service: "ingest-worker",
      event: "ingest.synthetic.complete",
      sourceId: "00000000-0000-4000-8000-000000000005",
      recordCount: 25,
      name: "[REDACTED_PERSONAL_DATA]",
      authorization: "[REDACTED_SECRET]",
      error: { name: "Error", message: "[REDACTED_ERROR_DETAIL]" }
    });
    expect(payload["message"]).toBe("request failed at https://roster.example.test/current");
    expect(lines[0]).not.toContain("Fictional Test Person");
    expect(lines[0]).not.toContain("do-not-log");
    expect(lines[0]).not.toContain("private");
    expect(lines[0]).not.toContain("Synthetic Person Secret");
  });

  it("honors the minimum level", () => {
    const lines: string[] = [];
    const logger = createStructuredLogger({
      minimumLevel: "warn",
      write: (line) => lines.push(line)
    });

    logger.debug("ingest.debug");
    logger.info("ingest.info");
    logger.warn("ingest.warning");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"level":"warn"');
  });
});
