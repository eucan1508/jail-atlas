import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCorrectionFormToken, verifyCorrectionFormToken } from "@/lib/correction-security";
import { POST } from "@/app/corrections/submit/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

const started = Date.parse("2026-09-25T08:00:00.123Z");

afterEach(() => {
  vi.useRealTimers();
  resetRateLimitsForTests();
});

describe("correction form signatures", () => {
  it("accepts a generated token containing an ISO timestamp with milliseconds", () => {
    const form = createCorrectionFormToken(started);
    expect(verifyCorrectionFormToken({ ...form, now: started + 2_000 })).toBe(true);
  });

  it.each([0, 1_499, -1, 7_200_001])("rejects submissions at invalid age %i", (age) => {
    const form = createCorrectionFormToken(started);
    expect(verifyCorrectionFormToken({ ...form, now: started + age })).toBe(false);
  });

  it("rejects tampered timestamps, signatures, and extra separators", () => {
    const form = createCorrectionFormToken(started);
    const now = started + 2_000;
    expect(verifyCorrectionFormToken({ ...form, now, token: `${form.token}x` })).toBe(false);
    expect(verifyCorrectionFormToken({ ...form, now, token: `extra.${form.token}` })).toBe(false);
    expect(
      verifyCorrectionFormToken({ ...form, now, startedAt: new Date(started - 1).toISOString() })
    ).toBe(false);
  });

  it("accepts a complete synthetic form through the POST route without database writes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(started + 2_000);
    const form = createCorrectionFormToken(started);
    const body = new FormData();
    const fields = {
      category: "other",
      contactEmail: "",
      description: "Synthetic test of correction form submission.",
      formStartedAt: form.startedAt,
      sourcePagePath: "/",
      submissionToken: form.token,
      website: ""
    };
    for (const [name, value] of Object.entries(fields)) body.set(name, value);
    const response = await POST(
      new Request("https://example.test/corrections/submit/", { method: "POST", body })
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.test/corrections/?status=preview"
    );
  });
});
