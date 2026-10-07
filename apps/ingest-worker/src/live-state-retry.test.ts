import { beforeEach, describe, expect, it, vi } from "vitest";

const attempts = new Map<string, number>();
let failOnFirstAttempt = new Set<string>();
let alwaysFail = new Set<string>();

vi.mock("./live-job-runner.ts", () => ({
  executeLiveSource: vi.fn(async (config: { liveSourceAdapterKey: string }) => {
    const key = config.liveSourceAdapterKey;
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);
    const ok = !alwaysFail.has(key) && !(failOnFirstAttempt.has(key) && attempt === 1);
    return { adapterKey: key, result: { ok } };
  })
}));

const { executeLiveState, liveStateSucceeded } = await import("./live-state-runner.ts");

const config = {} as Parameters<typeof executeLiveState>[0];
const dependencies = {} as Parameters<typeof executeLiveState>[2];

describe("executeLiveState retry", () => {
  beforeEach(() => {
    attempts.clear();
    failOnFirstAttempt = new Set();
    alwaysFail = new Set();
  });

  it("does not wait or retry when every county succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const execution = await executeLiveState(config, "IA", dependencies, { sleep });
    expect(sleep).not.toHaveBeenCalled();
    expect(liveStateSucceeded(execution.results)).toBe(true);
    expect([...attempts.values()].every((count) => count === 1)).toBe(true);
  });

  it("retries only the failed county once after the delay and keeps its last result", async () => {
    failOnFirstAttempt = new Set(["dallas-newworld-inmate-inquiry"]);
    const sleep = vi.fn(async () => {});
    const execution = await executeLiveState(config, "IA", dependencies, {
      sleep,
      retryDelayMs: 1_234
    });
    expect(sleep).toHaveBeenCalledWith(1_234);
    expect(attempts.get("dallas-newworld-inmate-inquiry")).toBe(2);
    expect(attempts.get("cedar-county-iowa-current-roster")).toBe(1);
    expect(execution.results.map((result) => result.countySlug)).toEqual([
      "dallas",
      "cedar",
      "black-hawk"
    ]);
    expect(liveStateSucceeded(execution.results)).toBe(true);
  });

  it("reports the county as failed when the retry also fails", async () => {
    alwaysFail = new Set(["dallas-newworld-inmate-inquiry"]);
    const execution = await executeLiveState(config, "IA", dependencies, {
      sleep: async () => {}
    });
    expect(attempts.get("dallas-newworld-inmate-inquiry")).toBe(2);
    expect(liveStateSucceeded(execution.results)).toBe(false);
  });
});
