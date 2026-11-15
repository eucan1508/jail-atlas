import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const MAYES_COUNTY_OK_ROSTER = {
  adapterKey: "mayes-county-ok-current-roster",
  countyName: "Mayes County",
  diagnosticPrefix: "MAYES_COUNTY_OK",
  sourceUrl: "https://www.mayessheriff.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const OKLAHOMA_ROSTER_SITES = [MAYES_COUNTY_OK_ROSTER] as const;

export function oklahomaRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return OKLAHOMA_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
