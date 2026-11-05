import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const IDA_COUNTY_IA_ROSTER = {
  adapterKey: "ida-county-ia-current-roster",
  countyName: "Ida County",
  diagnosticPrefix: "IDA_COUNTY_IA",
  sourceUrl: "https://www.idacountysheriff.us/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const IOWA_ROSTER_SITES = [IDA_COUNTY_IA_ROSTER] as const;

export function iowaRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return IOWA_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
