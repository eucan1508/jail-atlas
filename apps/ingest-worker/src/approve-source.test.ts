import { describe, expect, it } from "vitest";

import { approveSource } from "./approve-source.js";

describe("source approval arguments", () => {
  it("accepts pnpm's standalone argument separator", async () => {
    await expect(
      approveSource(
        [
          "--",
          "--adapter=milam-county-tx-current-roster",
          "--county=milam",
          "--state=TX",
          "--confirm=APPROVE"
        ],
        {}
      )
    ).rejects.toThrow("DATABASE_URL is required");
  });
});
