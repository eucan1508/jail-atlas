import { describe, expect, it } from "vitest";

import { runCountySequence } from "./county-sequence.ts";

describe("county ingest sequence", () => {
  it("runs counties one at a time and continues after a failure", async () => {
    const events: string[] = [];
    const result = await runCountySequence([
      {
        countySlug: "dallas",
        run: async () => {
          events.push("dallas:start");
          await Promise.resolve();
          events.push("dallas:end");
          return 1;
        }
      },
      {
        countySlug: "cedar",
        run: async () => {
          events.push("cedar:start");
          throw new Error("blocked");
        }
      },
      {
        countySlug: "black-hawk",
        run: async () => {
          events.push("black-hawk:start");
          return 3;
        }
      }
    ]);

    expect(events).toEqual(["dallas:start", "dallas:end", "cedar:start", "black-hawk:start"]);
    expect(result.map(({ countySlug, ok }) => ({ countySlug, ok }))).toEqual([
      { countySlug: "dallas", ok: true },
      { countySlug: "cedar", ok: false },
      { countySlug: "black-hawk", ok: true }
    ]);
  });
});
