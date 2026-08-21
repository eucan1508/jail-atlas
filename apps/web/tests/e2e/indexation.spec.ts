import { expect, test } from "@playwright/test";
import { countyCanonical, countyPath, expectSingleCanonical } from "./support/contracts";

test.describe("county indexation contract", () => {
  test("does not expose a paginated HTML route", async ({ request }) => {
    const response = await request.get(`${countyPath}page/2/`, { maxRedirects: 0 });

    expect(response.status()).toBe(404);
  });

  for (const query of ["page=2", "cursor=not-a-real-cursor", "sort=name"]) {
    test(`normalizes ${query} to the only county document`, async ({ baseURL, page, request }) => {
      const response = await request.get(`${countyPath}?${query}`, { maxRedirects: 0 });

      expect([307, 308]).toContain(response.status());
      const location = response.headers().location;
      expect(location).toBeTruthy();
      expect(new URL(location ?? "", baseURL).pathname).toBe(countyPath);
      expect(new URL(location ?? "", baseURL).search).toBe("");

      await page.goto(`${countyPath}?${query}`);
      expect(new URL(page.url()).pathname).toBe(countyPath);
      expect(new URL(page.url()).search).toBe("");
      await expectSingleCanonical(page, countyCanonical);
    });
  }

  test("publishes exactly one self-referencing county canonical", async ({ page }) => {
    await page.goto(countyPath);

    await expectSingleCanonical(page, countyCanonical);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  });

  test("keeps APIs, search, design lab, and cursor states out of the sitemap", async ({
    request
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");

    const xml = await response.text();
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1] ?? "");
    const expectedPaths = [
      "/",
      "/coverage/",
      "/about/",
      "/methodology/",
      "/source-policy/",
      "/corrections/",
      "/privacy/",
      "/terms/",
      "/disclaimer/"
    ];

    expect(locations.length).toBeGreaterThan(0);
    expect(new Set(locations).size).toBe(locations.length);
    expect(locations).not.toContain(countyCanonical);
    expect(locations.map((location) => new URL(location).pathname).toSorted()).toEqual(
      expectedPaths.toSorted()
    );
    for (const location of locations) {
      const url = new URL(location);
      expect(url.origin).toBe("https://example.test");
      expect(url.search).toBe("");
      expect(url.pathname).not.toMatch(/^\/api\//);
      expect(url.pathname).not.toBe("/find/");
      expect(url.pathname).not.toBe("/design-lab/");
      expect(url.pathname).not.toContain("/page/");
      expect(url.pathname).not.toContain("cursor");
    }
  });

  test("marks search as noindex and never links an API from public HTML", async ({ page }) => {
    await page.goto("/find/?state=iowa&county=scott-county");

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute("content", /noindex/i);
    await expect(robots).toHaveAttribute("content", /nofollow/i);

    for (const route of ["/", "/coverage/", "/methodology/", countyPath]) {
      await page.goto(route);
      const nonPublicLinks = page.locator(
        'a[href^="/api/"], a[href*="example.test/api/"], a[href^="/find/"], ' +
          'a[href^="/design-lab/"], a[href*="cursor="]'
      );
      await expect(nonPublicLinks).toHaveCount(0);
    }
  });
});

test.describe("approved geographic scope", () => {
  test("inactive state and county paths are genuine 404 responses", async ({ request }) => {
    for (const route of [
      "/coverage/nebraska/",
      "/nebraska/example-county/custody/",
      "/iowa/linn-county/custody/"
    ]) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.status(), route).toBe(404);
    }
  });

  test("excluded legacy jurisdictions have no routes or public output", async ({ request }) => {
    const excludedSlugs = [
      ["ala", "bama"],
      ["arkan", "sas"],
      ["minne", "sota"],
      ["mis", "souri"],
      ["okla", "homa"]
    ].map((parts) => parts.join(""));

    for (const slug of excludedSlugs) {
      for (const route of [`/coverage/${slug}/`, `/${slug}/example-county/custody/`]) {
        const response = await request.get(route, { maxRedirects: 0 });
        expect(response.status(), route).toBe(404);
      }
    }

    const publicOutput = [
      await (await request.get("/")).text(),
      await (await request.get("/coverage/")).text(),
      await (await request.get("/coverage/iowa/")).text(),
      await (await request.get("/sitemap.xml")).text()
    ]
      .join("\n")
      .toLocaleLowerCase("en-US");

    for (const slug of excludedSlugs) {
      expect(publicOutput).not.toContain(slug);
    }
  });
});
