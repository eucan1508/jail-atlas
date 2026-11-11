import { describe, expect, it, vi } from "vitest";

import { createDatabase } from "./client.js";

describe("createDatabase", () => {
  it("keeps running when the server closes an idle connection", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handle = createDatabase({
      DATABASE_URL: "postgres://synthetic:synthetic@127.0.0.1:1/synthetic",
      DATABASE_POOL_MAX: 1,
      DATABASE_IDLE_TIMEOUT_MS: 1_000
    });
    expect(handle.pool.listenerCount("error")).toBe(1);
    // Without a listener this emit would throw, as an unhandled "error" event does in Node.
    expect(() =>
      handle.pool.emit("error", new Error("Connection terminated unexpectedly"), {} as never)
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      "database: idle connection closed (Connection terminated unexpectedly)"
    );
    warn.mockRestore();
    await handle.close();
  });
});
