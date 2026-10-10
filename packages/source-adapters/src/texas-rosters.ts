import type { SheriffRosterSiteConfig } from "./sheriff-roster-site.js";

export const BURLESON_COUNTY_TX_ROSTER = {
  adapterKey: "burleson-county-tx-current-roster",
  countyName: "Burleson County",
  diagnosticPrefix: "BURLESON_COUNTY_TX",
  sourceUrl:
    "https://www.burlesoncountysherifftx.org/inmate-roster/filters/current/booking_time=desc/1",
  parserVersion: "1.0.0",
  layout: "inmate-roster-path"
} as const satisfies SheriffRosterSiteConfig;

export const TEXAS_ROSTER_SITES = [BURLESON_COUNTY_TX_ROSTER] as const;

export function texasRosterSite(adapterKey: string): SheriffRosterSiteConfig | null {
  return TEXAS_ROSTER_SITES.find((site) => site.adapterKey === adapterKey) ?? null;
}
