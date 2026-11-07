import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const FRANKLIN_COUNTY_AL_ROSTER = {
  adapterKey: "franklin-county-al-current-roster",
  countyName: "Franklin County",
  diagnosticPrefix: "FRANKLIN_COUNTY_AL",
  sourceUrl: "https://www.franklinsheriff.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const CHILTON_COUNTY_AL_ROSTER = {
  adapterKey: "chilton-county-al-current-roster",
  countyName: "Chilton County",
  diagnosticPrefix: "CHILTON_COUNTY_AL",
  sourceUrl: "https://www.chiltoncountyso.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const ST_CLAIR_COUNTY_AL_ROSTER = {
  adapterKey: "st-clair-county-al-current-roster",
  countyName: "St. Clair County",
  diagnosticPrefix: "ST_CLAIR_COUNTY_AL",
  sourceUrl: "https://www.stclairsheriff.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const ALABAMA_ROSTER_SITES = [
  FRANKLIN_COUNTY_AL_ROSTER,
  CHILTON_COUNTY_AL_ROSTER,
  ST_CLAIR_COUNTY_AL_ROSTER
] as const;

export function alabamaRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return ALABAMA_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
