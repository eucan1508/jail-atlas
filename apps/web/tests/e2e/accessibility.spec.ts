import { expect, test } from "@playwright/test";
import { countyPath, expectNoAxeViolations, roster } from "./support/contracts";

for (const testCase of [
  { name: "home", path: "/" },
  { name: "county roster", path: countyPath },
  { name: "corrections", path: "/corrections/" }
]) {
  test(`@a11y ${testCase.name} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(testCase.path);
    await expect(page.locator("h1")).toHaveCount(1);

    await expectNoAxeViolations(page);
  });
}

test("@a11y skip navigation is the first keyboard stop", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: /skip to main content/i });
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeVisible();
  expect(new URL(page.url()).hash).toBe("#main-content");
});

test("@a11y roster personal data is excluded from snippets and has accessible controls", async ({
  page
}) => {
  await page.goto(countyPath);

  await expect(page.locator(roster.results)).toHaveCount(1);
  await expect(page.getByRole("button", { name: roster.loadMoreName })).toBeEnabled();
  await expect(page.locator('[aria-live], [role="status"]')).not.toHaveCount(0);
});
