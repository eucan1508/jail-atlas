import {
  createSheriffRosterSiteAdapter,
  type SheriffRosterAdapterOptions,
  type SheriffRosterSiteConfig
} from "./sheriff-roster-site.js";

export const JEFFERSON_COUNTY_AR_ROSTER = {
  adapterKey: "jefferson-county-ar-current-roster",
  countyName: "Jefferson County",
  diagnosticPrefix: "JEFFERSON_COUNTY_AR",
  sourceUrl: "https://www.jeffcoso.org/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const LOGAN_COUNTY_AR_ROSTER = {
  adapterKey: "logan-county-ar-current-roster",
  countyName: "Logan County",
  diagnosticPrefix: "LOGAN_COUNTY_AR",
  sourceUrl: "https://www.loganso.com/roster.php",
  parserVersion: "1.0.0",
  layout: "roster-php"
} as const satisfies SheriffRosterSiteConfig;

export const GREENE_COUNTY_AR_ROSTER = {
  adapterKey: "greene-county-ar-current-roster",
  countyName: "Greene County",
  diagnosticPrefix: "GREENE_COUNTY_AR",
  sourceUrl: "https://www.greenesoar.gov/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const CLEBURNE_COUNTY_AR_ROSTER = {
  adapterKey: "cleburne-county-ar-current-roster",
  countyName: "Cleburne County",
  diagnosticPrefix: "CLEBURNE_COUNTY_AR",
  sourceUrl: "https://www.cleburnearso.gov/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const FAULKNER_COUNTY_AR_ROSTER = {
  adapterKey: "faulkner-county-ar-current-roster",
  countyName: "Faulkner County",
  diagnosticPrefix: "FAULKNER_COUNTY_AR",
  sourceUrl: "https://www.fcso.ar.gov/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const ARKANSAS_ROSTER_SITES = [
  JEFFERSON_COUNTY_AR_ROSTER,
  LOGAN_COUNTY_AR_ROSTER,
  GREENE_COUNTY_AR_ROSTER,
  CLEBURNE_COUNTY_AR_ROSTER,
  FAULKNER_COUNTY_AR_ROSTER
] as const;

export type ArkansasRosterAdapterKey = (typeof ARKANSAS_ROSTER_SITES)[number]["adapterKey"];

export function arkansasRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return ARKANSAS_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}

export function createArkansasRosterAdapter(
  adapterKey: ArkansasRosterAdapterKey,
  options: SheriffRosterAdapterOptions
) {
  const site = arkansasRosterSite(adapterKey);
  if (!site) throw new Error(`Unknown Arkansas roster adapter: ${adapterKey}`);
  return createSheriffRosterSiteAdapter(site, options);
}
