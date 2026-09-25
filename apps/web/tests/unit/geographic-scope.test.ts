import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(import.meta.dirname, "../../../..");
const inspectedRoots = [
  path.join(workspaceRoot, "apps/web/src/app"),
  path.join(workspaceRoot, "apps/web/src/components"),
  path.join(workspaceRoot, "apps/web/src/lib"),
  path.join(workspaceRoot, "packages/test-fixtures")
];
const inspectedExtensions = new Set([".css", ".json", ".md", ".ts", ".tsx", ".yaml", ".yml"]);

const excludedJurisdictions = [
  ["ala", "bama"],
  ["arkan", "sas"],
  ["mis", "souri"],
  ["okla", "homa"]
].map((parts) => parts.join(""));

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function filesWithin(target: string): Promise<string[]> {
  if (!(await exists(target))) {
    return [];
  }

  const entries = await readdir(target, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesWithin(entryPath)));
    } else if (entry.isFile() && inspectedExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

describe("approved Iowa and Minnesota scope", () => {
  it("keeps excluded legacy jurisdictions out of routes, navigation, sitemap code, and fixtures", async () => {
    const inspectedFiles = (await Promise.all(inspectedRoots.map(filesWithin))).flat();
    expect(inspectedFiles.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const file of inspectedFiles) {
      const relativePath = path.relative(workspaceRoot, file).replaceAll("\\", "/");
      const searchable = `${relativePath}\n${await readFile(file, "utf8")}`.toLocaleLowerCase(
        "en-US"
      );
      for (const jurisdiction of excludedJurisdictions) {
        if (searchable.includes(jurisdiction)) {
          violations.push(`${relativePath}: contains excluded jurisdiction ${jurisdiction}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
