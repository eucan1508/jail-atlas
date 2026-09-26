import { isProductionEnvironment, readEnvironment } from "./env";

export type CoverageState = "iowa" | "minnesota";

export type CountyCoverageBrief = Readonly<{
  state: CoverageState;
  stateName: string;
  county: string;
  slug: string;
  seatCity: string;
  h1: string;
  title: string;
  description: string;
  article: string;
  officialSourceUrl: string;
  officialSourceLabel: string;
  sourceStatus: "audit_pending";
}>;

/**
 * Editorial briefs are intentionally separate from custody rows. They describe the page and its
 * source relationship; live records are only rendered after the publication review gate passes.
 */
export const countyCoverageCatalog: readonly CountyCoverageBrief[] = [
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Dallas County",
    slug: "dallas-county",
    seatCity: "Adel",
    h1: "Dallas County, Iowa custody information",
    title: "Dallas County Iowa custody information and inmate search",
    description:
      "Check Dallas County, Iowa custody information with the official source, freshness time, and source-listed charges kept in context.",
    article:
      "This page is being prepared around the Dallas County Inmate Inquiry and the county's jail information. When approved, it will show the current-custody scope published by that source, the last successful fetch, source-labelled charges, and verified facility contacts.",
    officialSourceUrl:
      "https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True",
    officialSourceLabel: "Dallas County Inmate Inquiry",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Cedar County",
    slug: "cedar-county",
    seatCity: "Tipton",
    h1: "Cedar County, Iowa custody information",
    title: "Cedar County Iowa custody information and inmate roster",
    description:
      "Review Cedar County, Iowa custody information with source scope, freshness, and official contact details shown beside the roster.",
    article:
      "Cedar County publishes an inmate roster through its Sheriff's Office. The production page will preserve the roster's current-custody scope and will link directly to the county source whenever a record or source status is shown.",
    officialSourceUrl: "https://cedarcounty.iowa.gov/sheriff/inmate_roster/",
    officialSourceLabel: "Cedar County Sheriff inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Polk County",
    slug: "polk-county",
    seatCity: "Des Moines",
    h1: "Polk County, Iowa custody information",
    title: "Polk County Iowa custody information and jail arrest search",
    description:
      "Find Polk County, Iowa jail and arrest information with the official source, update time, and clear custody-data limits.",
    article:
      "Polk County's official jail and arrest information explains its current listing and the limits of the published data. The county page will keep those distinctions visible instead of presenting a roster as a court record or a conviction record.",
    officialSourceUrl:
      "https://www.polkcountyiowa.gov/county-sheriff/detention/jail-and-arrest-information/",
    officialSourceLabel: "Polk County Jail and Arrest Information",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Linn County",
    slug: "linn-county",
    seatCity: "Cedar Rapids",
    h1: "Linn County, Iowa custody information",
    title: "Linn County Iowa custody information and inmate search",
    description:
      "Check Linn County, Iowa custody information with official source links, freshness status, and county-specific contact guidance.",
    article:
      "Linn County's Law and Public Safety pages link to the Sheriff's Office and inmate-search resources. The production article will document which linked source supplies current custody, what fields it publishes, and when the source was last checked.",
    officialSourceUrl: "https://www.linncountyiowa.gov/160/9061/Law-Public-Safety",
    officialSourceLabel: "Linn County Law and Public Safety",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Black Hawk County",
    slug: "black-hawk-county",
    seatCity: "Waterloo",
    h1: "Black Hawk County, Iowa custody information",
    title: "Black Hawk County Iowa custody information and who's in jail",
    description:
      "Review Black Hawk County, Iowa custody information with official source context, charges, and update status.",
    article:
      "Black Hawk County Sheriff's Office publishes a current Who's In Jail view. The county article will explain the source's scope, preserve its labels, and provide a correction path without creating a permanent person profile.",
    officialSourceUrl: "https://www.bhcso.org/whos-in-jail",
    officialSourceLabel: "Black Hawk County Sheriff's Office — Who's In Jail",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Ramsey County",
    slug: "ramsey-county",
    seatCity: "Saint Paul",
    h1: "Ramsey County, Minnesota custody information",
    title: "Ramsey County Minnesota custody information and detention roster",
    description:
      "Review Ramsey County, Minnesota adult detention information with official source context, freshness, and clear data limits.",
    article:
      "Ramsey County provides an Adult Detention Center roster through its official open-data service. The county page will distinguish current custody from the source's short release window and display the source update time.",
    officialSourceUrl:
      "https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/",
    officialSourceLabel: "Ramsey County Adult Detention Center roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Stearns County",
    slug: "stearns-county",
    seatCity: "Saint Cloud",
    h1: "Stearns County, Minnesota custody information",
    title: "Stearns County Minnesota custody information and jail roster",
    description:
      "Check Stearns County, Minnesota custody information with the official jail roster source and its current-custody scope.",
    article:
      "Stearns County's Sheriff's Office links its jail roster for current custody information. The production article will preserve the source's labels, record the source timestamp, and send questions that the roster cannot answer back to the official jail contact.",
    officialSourceUrl: "https://jailroster.stearnscountymn.gov/Current",
    officialSourceLabel: "Stearns County current jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Anoka County",
    slug: "anoka-county",
    seatCity: "Anoka",
    h1: "Anoka County, Minnesota custody information",
    title: "Anoka County Minnesota custody information and inmate locator",
    description:
      "Find Anoka County, Minnesota custody information with the official inmate locator, source scope, and freshness details.",
    article:
      "Anoka County's official inmate locator covers current and recently released records. The production page will select one approved scope, label it clearly, and keep any release window separate from current custody.",
    officialSourceUrl:
      "https://incustodysearch.co.anoka.mn.us/JailInfoForPublic/inmates_jsonp.aspx?callback=anokaInmates",
    officialSourceLabel: "Anoka County official inmate locator data feed",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Washington County",
    slug: "washington-county",
    seatCity: "Stillwater",
    h1: "Washington County, Minnesota custody information",
    title: "Washington County Minnesota custody information and jail list",
    description:
      "Review Washington County, Minnesota custody information with the official jail list, source date, and verified facility contacts.",
    article:
      "Washington County publishes jail-list information through the Sheriff's Office. The county article will identify the official list date, explain its current-custody scope, and avoid treating a published entry as a court outcome.",
    officialSourceUrl: "https://washingtoncountymn.gov/3214/Inmate-Information",
    officialSourceLabel: "Washington County inmate information",
    sourceStatus: "audit_pending"
  }
];

export function countiesForState(state: CoverageState): readonly CountyCoverageBrief[] {
  return countyCoverageCatalog.filter((county) => county.state === state);
}

export function findCountyCoverage(state: string, county: string): CountyCoverageBrief | undefined {
  return countyCoverageCatalog.find((entry) => entry.state === state && entry.slug === county);
}

export function coveragePreviewAllowed(): boolean {
  return !isProductionEnvironment(readEnvironment());
}

export function countyCoveragePath(entry: CountyCoverageBrief): string {
  return `/${entry.state}/${entry.slug}/custody/`;
}
