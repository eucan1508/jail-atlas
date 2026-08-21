import { expect, test } from "@playwright/test";
import { countyPath, normalizedText, roster, tabUntilFocused } from "./support/contracts";

test.describe("server-rendered roster", () => {
  test("renders the first 25 records when JavaScript is disabled", async ({ baseURL, browser }) => {
    if (!baseURL) {
      throw new Error("The Playwright base URL is required for the no-JavaScript contract test.");
    }

    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto(countyPath, { waitUntil: "domcontentloaded" });

    expect(response?.status()).toBe(200);
    await expect(page.locator(roster.results)).toHaveCount(1);
    await expect(page.locator(roster.records)).toHaveCount(25);
    await expect(page.getByText(/synthetic/i).first()).toBeVisible();
    await expect(page.getByText(/fictional/i).first()).toBeVisible();

    await context.close();
  });

  test("does not create person-profile or booking-history links", async ({ page }) => {
    await page.goto(countyPath);

    const recordLinks = page.locator(
      `${roster.records} a[href*="/person/"], ${roster.records} a[href*="/people/"], ` +
        `${roster.records} a[href*="/booking/"], ${roster.records} a[href*="/mugshot/"]`
    );
    await expect(recordLinks).toHaveCount(0);
  });
});

test.describe("opaque cursor load-more flow", () => {
  test("appends records without changing the URL or repeating editorial content", async ({
    page
  }) => {
    await page.goto(countyPath);

    const records = page.locator(roster.records);
    const editorial = page.locator(roster.editorial);
    const loadMore = page.getByRole("button", { name: roster.loadMoreName });
    const originalUrl = page.url();
    const originalHistoryLength = await page.evaluate(() => window.history.length);
    await page.evaluate(() => {
      Object.defineProperty(window, "__rosterPageSentinel", {
        value: "preserved",
        configurable: true
      });
    });
    const originalEditorial = normalizedText(await editorial.textContent());

    await expect(records).toHaveCount(25);
    await expect(editorial).toHaveCount(1);
    await expect(loadMore).toBeEnabled();

    const apiResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === "GET" && url.pathname.startsWith("/api/rosters/");
    });
    await loadMore.click();
    const apiResponse = await apiResponsePromise;

    expect(apiResponse.status()).toBe(200);
    const robotsHeader = apiResponse.headers()["x-robots-tag"] ?? "";
    expect(robotsHeader).toContain("noindex");
    expect(robotsHeader).toContain("nofollow");
    expect(robotsHeader).toContain("nosnippet");

    const apiUrl = new URL(apiResponse.url());
    const cursor = apiUrl.searchParams.get("cursor");
    expect(cursor).toBeTruthy();
    expect(cursor).not.toMatch(/^\d+$/);
    expect(cursor?.toLocaleLowerCase("en-US")).not.toContain("offset");
    expect(cursor?.toLocaleLowerCase("en-US")).not.toContain("page");
    expect(Number(apiUrl.searchParams.get("limit"))).toBeLessThanOrEqual(25);
    expect(Number(apiUrl.searchParams.get("limit"))).toBeGreaterThan(0);

    const payload = (await apiResponse.json()) as {
      records: Array<{ recordKey: string; sourceOrder: number }>;
      nextCursor: string | null;
    };
    expect(payload.records).toHaveLength(25);
    expect(new Set(payload.records.map((record) => record.recordKey)).size).toBe(25);
    expect(payload.records.map((record) => record.sourceOrder)).toEqual(
      payload.records.map((record) => record.sourceOrder).toSorted((left, right) => left - right)
    );

    const oversizedRequest = new URL(apiUrl);
    oversizedRequest.searchParams.set("limit", "26");
    const rejected = await page.request.get(oversizedRequest.toString());
    expect(rejected.status()).toBe(400);
    expect(rejected.headers()["x-robots-tag"]).toBe("noindex, nofollow, nosnippet");

    await expect(records).toHaveCount(50);
    expect(page.url()).toBe(originalUrl);
    expect(await page.evaluate(() => window.history.length)).toBe(originalHistoryLength);
    expect(
      await page.evaluate(
        () => (window as Window & { __rosterPageSentinel?: string }).__rosterPageSentinel
      )
    ).toBe("preserved");
    await expect(editorial).toHaveCount(1);
    expect(normalizedText(await editorial.textContent())).toBe(originalEditorial);
    await expect(page.locator(roster.results)).toHaveCount(1);

    const announcement = page
      .locator('[aria-live], [role="status"]')
      .filter({ hasText: /loaded|showing|50 records/i })
      .first();
    await expect(announcement).toBeVisible();
    await expect(page.locator('a[href*="cursor="]')).toHaveCount(0);
  });

  test("announces loading while the cursor request is pending", async ({ page }) => {
    await page.goto(countyPath);
    await page.route("**/api/rosters/**", async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ response });
    });

    await page.getByRole("button", { name: roster.loadMoreName }).click();
    await expect(
      page
        .locator('[aria-live], [role="status"]')
        .filter({ hasText: /loading/i })
        .first()
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /load more records|loading/i })).toBeDisabled();
    await expect(page.locator(roster.records)).toHaveCount(50);
  });

  test("exposes a keyboard-operable control and announces updates", async ({ page }) => {
    await page.goto(countyPath);

    const loadMoreSelector = 'button:has-text("Load more records")';
    await page.keyboard.press("Home");
    await tabUntilFocused(page, loadMoreSelector);
    await expect(page.locator(loadMoreSelector)).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator(roster.records)).toHaveCount(50);
    await expect(
      page
        .locator('[aria-live], [role="status"]')
        .filter({ hasText: /loaded|showing|50 records/i })
        .first()
    ).toBeVisible();
  });

  test("offers an accessible retry after an API failure", async ({ page }) => {
    await page.goto(countyPath);
    await page.route("**/api/rosters/**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "temporarily_unavailable" })
      });
    });

    await page.getByRole("button", { name: roster.loadMoreName }).click();

    await expect(
      page
        .locator('[aria-live], [role="alert"], [role="status"]')
        .filter({
          hasText: /could not|try again|retry|unavailable/i
        })
        .first()
    ).toBeVisible();
    const retry = page.getByRole("button", { name: /retry|try again/i });
    await expect(retry).toBeEnabled();

    await page.unroute("**/api/rosters/**");
    await retry.click();
    await expect(page.locator(roster.records)).toHaveCount(50);
  });

  test("announces the end of the finite result set", async ({ page }) => {
    await page.goto(countyPath);

    let previousCount = 25;
    for (let requestNumber = 0; requestNumber < 6; requestNumber += 1) {
      const control = page.getByRole("button", { name: /load more records/i });
      if ((await control.count()) === 0 || (await control.isDisabled())) {
        break;
      }

      await control.click();
      await expect.poll(() => page.locator(roster.records).count()).toBeGreaterThan(previousCount);
      previousCount = await page.locator(roster.records).count();
    }

    const remainingControl = page.getByRole("button", { name: /load more records/i });
    if ((await remainingControl.count()) > 0) {
      await expect(remainingControl).toBeDisabled();
    }
    await expect(
      page
        .locator('[aria-live], [role="status"]')
        .filter({ hasText: /all records|end of results/i })
        .first()
    ).toBeVisible();
  });
});
