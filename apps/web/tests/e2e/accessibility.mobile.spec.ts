import { expect, test } from "@playwright/test";
import { countyPath, expectNoAxeViolations } from "./support/contracts";

for (const testCase of [
  { name: "home", path: "/" },
  { name: "county roster", path: countyPath }
]) {
  test(`@a11y mobile ${testCase.name} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto(testCase.path);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    await expectNoAxeViolations(page);
  });
}
