import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import path from "node:path";

export const countyPath = "/iowa/scott-county/custody/";
export const countyCanonical = `https://example.test${countyPath}`;

export const roster = {
  results: '[data-testid="roster-results"][data-nosnippet]',
  records: '[data-testid="roster-record"]',
  editorial: '[data-testid="county-editorial"]',
  loadMoreName: "Load more records"
} as const;

export const designLabArtifacts = path.resolve(
  import.meta.dirname,
  "../../../../../artifacts/design-lab"
);

export async function expectSingleCanonical(page: Page, expected: string): Promise<void> {
  const canonicalLinks = page.locator('head link[rel="canonical"]');
  await expect(canonicalLinks).toHaveCount(1);
  await expect(canonicalLinks).toHaveAttribute("href", expected);
}

export async function waitForVisualStability(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  await page.addStyleTag({
    content: ".skip-link { display: none !important; }"
  });
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help}\n${violation.nodes
            .map((node) => `  ${node.target.join(" ")}: ${node.failureSummary ?? ""}`)
            .join("\n")}`
      )
      .join("\n\n")
  ).toEqual([]);
}

export async function tabUntilFocused(
  page: Page,
  selector: string,
  maximumTabs = 80
): Promise<void> {
  for (let press = 0; press < maximumTabs; press += 1) {
    if (await page.locator(selector).evaluate((element) => element === document.activeElement)) {
      return;
    }

    await page.keyboard.press("Tab");
  }

  await expect(page.locator(selector), `Keyboard focus never reached ${selector}`).toBeFocused();
}

export function normalizedText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
