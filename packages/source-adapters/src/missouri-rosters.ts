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

export const LAWRENCE_COUNTY_MO_ROSTER = {
  adapterKey: "lawrence-county-mo-current-roster",
  countyName: "Lawrence County",
  diagnosticPrefix: "LAWRENCE_COUNTY_MO",
  sourceUrl: "https://www.lawrencecosheriff.com/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const LEWIS_COUNTY_MO_ROSTER = {
  adapterKey: "lewis-county-mo-current-roster",
  countyName: "Lewis County",
  diagnosticPrefix: "LEWIS_COUNTY_MO",
  sourceUrl: "https://www.lewiscosheriff.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const MORGAN_COUNTY_MO_ROSTER = {
  adapterKey: "morgan-county-mo-current-roster",
  countyName: "Morgan County",
  diagnosticPrefix: "MORGAN_COUNTY_MO",
  sourceUrl: "https://www.morgancountymoso.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const ANDREW_COUNTY_MO_ROSTER = {
  adapterKey: "andrew-county-mo-current-roster",
  countyName: "Andrew County",
  diagnosticPrefix: "ANDREW_COUNTY_MO",
  sourceUrl: "https://www.andrewcountysheriff.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const CALLAWAY_COUNTY_MO_ROSTER = {
  adapterKey: "callaway-county-mo-current-roster",
  countyName: "Callaway County",
  diagnosticPrefix: "CALLAWAY_COUNTY_MO",
  sourceUrl: "https://www.callawaysheriff.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const SALINE_COUNTY_MO_ROSTER = {
  adapterKey: "saline-county-mo-current-roster",
  countyName: "Saline County",
  diagnosticPrefix: "SALINE_COUNTY_MO",
  sourceUrl: "https://www.salinecountysheriff.com/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php",
  chargeLinesEndWithBond: true
} as const satisfies SheriffRosterSiteConfig;

export const CAPE_GIRARDEAU_COUNTY_MO_ROSTER = {
  adapterKey: "cape-girardeau-county-mo-current-roster",
  countyName: "Cape Girardeau County",
  diagnosticPrefix: "CAPE_GIRARDEAU_COUNTY_MO",
  sourceUrl: "https://www.capecountysheriff.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path",
  textLineBreaksAreSpaces: true
} as const satisfies SheriffRosterSiteConfig;

export const CALDWELL_COUNTY_MO_ROSTER = {
  adapterKey: "caldwell-county-mo-current-roster",
  countyName: "Caldwell County",
  diagnosticPrefix: "CALDWELL_COUNTY_MO",
  sourceUrl: "https://www.caldwellcosdmo.gov/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const MISSOURI_ROSTER_SITES = [
  CRAWFORD_COUNTY_MO_ROSTER,
  CAMDEN_COUNTY_MO_ROSTER,
  POLK_COUNTY_MO_ROSTER,
  BENTON_COUNTY_MO_ROSTER,
  STONE_COUNTY_MO_ROSTER,
  LAWRENCE_COUNTY_MO_ROSTER,
  LEWIS_COUNTY_MO_ROSTER,
  MORGAN_COUNTY_MO_ROSTER,
  ANDREW_COUNTY_MO_ROSTER,
  CALLAWAY_COUNTY_MO_ROSTER,
  SALINE_COUNTY_MO_ROSTER,
  CAPE_GIRARDEAU_COUNTY_MO_ROSTER,
  CALDWELL_COUNTY_MO_ROSTER
] as const;

export function missouriRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return MISSOURI_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
