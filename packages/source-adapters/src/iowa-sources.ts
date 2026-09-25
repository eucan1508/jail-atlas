import {
  BLACK_HAWK_COUNTY_ADAPTER_KEY,
  BLACK_HAWK_COUNTY_CURRENT_SOURCE_URL
} from "./iowa-current-roster.js";
import {
  CEDAR_COUNTY_ADAPTER_KEY,
  CEDAR_COUNTY_CURRENT_SOURCE_URL
} from "./iowa-current-roster.js";
import { DALLAS_COUNTY_ADAPTER_KEY, DALLAS_COUNTY_CURRENT_SOURCE_URL } from "./dallas-county.js";

export type IowaSourceStatus = "adapter_ready" | "blocked" | "pending_endpoint_audit";

export interface IowaSourceDefinition {
  readonly state: "IA";
  readonly countySlug: string;
  readonly countyName: string;
  readonly officialInstitutionUrl: string;
  readonly sourceUrl: string;
  readonly sourceType: "official_county" | "official_sheriff" | "officially_linked_vendor";
  readonly relationshipKind: "directly_operated" | "official_link";
  readonly adapterKey: string | null;
  readonly status: IowaSourceStatus;
  readonly reason: string;
}

/**
 * The Iowa launch list is deliberately explicit. A blocked source remains in
 * the audit trail but cannot be accidentally registered for ingestion.
 */
export const IOWA_SOURCE_DEFINITIONS: readonly IowaSourceDefinition[] = Object.freeze([
  {
    state: "IA",
    countySlug: "dallas",
    countyName: "Dallas County",
    officialInstitutionUrl: "https://www.dallascountyiowa.gov/365/Inmate-Search",
    sourceUrl: DALLAS_COUNTY_CURRENT_SOURCE_URL,
    sourceType: "officially_linked_vendor",
    relationshipKind: "official_link",
    adapterKey: DALLAS_COUNTY_ADAPTER_KEY,
    status: "adapter_ready",
    reason: "Official county page links to the current-custody roster."
  },
  {
    state: "IA",
    countySlug: "cedar",
    countyName: "Cedar County",
    officialInstitutionUrl: "https://cedarcounty.iowa.gov/sheriff/",
    sourceUrl: CEDAR_COUNTY_CURRENT_SOURCE_URL,
    sourceType: "official_sheriff",
    relationshipKind: "directly_operated",
    adapterKey: CEDAR_COUNTY_ADAPTER_KEY,
    status: "adapter_ready",
    reason: "Official sheriff roster publishes current custody rows."
  },
  {
    state: "IA",
    countySlug: "black-hawk",
    countyName: "Black Hawk County",
    officialInstitutionUrl: "https://www.bhcso.org/whos-in-jail",
    sourceUrl: BLACK_HAWK_COUNTY_CURRENT_SOURCE_URL,
    sourceType: "official_sheriff",
    relationshipKind: "directly_operated",
    adapterKey: BLACK_HAWK_COUNTY_ADAPTER_KEY,
    status: "adapter_ready",
    reason: "Official sheriff roster publishes current custody rows."
  },
  {
    state: "IA",
    countySlug: "polk",
    countyName: "Polk County",
    officialInstitutionUrl:
      "https://www.polkcountyiowa.gov/county-sheriff/detention/jail-and-arrest-information/",
    sourceUrl: "https://polkinmates.polkcountyiowa.gov/Inmates/Current",
    sourceType: "officially_linked_vendor",
    relationshipKind: "official_link",
    adapterKey: null,
    status: "blocked",
    reason: "Unattended verification received access denied; endpoint contract is not approved."
  },
  {
    state: "IA",
    countySlug: "linn",
    countyName: "Linn County",
    officialInstitutionUrl: "https://www.linncountyiowa.gov/1150/Find",
    sourceUrl: "https://inmatesearch.linncounty.org",
    sourceType: "officially_linked_vendor",
    relationshipKind: "official_link",
    adapterKey: null,
    status: "blocked",
    reason: "The linked roster presents a CAPTCHA and cannot be refreshed unattended."
  },
  {
    state: "IA",
    countySlug: "johnson",
    countyName: "Johnson County",
    officialInstitutionUrl: "https://johnsoncountyiowa.gov/office-of-sheriff",
    sourceUrl: "https://ww1.johnsoncountyiowa.gov/Sheriff/JailRoster/index",
    sourceType: "official_sheriff",
    relationshipKind: "official_link",
    adapterKey: null,
    status: "blocked",
    reason: "The linked roster returned access denied during unattended verification."
  },
  {
    state: "IA",
    countySlug: "story",
    countyName: "Story County",
    officialInstitutionUrl: "https://storycountyiowa.gov/112/Sheriffs-Office",
    sourceUrl: "https://centraliowa.policetocitizen.com/",
    sourceType: "officially_linked_vendor",
    relationshipKind: "official_link",
    adapterKey: null,
    status: "pending_endpoint_audit",
    reason:
      "Official page links to the Central Iowa service; the exact roster endpoint is pending audit."
  }
]);

export const IOWA_ENABLED_SOURCE_DEFINITIONS = Object.freeze(
  IOWA_SOURCE_DEFINITIONS.filter(
    (source): source is IowaSourceDefinition & { readonly adapterKey: string } =>
      source.adapterKey !== null && source.status === "adapter_ready"
  )
);
