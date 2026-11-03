import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const CRAWFORD_COUNTY_MO_ROSTER = {
  adapterKey: "crawford-county-mo-current-roster",
  countyName: "Crawford County",
  diagnosticPrefix: "CRAWFORD_COUNTY_MO",
  sourceUrl: "https://www.crawfordcountyso.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const CAMDEN_COUNTY_MO_ROSTER = {
  adapterKey: "camden-county-mo-current-roster",
  countyName: "Camden County",
  diagnosticPrefix: "CAMDEN_COUNTY_MO",
  sourceUrl: "https://www.camdencountymosheriff.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const POLK_COUNTY_MO_ROSTER = {
  adapterKey: "polk-county-mo-current-roster",
  countyName: "Polk County",
  diagnosticPrefix: "POLK_COUNTY_MO",
  sourceUrl: "https://www.polkcountymosheriff.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const BENTON_COUNTY_MO_ROSTER = {
  adapterKey: "benton-county-mo-current-roster",
  countyName: "Benton County",
  diagnosticPrefix: "BENTON_COUNTY_MO",
  sourceUrl:
    "https://www.bentoncountysheriffmo.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const STONE_COUNTY_MO_ROSTER = {
  adapterKey: "stone-county-mo-current-roster",
  countyName: "Stone County",
  diagnosticPrefix: "STONE_COUNTY_MO",
  sourceUrl: "https://www.stonecountymosheriff.com/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const MISSOURI_ROSTER_SITES = [
  CRAWFORD_COUNTY_MO_ROSTER,
  CAMDEN_COUNTY_MO_ROSTER,
  POLK_COUNTY_MO_ROSTER,
  BENTON_COUNTY_MO_ROSTER,
  STONE_COUNTY_MO_ROSTER
] as const;

export function missouriRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return MISSOURI_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
