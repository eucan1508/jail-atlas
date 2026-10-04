import { describe, expect, it } from "vitest";
import { stateFaqItems } from "@/components/state-faq";
import { countyCoverageCatalog } from "@/lib/coverage-catalog";

describe("editorial directory content", () => {
  it("requires a valid publication date for every county brief", () => {
    for (const county of countyCoverageCatalog) {
      expect(county.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(`${county.publishedAt}T00:00:00Z`))).toBe(false);
    }
  });

  it("provides state-specific FAQ copy for every supported state", () => {
    for (const state of ["iowa", "minnesota", "texas", "arkansas"] as const) {
      const items = stateFaqItems(state);
      expect(items).toHaveLength(4);
      expect(new Set(items.map((item) => item.question)).size).toBe(items.length);
      expect(items.every((item) => item.answer.length > 80)).toBe(true);
    }
  });
});
