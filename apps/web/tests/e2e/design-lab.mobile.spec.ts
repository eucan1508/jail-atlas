import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  designLabArtifacts,
  expectNoAxeViolations,
  waitForVisualStability
} from "./support/contracts";

test("@a11y captures the complete mobile design directions", async ({ page }) => {
  const response = await page.goto("/design-lab/");
  expect(response?.status()).toBe(200);

  const directions = page.locator("[data-design-direction]");
  await expect(directions).toHaveCount(3);

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  await expectNoAxeViolations(page);

  await waitForVisualStability(page);
  await mkdir(designLabArtifacts, { recursive: true });
  await page.screenshot({
    path: path.join(designLabArtifacts, "design-lab-mobile.png"),
    fullPage: true,
    animations: "disabled"
  });

  const names = await directions.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-design-direction") ?? "")
  );
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (!name) {
      throw new Error(`Design direction ${index + 1} is missing its conceptual slug.`);
    }
    await directions.nth(index).screenshot({
      path: path.join(designLabArtifacts, `${name}-mobile.png`),
      animations: "disabled"
    });
  }
});
