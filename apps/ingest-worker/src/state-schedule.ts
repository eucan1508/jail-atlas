import { z } from "zod";

/**
 * State refresh slots are UTC and intentionally daily. With two states, slots 0 and 1 are used
 * (00:00 and 06:00 UTC) and the remaining two six-hour slots are idle. With four states all slots
 * are used. The worker still processes counties independently inside the selected state.
 */
export const StateScheduleEntrySchema = z.object({
  state: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/),
  slot: z.number().int().min(0).max(3)
});
export type StateScheduleEntry = z.infer<typeof StateScheduleEntrySchema>;

export const StateScheduleSchema = z.array(StateScheduleEntrySchema).min(1).max(4);

export function createDailyStateSchedule(states: readonly string[]): readonly StateScheduleEntry[] {
  const normalized = states.map((state) => state.trim().toUpperCase()).filter(Boolean);
  if (normalized.length === 0 || normalized.length > 4) {
    throw new RangeError("A daily state schedule requires between one and four states.");
  }
  const entries = normalized.map((state, slot) => StateScheduleEntrySchema.parse({ state, slot }));
  return Object.freeze(entries);
}

export function scheduledStateAtUtc(
  date: Date,
  schedule: readonly StateScheduleEntry[]
): string | null {
  if (Number.isNaN(date.getTime())) throw new RangeError("The schedule date is invalid.");
  const slot = Math.floor(date.getUTCHours() / 6);
  return schedule.find((entry) => entry.slot === slot)?.state ?? null;
}

export function scheduledStartHourUtc(
  state: string,
  schedule: readonly StateScheduleEntry[]
): number {
  const entry = schedule.find((candidate) => candidate.state === state.trim().toUpperCase());
  if (!entry) throw new Error(`State is not in the daily schedule: ${state}`);
  return entry.slot * 6;
}
