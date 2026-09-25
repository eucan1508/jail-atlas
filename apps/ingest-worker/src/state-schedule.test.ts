import { describe, expect, it } from "vitest";

import {
  createDailyStateSchedule,
  scheduledStateAtUtc,
  scheduledStartHourUtc
} from "./state-schedule.ts";

describe("daily state schedule", () => {
  const schedule = createDailyStateSchedule(["IA", "MN"]);

  it("assigns two states to 00:00 and 06:00 UTC and leaves later slots idle", () => {
    expect(scheduledStateAtUtc(new Date("2026-09-25T00:00:00Z"), schedule)).toBe("IA");
    expect(scheduledStateAtUtc(new Date("2026-09-25T06:00:00Z"), schedule)).toBe("MN");
    expect(scheduledStateAtUtc(new Date("2026-09-25T12:00:00Z"), schedule)).toBeNull();
    expect(scheduledStateAtUtc(new Date("2026-09-25T18:00:00Z"), schedule)).toBeNull();
  });

  it("supports four states across all daily six-hour slots", () => {
    const fourStateSchedule = createDailyStateSchedule(["IA", "MN", "TX", "WI"]);
    expect(scheduledStateAtUtc(new Date("2026-09-25T00:00:00Z"), fourStateSchedule)).toBe("IA");
    expect(scheduledStateAtUtc(new Date("2026-09-25T06:00:00Z"), fourStateSchedule)).toBe("MN");
    expect(scheduledStateAtUtc(new Date("2026-09-25T12:00:00Z"), fourStateSchedule)).toBe("TX");
    expect(scheduledStateAtUtc(new Date("2026-09-25T18:00:00Z"), fourStateSchedule)).toBe("WI");
  });

  it("reports a state's UTC start hour", () => {
    expect(scheduledStartHourUtc("mn", schedule)).toBe(6);
  });
});
