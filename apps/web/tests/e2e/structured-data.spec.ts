import { expect, test, type Page } from "@playwright/test";
import { countyCanonical, countyPath, normalizedText } from "./support/contracts";

type JsonLdNode = Record<string, unknown>;

async function jsonLdNodes(page: Page): Promise<JsonLdNode[]> {
  const payloads = await page.locator('script[type="application/ld+json"]').allTextContents();
  const nodes: JsonLdNode[] = [];

  for (const payload of payloads) {
    const parsed = JSON.parse(payload) as JsonLdNode;
    const graph = parsed["@graph"];
    if (Array.isArray(graph)) {
      nodes.push(...(graph as JsonLdNode[]));
    } else {
      nodes.push(parsed);
    }
  }

  return nodes;
}

function nodeTypes(node: JsonLdNode): string[] {
  const value = node["@type"];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

test("structured data describes the visible county document and non-government publisher", async ({
  page
}) => {
  await page.goto(countyPath);

  const nodes = await jsonLdNodes(page);
  expect(nodes.length).toBeGreaterThan(0);
  const allTypes = nodes.flatMap(nodeTypes);

  expect(allTypes).toContain("Organization");
  expect(allTypes).toContain("WebSite");
  expect(allTypes).toContain("BreadcrumbList");
  expect(allTypes.some((type) => type === "WebPage" || type === "CollectionPage")).toBe(true);
  expect(allTypes).not.toContain("GovernmentOrganization");
  expect(allTypes).not.toContain("Person");
  expect(allTypes).not.toContain("FAQPage");

  const organization = nodes.find((node) => nodeTypes(node).includes("Organization"));
  const brandName = normalizedText(await page.locator("header").first().textContent());
  expect(brandName).toContain(String(organization?.name));

  const pageNode = nodes.find((node) =>
    nodeTypes(node).some((type) => type === "WebPage" || type === "CollectionPage")
  );
  expect(pageNode?.url).toBe(countyCanonical);
  const heading = normalizedText(await page.locator("h1").textContent());
  expect(heading.toLocaleLowerCase("en-US")).toContain("scott county");
  expect(String(pageNode?.name).toLocaleLowerCase("en-US")).toContain("scott county");

  const breadcrumbs = nodes.find((node) => nodeTypes(node).includes("BreadcrumbList"));
  const breadcrumbReference = pageNode?.breadcrumb as { "@id"?: unknown } | undefined;
  if (breadcrumbReference?.["@id"]) {
    expect(breadcrumbs?.["@id"]).toBe(breadcrumbReference["@id"]);
  }
  const items = breadcrumbs?.itemListElement;
  expect(Array.isArray(items)).toBe(true);
  const visibleItems = page.locator('nav[aria-label*="readcrumb" i] li');
  await expect(visibleItems).toHaveCount((items as unknown[]).length);
  for (const [index, item] of (
    items as Array<{ item?: unknown; name?: unknown; position?: unknown }>
  ).entries()) {
    const visibleItem = visibleItems.nth(index);
    expect(normalizedText(await visibleItem.textContent())).toBe(String(item.name));
    expect(item.position).toBe(index + 1);

    const link = visibleItem.locator("a");
    const expectedUrl =
      (await link.count()) > 0
        ? new URL((await link.getAttribute("href")) ?? "", countyCanonical).toString()
        : countyCanonical;
    expect(item.item).toBe(expectedUrl);
  }
});
