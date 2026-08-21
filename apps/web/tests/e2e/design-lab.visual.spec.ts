import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { designLabArtifacts, waitForVisualStability } from "./support/contracts";

test("captures the three complete desktop design directions", async ({ page }) => {
  const response = await page.goto("/design-lab/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");

  const directions = page.locator("[data-design-direction]");
  await expect(directions).toHaveCount(3);
  await expect(page.locator('[data-design-direction][data-recommended="true"]')).toHaveCount(1);

  const names = await directions.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-design-direction") ?? "")
  );
  expect(new Set(names).size).toBe(3);
  for (const name of names) {
    expect(name).toBeTruthy();
    expect(name).not.toMatch(/blue|green|orange|purple|red|teal|yellow/i);
  }

  for (let index = 0; index < 3; index += 1) {
    const direction = directions.nth(index);
    await expect(direction.locator('header, [data-specimen="header"]')).toHaveCount(1);
    await expect(direction.locator('[data-specimen="county-identity"]')).toHaveCount(1);
    await expect(direction.locator('[data-specimen="source-status"]')).toHaveCount(1);
    await expect(direction.locator('[data-specimen="roster-row"]')).toHaveCount(1);
    await expect(direction.locator('[data-specimen="roster-card"]')).toHaveCount(1);
    await expect(direction.locator(".ui-button--primary")).not.toHaveCount(0);
    await expect(direction.locator(".ui-button--secondary")).not.toHaveCount(0);
    await expect(direction.locator('[role="alert"], [role="status"]')).not.toHaveCount(0);
    await expect(direction.locator('[data-specimen="contact"]')).toHaveCount(1);
    await expect(direction.locator('footer, [data-specimen="footer"]')).toHaveCount(1);
  }

  await waitForVisualStability(page);
  await mkdir(designLabArtifacts, { recursive: true });
  await page.screenshot({
    path: path.join(designLabArtifacts, "design-lab-desktop.png"),
    fullPage: true,
    animations: "disabled"
  });

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (!name) {
      throw new Error(`Design direction ${index + 1} is missing its conceptual slug.`);
    }
    await directions.nth(index).screenshot({
      path: path.join(designLabArtifacts, `${name}-desktop.png`),
      animations: "disabled"
    });
  }
});
