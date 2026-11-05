import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const BOURBON_COUNTY_KS_ROSTER = {
  adapterKey: "bourbon-county-ks-current-roster",
  countyName: "Bourbon County",
  diagnosticPrefix: "BOURBON_COUNTY_KS",
  sourceUrl:
    "https://www.bourboncountysheriffks.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const COFFEY_COUNTY_KS_ROSTER = {
  adapterKey: "coffey-county-ks-current-roster",
  countyName: "Coffey County",
  diagnosticPrefix: "COFFEY_COUNTY_KS",
  sourceUrl:
    "https://www.coffeycountysheriff.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const ATCHISON_COUNTY_KS_ROSTER = {
  adapterKey: "atchison-county-ks-current-roster",
  countyName: "Atchison County",
  diagnosticPrefix: "ATCHISON_COUNTY_KS",
  sourceUrl: "https://www.atcosheriffks.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const LEAVENWORTH_COUNTY_KS_ROSTER = {
  adapterKey: "leavenworth-county-ks-current-roster",
  countyName: "Leavenworth County",
  diagnosticPrefix: "LEAVENWORTH_COUNTY_KS",
  sourceUrl: "https://www.lvsheriff.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const JEFFERSON_COUNTY_KS_ROSTER = {
  adapterKey: "jefferson-county-ks-current-roster",
  countyName: "Jefferson County",
  diagnosticPrefix: "JEFFERSON_COUNTY_KS",
  sourceUrl:
    "https://www.jeffersoncountykssheriff.com/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const WOODSON_COUNTY_KS_ROSTER = {
  adapterKey: "woodson-county-ks-current-roster",
  countyName: "Woodson County",
  diagnosticPrefix: "WOODSON_COUNTY_KS",
  sourceUrl: "https://www.woodsonsheriff.com/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const CHEROKEE_COUNTY_KS_ROSTER = {
  adapterKey: "cherokee-county-ks-current-roster",
  countyName: "Cherokee County",
  diagnosticPrefix: "CHEROKEE_COUNTY_KS",
  sourceUrl:
    "https://www.cherokeecountykssheriff.com/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const KANSAS_ROSTER_SITES = [
  BOURBON_COUNTY_KS_ROSTER,
  COFFEY_COUNTY_KS_ROSTER,
  ATCHISON_COUNTY_KS_ROSTER,
  LEAVENWORTH_COUNTY_KS_ROSTER,
  JEFFERSON_COUNTY_KS_ROSTER,
  WOODSON_COUNTY_KS_ROSTER,
  CHEROKEE_COUNTY_KS_ROSTER
] as const;

export function kansasRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return KANSAS_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
