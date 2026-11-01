import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const CRAWFORD_COUNTY_MO_ROSTER = {
  adapterKey: "crawford-county-mo-current-roster",
  countyName: "Crawford County",
  diagnosticPrefix: "CRAWFORD_COUNTY_MO",
  sourceUrl: "https://www.crawfordcountyso.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const MISSOURI_ROSTER_SITES = [CRAWFORD_COUNTY_MO_ROSTER] as const;

export function missouriRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return MISSOURI_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
