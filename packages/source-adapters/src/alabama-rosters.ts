import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const FRANKLIN_COUNTY_AL_ROSTER = {
  adapterKey: "franklin-county-al-current-roster",
  countyName: "Franklin County",
  diagnosticPrefix: "FRANKLIN_COUNTY_AL",
  sourceUrl: "https://www.franklinsheriff.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const ALABAMA_ROSTER_SITES = [FRANKLIN_COUNTY_AL_ROSTER] as const;

export function alabamaRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return ALABAMA_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
