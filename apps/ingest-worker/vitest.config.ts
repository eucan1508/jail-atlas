import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@jail-atlas/domain": fileURLToPath(
        new URL("../../packages/domain/src/index.ts", import.meta.url)
      ),
      "@jail-atlas/source-adapters": fileURLToPath(
        new URL("../../packages/source-adapters/src/index.ts", import.meta.url)
      ),
      "@jail-atlas/test-fixtures": fileURLToPath(
        new URL("../../packages/test-fixtures/src/index.ts", import.meta.url)
      )
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"]
    }
  }
});
