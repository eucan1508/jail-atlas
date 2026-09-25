import { expect, test } from "@playwright/test";

const productionOrigin = "https://production-smoke.invalid";
const approvedIndexablePaths = [
  "/",
  "/coverage/",
  "/about/",
  "/methodology/",
  "/source-policy/",
  "/corrections/",
  "/privacy/",
  "/cookies/",
  "/terms/",
  "/disclaimer/"
] as const;

const unavailableProductionPaths = [
  "/design-lab/",
  "/iowa/scott-county/custody/",
  "/api/rosters/00000000-0000-4000-8000-000000000005/?cursor=synthetic-cursor&limit=25",
  "/coverage/iowa/"
] as const;

function robotsMetaTags(html: string): string[] {
  return (html.match(/<meta\b[^>]*>/gi) ?? []).filter((tag) => /name=["']robots["']/i.test(tag));
}

function internalHrefPaths(html: string): string[] {
  return [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => match[1] ?? "")
    .filter((href) => href.startsWith("/"));
}

test("production artifact omits every development and inactive route", async ({ request }) => {
  for (const path of unavailableProductionPaths) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
});

test("approved utility pages remain indexable in the production artifact", async ({ request }) => {
  for (const path of approvedIndexablePaths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["x-robots-tag"] ?? "", path).not.toMatch(/noindex/i);

    const html = await response.text();
    for (const metaTag of robotsMetaTags(html)) {
      expect(metaTag, path).not.toMatch(/noindex/i);
    }

    for (const href of internalHrefPaths(html)) {
      expect(href, `${path} links to ${href}`).not.toMatch(/^\/api\//);
      expect(href, `${path} links to ${href}`).not.toMatch(/^\/find(?:\/|\?|$)/);
      expect(href, `${path} links to ${href}`).not.toMatch(/^\/design-lab(?:\/|\?|$)/);
      expect(href, `${path} links to ${href}`).not.toMatch(/[?&]cursor=/);
    }
  }
});

test("production sitemap contains exactly the approved indexable routes", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);

  const xml = await response.text();
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1] ?? "");
  const expectedLocations = approvedIndexablePaths.map((path) => `${productionOrigin}${path}`);

  expect(locations.toSorted()).toEqual(expectedLocations.toSorted());
  expect(new Set(locations).size).toBe(locations.length);
  expect(xml).not.toMatch(/\/api\/|\/find\/|\/design-lab\/|cursor=|\/coverage\/iowa\//);
});

test("production search results carry explicit noindex metadata", async ({ request }) => {
  const response = await request.get("/find/?state=iowa&county=scott-county");
  expect(response.status()).toBe(200);

  const html = await response.text();
  const metaTags = robotsMetaTags(html);
  expect(metaTags.length).toBeGreaterThan(0);
  expect(metaTags.some((tag) => /noindex/i.test(tag))).toBe(true);
  expect(metaTags.some((tag) => /nofollow/i.test(tag))).toBe(true);
});

test("robots.txt is a crawl hint rather than the noindex enforcement layer", async ({
  request
}) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);

  const body = await response.text();
  expect(body).toContain("Allow: /");
  expect(body).not.toContain("Disallow: /api/");
  expect(body).not.toContain("Disallow: /find/");
  expect(body).not.toContain("Disallow: /design-lab/");
  expect(body).toContain(`${productionOrigin}/sitemap.xml`);
});
