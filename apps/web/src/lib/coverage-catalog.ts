import { isProductionEnvironment, readEnvironment } from "./env";

export type CoverageState = "iowa" | "minnesota" | "texas" | "arkansas" | "oklahoma";

export type CountyCoverageBrief = Readonly<{
  state: CoverageState;
  stateName: string;
  county: string;
  slug: string;
  publishedAt: string;
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
    publishedAt: "2026-09-25",
    seatCity: "Adel",
    h1: "Dallas County Jail Roster & Inmate Search",
    title: "Dallas County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Check Dallas County, Iowa custody information with the official source, freshness time, and source-listed charges kept in context.",
    article:
      "Dallas County's official Inmate Inquiry publishes the current-custody scope shown here. This page keeps the last successful fetch and source-labelled charges in view.",
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
    publishedAt: "2026-09-25",
    seatCity: "Tipton",
    h1: "Cedar County Jail Roster & Inmate Search",
    title: "Cedar County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Review Cedar County, Iowa custody information with source scope, freshness, and official contact details shown beside the roster.",
    article:
      "Cedar County publishes an inmate roster through its Sheriff's Office. This page preserves the roster's current-custody scope, capture time, and source-labelled fields.",
    officialSourceUrl: "https://cedarcounty.iowa.gov/sheriff/inmate_roster/",
    officialSourceLabel: "Cedar County Sheriff inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Polk County",
    slug: "polk-county",
    publishedAt: "2026-10-16",
    seatCity: "Des Moines",
    h1: "Polk County Jail Roster & Inmate Search",
    title: "Polk County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Polk County, Iowa current-inmate information for the jail in Des Moines from the official Current Inmate Listing, with booking numbers, open charges, Iowa Code sections, and capture time.",
    article:
      "The Polk County Sheriff's Office publishes a Current Inmate Listing of people in its custody, leaving out inmates with federal charges. This page lists only the people the listing shows held at the Polk County Jail in Des Moines, with booking numbers and charges from open cases with their Iowa Code sections, and leaves out ages, physical descriptions, case numbers, arresting agencies, bail, and cleared cases.",
    officialSourceUrl: "https://polkinmates.polkcountyiowa.gov/Inmates/Current",
    officialSourceLabel: "Polk County Sheriff Current Inmate Listing",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Linn County",
    slug: "linn-county",
    publishedAt: "2026-09-25",
    seatCity: "Cedar Rapids",
    h1: "Linn County Jail Roster & Inmate Search",
    title: "Linn County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Check Linn County, Iowa custody information with source status, freshness, and county-specific contact guidance.",
    article:
      "Linn County's Law and Public Safety pages identify the Sheriff's Office and inmate-search resources. The production article documents which source supplies current custody, what fields it publishes, and when the source was last checked.",
    officialSourceUrl: "https://www.linncountyiowa.gov/160/9061/Law-Public-Safety",
    officialSourceLabel: "Linn County Law and Public Safety",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Black Hawk County",
    slug: "black-hawk-county",
    publishedAt: "2026-09-25",
    seatCity: "Waterloo",
    h1: "Black Hawk County Jail Roster & Inmate Search",
    title: "Black Hawk County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Review Black Hawk County, Iowa custody information with official source context, charges, and update status.",
    article:
      "Black Hawk County Sheriff's Office publishes a current Who's In Jail view. This page explains the source's scope, preserves its labels, and provides a correction path without creating a permanent person profile.",
    officialSourceUrl: "https://www.bhcso.org/whos-in-jail",
    officialSourceLabel: "Black Hawk County Sheriff's Office — Who's In Jail",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Cerro Gordo County",
    slug: "cerro-gordo-county",
    publishedAt: "2026-10-08",
    seatCity: "Mason City",
    h1: "Cerro Gordo County Jail Roster & Inmate Search",
    title: "Cerro Gordo County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Cerro Gordo County, Iowa current-custody information for the jail in Mason City from the official population report, with Iowa Code citations and capture time.",
    article:
      "The Cerro Gordo County Sheriff's Office publishes an online population report for its jail in Mason City. This page keeps each person's name and charges with their Iowa Code citations, and leaves out photos, ages, housing units, jail ID numbers, and bond figures.",
    officialSourceUrl: "https://sofiles.cerrogordo.gov/inmate_report/",
    officialSourceLabel: "Cerro Gordo County Sheriff's Office jail population report",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Johnson County",
    slug: "johnson-county",
    publishedAt: "2026-10-14",
    seatCity: "Iowa City",
    h1: "Johnson County Jail Roster & Inmate Search",
    title: "Johnson County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Johnson County, Iowa current-custody information for the jail in Iowa City from the official sheriff roster, with pending charges, Iowa Code sections, and capture time.",
    article:
      "The Johnson County Sheriff's Office publishes a jail roster of people in its custody, including some it boards in other counties' jails. This page lists only the people the roster shows at the Johnson County Jail in Iowa City, with each pending charge and its Iowa Code section, and leaves out ages, home addresses, physical descriptions, cause numbers, and bond amounts.",
    officialSourceUrl: "https://ww1.johnsoncountyiowa.gov/Sheriff/jailroster/list",
    officialSourceLabel: "Johnson County Sheriff's Office jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Woodbury County",
    slug: "woodbury-county",
    publishedAt: "2026-10-17",
    seatCity: "Sioux City",
    h1: "Woodbury County Jail Roster & Inmate Search",
    title: "Woodbury County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Woodbury County, Iowa current-inmate information for the jail in Sioux City from the official In Jail Search, with charges, bond amounts, and capture time.",
    article:
      "The Woodbury County Sheriff's Office publishes an In Jail Search of everyone held at the Woodbury County Jail in Sioux City. This page lists each person with the charges and bond amount exactly as the search shows them, and leaves out booking dates and times.",
    officialSourceUrl: "https://injail.wcicc.com/",
    officialSourceLabel: "Woodbury County In Jail Search",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Clinton County",
    slug: "clinton-county",
    publishedAt: "2026-10-25",
    seatCity: "Clinton",
    h1: "Clinton County Jail Roster & Inmate Search",
    title: "Clinton County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Clinton County, Iowa current-inmate information for the jail in Clinton from the official jail portal, with charges, warrants, holds, bond amounts, and capture time.",
    article:
      "The Clinton County Sheriff's Office links a jail portal that lists everyone held at the Clinton County Jail. This page shows each person still in custody with every charge, warrant, or hold and its bond as the portal lists them, and leaves out ages, photos, and arrest dates.",
    officialSourceUrl: "https://portal.ia-clinton-so.centralsquarecloud.com/inmates",
    officialSourceLabel: "Clinton County Jail portal",
    sourceStatus: "audit_pending"
  },
  {
    state: "iowa",
    stateName: "Iowa",
    county: "Marshall County",
    slug: "marshall-county",
    publishedAt: "2026-10-25",
    seatCity: "Marshalltown",
    h1: "Marshall County Jail Roster & Inmate Search",
    title: "Marshall County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Marshall County, Iowa current-inmate information for the jail in Marshalltown from the official jail portal, with charges, warrants, holds, bond amounts, and capture time.",
    article:
      "The Marshall County Sheriff's Office links a jail portal as the Inmate List for the Marshall County Jail in Marshalltown. This page shows each person still in custody with every charge, warrant, or hold and its bond as the portal lists them, and leaves out ages, photos, and arrest dates.",
    officialSourceUrl: "https://marshall-so-ia.zuercherportal.com/#/inmates",
    officialSourceLabel: "Marshall County Jail portal",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Milam County",
    slug: "milam-county",
    publishedAt: "2026-09-29",
    seatCity: "Cameron",
    h1: "Milam County Jail Roster & Inmate Search",
    title: "Milam County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Review Milam County, Texas current-inmate information with the official sheriff roster, source-listed charges, bond labels, and capture time.",
    article:
      "The Milam County Sheriff's Office publishes a paginated current Inmate Roster. This page preserves the roster's current-custody scope, booking number, source-listed charges, bond labels, and capture time without republishing mugshots.",
    officialSourceUrl: "https://www.milamcountysherifftx.org/roster.php",
    officialSourceLabel: "Milam County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Hutchinson County",
    slug: "hutchinson-county",
    publishedAt: "2026-09-30",
    seatCity: "Stinnett",
    h1: "Hutchinson County Jail Roster & Inmate Search",
    title: "Hutchinson County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Review Hutchinson County, Texas current-inmate information with the official sheriff roster, source-listed charges, bond labels, and capture time.",
    article:
      "The Hutchinson County Sheriff's Office publishes a paginated current Inmate Roster for its jail in Borger. This page preserves the roster's current-custody scope, booking number, source-listed charges, bond labels, and capture time without republishing mugshots.",
    officialSourceUrl: "https://www.hutchinsonsherifftx.org/roster.php",
    officialSourceLabel: "Hutchinson County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Kendall County",
    slug: "kendall-county",
    publishedAt: "2026-09-30",
    seatCity: "Boerne",
    h1: "Kendall County Jail Roster & Inmate Search",
    title: "Kendall County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Review Kendall County, Texas current-inmate information with the official sheriff roster, source-listed charges, bond labels, and capture time.",
    article:
      "The Kendall County Sheriff's Office publishes a paginated current Inmate Roster for the county jail in Boerne. This page preserves the roster's current-custody scope, booking number, source-listed charges, bond labels, and capture time without republishing mugshots.",
    officialSourceUrl: "https://www.kendallcountysheriff.com/roster.php",
    officialSourceLabel: "Kendall County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Kleberg County",
    slug: "kleberg-county",
    publishedAt: "2026-10-04",
    seatCity: "Kingsville",
    h1: "Kleberg County Jail Roster & Inmate Search",
    title: "Kleberg County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Kleberg County, Texas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Kleberg County Sheriff's Office publishes a paginated Current Inmates roster for the detention center in Kingsville, separate from its 48-hour release list. This page keeps only the current-custody list, with booking numbers, source-listed charges, and bond labels, and does not republish mugshots or demographic fields.",
    officialSourceUrl: "https://www.klebergcoso.org/roster.php",
    officialSourceLabel: "Kleberg County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Burleson County",
    slug: "burleson-county",
    publishedAt: "2026-10-10",
    seatCity: "Caldwell",
    h1: "Burleson County Jail Roster & Inmate Search",
    title: "Burleson County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Burleson County, Texas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Burleson County Sheriff's Office posts a Current Inmates roster for its jail in Caldwell, next to a separate list of people released in the last 48 hours. This page reads only the current list, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.burlesoncountysherifftx.org/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Burleson County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Tom Green County",
    slug: "tom-green-county",
    publishedAt: "2026-10-15",
    seatCity: "San Angelo",
    h1: "Tom Green County Jail Roster & Inmate Search",
    title: "Tom Green County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Tom Green County, Texas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Tom Green County Sheriff's Office posts a Current Inmates roster for its detention center in San Angelo, separate from its list of people released in the last 48 hours. This page reads only the current list, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.tomgreencountysheriff.org/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Tom Green County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Angelina County",
    slug: "angelina-county",
    publishedAt: "2026-10-18",
    seatCity: "Lufkin",
    h1: "Angelina County Jail Roster & Inmate Search",
    title: "Angelina County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Angelina County, Texas current-inmate information for the jail in Lufkin from the official Jail Roster, with charges, offense degrees, bond amounts, and capture time.",
    article:
      "Angelina County posts a Jail Roster of everyone held at the county jail in Lufkin, with a detail page for each person. This page lists each person with every offense and its degree and the bond set on each charge, and leaves out ages, races, physical descriptions, mugshots, hold reasons, and arresting agencies.",
    officialSourceUrl: "https://www.angelinacounty.net/injail/",
    officialSourceLabel: "Angelina County Jail Roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "texas",
    stateName: "Texas",
    county: "Robertson County",
    slug: "robertson-county",
    publishedAt: "2026-10-23",
    seatCity: "Franklin",
    h1: "Robertson County Jail Roster & Inmate Search",
    title: "Robertson County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Robertson County, Texas current-inmate information for the jail in Franklin from the official sheriff roster, with booking numbers, source-listed charges, bond amounts, and capture time.",
    article:
      "The Robertson County Sheriff's Office publishes a current inmate roster for the Robertson County Jail in Franklin. This page reads only the current list, keeps booking numbers, source-listed charges, and bond amounts, and does not republish mugshots, ages, commissary IDs, or VINE IDs.",
    officialSourceUrl:
      "https://www.robertsoncountysherifftx.org/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Robertson County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Jefferson County",
    slug: "jefferson-county",
    publishedAt: "2026-10-04",
    seatCity: "Pine Bluff",
    h1: "Jefferson County Jail Roster & Inmate Search",
    title: "Jefferson County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Jefferson County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, and capture time.",
    article:
      'The Jefferson County Sheriff\'s Office publishes a paginated Inmate Roster for the W.C. "Dub" Brassell Adult Detention Center in Pine Bluff. This page reads every roster page, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or demographic fields.',
    officialSourceUrl: "https://www.jeffcoso.org/roster.php",
    officialSourceLabel: "Jefferson County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Logan County",
    slug: "logan-county",
    publishedAt: "2026-10-04",
    seatCity: "Paris",
    h1: "Logan County Jail Roster & Inmate Search",
    title: "Logan County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Logan County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Logan County Sheriff's Office publishes a current Inmate Roster for its detention center in Paris. This page keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or demographic fields.",
    officialSourceUrl: "https://www.loganso.com/roster.php",
    officialSourceLabel: "Logan County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Greene County",
    slug: "greene-county",
    publishedAt: "2026-10-04",
    seatCity: "Paragould",
    h1: "Greene County Jail Roster & Inmate Search",
    title: "Greene County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Greene County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Greene County Sheriff's Office publishes separate current and released views of its Inmate Roster for the detention center in Paragould. This page reads only the current view, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.greenesoar.gov/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Greene County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Cleburne County",
    slug: "cleburne-county",
    publishedAt: "2026-10-04",
    seatCity: "Heber Springs",
    h1: "Cleburne County Jail Roster & Inmate Search",
    title: "Cleburne County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Cleburne County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Cleburne County Sheriff's Office publishes separate current and released views of its Inmate Roster for the detention center in Heber Springs. This page reads only the current view, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.cleburnearso.gov/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Cleburne County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Faulkner County",
    slug: "faulkner-county",
    publishedAt: "2026-10-05",
    seatCity: "Conway",
    h1: "Faulkner County Jail Roster & Inmate Search",
    title: "Faulkner County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Faulkner County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Faulkner County Sheriff's Office publishes separate current and released views of its Inmate Roster for the detention center units in Conway. This page reads only the current view, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl: "https://www.fcso.ar.gov/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Faulkner County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Hot Spring County",
    slug: "hot-spring-county",
    publishedAt: "2026-10-06",
    seatCity: "Malvern",
    h1: "Hot Spring County Jail Roster & Inmate Search",
    title: "Hot Spring County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Hot Spring County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Hot Spring County Sheriff's Office publishes separate current and released views of its Inmate Roster for the detention center in Malvern. This page reads only the current view, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.hotspringcountysoar.gov/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Hot Spring County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Baxter County",
    slug: "baxter-county",
    publishedAt: "2026-10-07",
    seatCity: "Mountain Home",
    h1: "Baxter County Jail Roster & Inmate Search",
    title: "Baxter County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Baxter County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Baxter County Sheriff's Office publishes separate current and released views of its Inmate Roster for the detention center in Mountain Home. This page reads only the current view, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.baxtercountysheriff.com/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Baxter County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "St. Francis County",
    slug: "st-francis-county",
    publishedAt: "2026-10-07",
    seatCity: "Forrest City",
    h1: "St. Francis County Jail Roster & Inmate Search",
    title: "St. Francis County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search St. Francis County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The St. Francis County Sheriff's Office publishes separate current and released views of its Inmate Roster for the detention center in Forrest City. This page reads only the current view, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.stfranciscountysheriff.org/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "St. Francis County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Mississippi County",
    slug: "mississippi-county",
    publishedAt: "2026-10-07",
    seatCity: "Luxora",
    h1: "Mississippi County Jail Roster & Inmate Search",
    title: "Mississippi County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Mississippi County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Mississippi County Sheriff's Office publishes an Inmate Roster for its detention center in Luxora, which serves the whole county, including Blytheville and Osceola. This page reads the current roster, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl: "https://www.mississippicountysheriffar.org/roster.php",
    officialSourceLabel: "Mississippi County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Randolph County",
    slug: "randolph-county",
    publishedAt: "2026-10-08",
    seatCity: "Pocahontas",
    h1: "Randolph County Jail Roster & Inmate Search",
    title: "Randolph County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Randolph County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Randolph County Sheriff's Office publishes an Inmate Roster for its detention center in Pocahontas. This page reads the current roster, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl: "https://www.randolphcountysheriff.org/roster.php",
    officialSourceLabel: "Randolph County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Hempstead County",
    slug: "hempstead-county",
    publishedAt: "2026-10-18",
    seatCity: "Hope",
    h1: "Hempstead County Jail Roster & Inmate Search",
    title: "Hempstead County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Hempstead County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Hempstead County Sheriff's Office publishes a Current Inmates roster for its detention center in Hope, separate from its list of people released in the last 48 hours. This page reads only the current list, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl: "https://www.hempsteadcountysheriff.org/roster.php",
    officialSourceLabel: "Hempstead County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Izard County",
    slug: "izard-county",
    publishedAt: "2026-10-19",
    seatCity: "Melbourne",
    h1: "Izard County Jail Roster & Inmate Search",
    title: "Izard County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Izard County, Arkansas current-inmate information from the official sheriff roster, with booking numbers, source-listed charges, bond labels, and capture time.",
    article:
      "The Izard County Sheriff's Department publishes a Current Inmates roster for its detention facility in Melbourne, separate from its list of recent releases. This page reads only the current list, keeps booking numbers, source-listed charges, and bond labels, and does not republish mugshots or ages.",
    officialSourceUrl: "https://www.izardcountysheriff.org/roster.php",
    officialSourceLabel: "Izard County Sheriff's Department inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Cross County",
    slug: "cross-county",
    publishedAt: "2026-10-21",
    seatCity: "Wynne",
    h1: "Cross County Jail Roster & Inmate Search",
    title: "Cross County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Cross County, Arkansas current-inmate information for the jail in Wynne from the official sheriff roster, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Cross County Sheriff's Office publishes a current inmate roster for the Cross County Jail and Detention Center in Wynne. This page reads only the current list, keeps booking numbers and source-listed charges, and does not republish mugshots or ages.",
    officialSourceUrl:
      "https://www.crosscountysheriff.org/inmate-roster/filters/current/booking_time=desc/1",
    officialSourceLabel: "Cross County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Lonoke County",
    slug: "lonoke-county",
    publishedAt: "2026-10-23",
    seatCity: "Lonoke",
    h1: "Lonoke County Jail Roster & Inmate Search",
    title: "Lonoke County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Lonoke County, Arkansas current-inmate information from the official sheriff roster, with source-listed charges, bond amounts, and capture time.",
    article:
      "The Lonoke County Sheriff's Office shows its jail roster for the Lonoke County Jail in Lonoke on its Jail Roster page. This page reads every current inmate on that roster with source-listed charges and bond amounts, and leaves out mugshots, ages, home towns, arresting agencies, and court dates.",
    officialSourceUrl: "https://www.myr2m.com/lonokecoroster/",
    officialSourceLabel: "Lonoke County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Independence County",
    slug: "independence-county",
    publishedAt: "2026-10-23",
    seatCity: "Batesville",
    h1: "Independence County Jail Roster & Inmate Search",
    title: "Independence County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Independence County, Arkansas current-inmate information for the jail in Batesville from the official sheriff roster, with source-listed charges and capture time.",
    article:
      "The Independence County Sheriff's Office links its Jail Roster for the Independence County Jail in Batesville from its website. This page reads every current inmate on that roster with source-listed charges, and leaves out mugshots, ages, home towns, arresting agencies, and court dates.",
    officialSourceUrl: "https://www.myr2m.com/IndependenceCoRoster/",
    officialSourceLabel: "Independence County Sheriff's Office jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Dallas County",
    slug: "dallas-county",
    publishedAt: "2026-10-24",
    seatCity: "Fordyce",
    h1: "Dallas County Jail Roster & Inmate Search",
    title: "Dallas County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Dallas County, Arkansas current-inmate information for the jail in Fordyce from the official sheriff roster, with source-listed charges, bond amounts, and capture time.",
    article:
      "The Dallas County Sheriff's Office links its Inmate Roster for the Dallas County Jail in Fordyce from its website. This page reads every current inmate on that roster with source-listed charges and bond amounts, and leaves out mugshots, ages, home towns, arresting agencies, and court dates.",
    officialSourceUrl: "https://www.myr2m.com/DallasCoRoster/",
    officialSourceLabel: "Dallas County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Sharp County",
    slug: "sharp-county",
    publishedAt: "2026-10-14",
    seatCity: "Ash Flat",
    h1: "Sharp County Jail Roster & Inmate Search",
    title: "Sharp County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Sharp County, Arkansas current-inmate information from the official sheriff roster, with source-listed charges, bond amounts, and capture time.",
    article:
      "The Sharp County Sheriff's Office posts the jail roster for its detention center in Ash Flat on its Inmate Roster page. This page reads every current inmate on that roster with source-listed charges and bond amounts, and leaves out mugshots, ages, home towns, arresting agencies, and court dates.",
    officialSourceUrl: "https://www.myr2m.com/sharpcoroster/",
    officialSourceLabel: "Sharp County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "arkansas",
    stateName: "Arkansas",
    county: "Stone County",
    slug: "stone-county",
    publishedAt: "2026-10-16",
    seatCity: "Mountain View",
    h1: "Stone County Jail Roster & Inmate Search",
    title: "Stone County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Stone County, Arkansas current-inmate information from the official sheriff roster, with source-listed charges, bond amounts, and capture time.",
    article:
      "The Stone County Sheriff's Office links its Inmate Roster to the jail roster for its 40-bed detention center in Mountain View. This page reads every current inmate on that roster with source-listed charges and bond amounts, and leaves out mugshots, ages, home towns, arresting agencies, and court dates.",
    officialSourceUrl: "https://www.myr2m.com/stonecoroster/",
    officialSourceLabel: "Stone County Sheriff's Office inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Wagoner County",
    slug: "wagoner-county",
    publishedAt: "2026-10-09",
    seatCity: "Wagoner",
    h1: "Wagoner County Jail Roster & Inmate Search",
    title: "Wagoner County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Wagoner County, Oklahoma current-custody information from the sheriff's official inmate search, with booking IDs, source-listed charges, and capture time.",
    article:
      "The Wagoner County Sheriff's Office publishes an inmate search for its jail in Wagoner. This page lists the people the search shows as in custody, with each booking ID and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and bond amounts.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.wagonercountyso.org/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Wagoner County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Lincoln County",
    slug: "lincoln-county",
    publishedAt: "2026-10-09",
    seatCity: "Chandler",
    h1: "Lincoln County Jail Roster & Inmate Search",
    title: "Lincoln County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Lincoln County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Lincoln County Sheriff's Office in Chandler publishes an inmate search for its detention center. This page lists the people the search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://lincolncountysheriffok.gov/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Lincoln County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Pawnee County",
    slug: "pawnee-county",
    publishedAt: "2026-10-10",
    seatCity: "Pawnee",
    h1: "Pawnee County Jail Roster & Inmate Search",
    title: "Pawnee County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Pawnee County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Pawnee County Sheriff's Office runs the county jail in Pawnee and posts an inmate search that it says is updated hourly. This page lists the people the search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.pawneecountysook.gov/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Pawnee County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Seminole County",
    slug: "seminole-county",
    publishedAt: "2026-10-11",
    seatCity: "Wewoka",
    h1: "Seminole County Jail Roster & Inmate Search",
    title: "Seminole County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Seminole County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Seminole County Sheriff's Office in Wewoka runs the county jail and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.seminolecosheriff.com/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Seminole County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Carter County",
    slug: "carter-county",
    publishedAt: "2026-10-25",
    seatCity: "Ardmore",
    h1: "Carter County Jail Roster & Inmate Search",
    title: "Carter County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Carter County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Carter County Sheriff's Office in Ardmore runs the county jail and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.cartercountysheriff.us/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Carter County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Canadian County",
    slug: "canadian-county",
    publishedAt: "2026-10-26",
    seatCity: "El Reno",
    h1: "Canadian County Jail Roster & Inmate Search",
    title: "Canadian County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Canadian County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Canadian County Sheriff's Office in El Reno runs the county jail and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://ccsheriff.net/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Canadian County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Sequoyah County",
    slug: "sequoyah-county",
    publishedAt: "2026-10-27",
    seatCity: "Sallisaw",
    h1: "Sequoyah County Jail Roster & Inmate Search",
    title: "Sequoyah County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Sequoyah County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Sequoyah County Sheriff's Office in Sallisaw runs the county jail and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://scsok.org/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Sequoyah County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Muskogee County",
    slug: "muskogee-county",
    publishedAt: "2026-10-29",
    seatCity: "Muskogee",
    h1: "Muskogee County Jail Roster & Inmate Search",
    title: "Muskogee County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Muskogee County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Muskogee County Sheriff's Office runs the county jail in Muskogee and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.muskogeeso.org/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Muskogee County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Ottawa County",
    slug: "ottawa-county",
    publishedAt: "2026-10-30",
    seatCity: "Miami",
    h1: "Ottawa County Jail Roster & Inmate Search",
    title: "Ottawa County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Ottawa County, Oklahoma current-custody information from the sheriff's official inmate search, with source-listed charges and capture time.",
    article:
      "The Ottawa County Sheriff's Office runs the county jail in Miami and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with the charges as the sheriff lists them. The search shows no booking numbers, and photos, birth dates, home towns, and the holding agency are left out.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.ottawacountysook.gov/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Ottawa County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Love County",
    slug: "love-county",
    publishedAt: "2026-10-30",
    seatCity: "Marietta",
    h1: "Love County Jail Roster & Inmate Search",
    title: "Love County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Love County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Love County Sheriff's Office runs the Love County Justice Center in Marietta and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and housing assignments.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.lovecosheriff.com/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Love County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Greer County",
    slug: "greer-county",
    publishedAt: "2026-10-31",
    seatCity: "Mangum",
    h1: "Greer County Jail Roster & Inmate Search",
    title: "Greer County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Greer County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Greer County Sheriff's Office runs the county jail in Mangum and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.greercountysheriff.org/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Greer County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Major County",
    slug: "major-county",
    publishedAt: "2026-10-31",
    seatCity: "Fairview",
    h1: "Major County Jail Roster & Inmate Search",
    title: "Major County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Major County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Major County Sheriff's Office runs the county jail in Fairview and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.majorcosheriff.com/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Major County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Jackson County",
    slug: "jackson-county",
    publishedAt: "2026-10-31",
    seatCity: "Altus",
    h1: "Jackson County Jail Roster & Inmate Search",
    title: "Jackson County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Jackson County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Jackson County Sheriff's Office runs the county jail in Altus and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.jacksoncountyso.com/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Jackson County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "oklahoma",
    stateName: "Oklahoma",
    county: "Custer County",
    slug: "custer-county",
    publishedAt: "2026-10-31",
    seatCity: "Arapaho",
    h1: "Custer County Jail Roster & Inmate Search",
    title: "Custer County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Custer County, Oklahoma current-custody information from the sheriff's official inmate search, with booking numbers, source-listed charges, and capture time.",
    article:
      "The Custer County Sheriff's Office runs the county jail in Arapaho and posts an inmate search of the people it holds. This page lists everyone that search shows as in custody, with each booking number and the charges as the sheriff lists them, and leaves out photos, birth dates, home addresses, and classification.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl: "https://www.custercountysheriff.com/dmxConnect/api/Booking/Read.php",
    officialSourceLabel: "Custer County Sheriff's Office inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Mower County",
    slug: "mower-county",
    publishedAt: "2026-10-01",
    seatCity: "Austin",
    h1: "Mower County Jail Roster & Inmate Search",
    title: "Mower County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Review Mower County, Minnesota current-custody information from the official jail roster, including booking identifiers, source-listed charges, and the latest source update time.",
    article:
      "Mower County publishes an official Jail Roster PDF for the county jail in Austin. JailAtlas keeps only rows explicitly marked IN CUSTODY, separates each person's name from the source booking number, preserves source-listed charge text, and excludes released rows and demographic fields.",
    officialSourceUrl: "https://mower-sftp.co.mower.mn.us/WSFTPSVR/mcounty/jail/JailRoster.rpt.pdf",
    officialSourceLabel: "Mower County official jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Wright County",
    slug: "wright-county",
    publishedAt: "2026-10-03",
    seatCity: "Buffalo",
    h1: "Wright County Jail Roster & Inmate Search",
    title: "Wright County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Wright County, Minnesota current-custody information from the official Jail Census, with source-listed charges and the latest capture time.",
    article:
      "Wright County publishes a Jail Census PDF that lists every adult currently held in the county jail in Buffalo. JailAtlas checks each capture against the census record total, keeps names and source-listed charge text, and leaves out photos, age, sex, release dates, and holding-agency fields.",
    officialSourceUrl: "https://www.wrightcountymn.gov/DocumentCenter/View/13203/Jail-Census",
    officialSourceLabel: "Wright County official Jail Census",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Carlton County",
    slug: "carlton-county",
    publishedAt: "2026-10-03",
    seatCity: "Carlton",
    h1: "Carlton County Jail Roster & Inmate Search",
    title: "Carlton County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Carlton County, Minnesota current-custody information from the official jail roster, with source-listed charges and the latest capture time.",
    article:
      "Carlton County publishes an hourly jail roster PDF for the county jail in Carlton. JailAtlas checks each capture against the roster's record total, keeps names and source-listed charges, and leaves out mugshots, age, agencies, court dates, and bail amounts.",
    officialSourceUrl: "https://jailroster.co.carlton.mn.us/CCJ_Jail_Roster.pdf",
    officialSourceLabel: "Carlton County official jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Douglas County",
    slug: "douglas-county",
    publishedAt: "2026-10-04",
    seatCity: "Alexandria",
    h1: "Douglas County Jail Roster & Inmate Search",
    title: "Douglas County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Douglas County, Minnesota current-custody information from the official jail roster, with source-listed charges and the latest capture time.",
    article:
      "Douglas County publishes its jail's Inmate Roster as a single page sorted by name for the jail in Alexandria. JailAtlas checks each capture against the page's result total, keeps names and every listed charge, and leaves out booking times, arresting agencies, and case status.",
    officialSourceUrl: "https://www.douglascountymn.gov/inmate-roster",
    officialSourceLabel: "Douglas County official inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "St. Louis County",
    slug: "st-louis-county",
    publishedAt: "2026-10-05",
    seatCity: "Duluth",
    h1: "St. Louis County Jail Roster & Inmate Search",
    title: "St. Louis County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search St. Louis County, Minnesota current-custody information for the jail in Duluth from the official hourly jail roster, with source-listed charges and capture time.",
    article:
      "St. Louis County publishes an hourly Jail Roster Report covering everyone in its custody, including people boarded in other counties' jails. This page keeps only the people the report places at the St. Louis County Jail in Duluth, checks that the report's running numbers have no gaps, and leaves out dates of birth, bail, arresting agencies, and the jail's LID numbers.",
    officialSourceUrl: "https://www.stlouiscountymn.gov/Portals/0/rpts/SLCJ_Jail_Roster.PDF",
    officialSourceLabel: "St. Louis County official jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Steele County",
    slug: "steele-county",
    publishedAt: "2026-10-05",
    seatCity: "Owatonna",
    h1: "Steele County Jail Roster & Inmate Search",
    title: "Steele County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Steele County, Minnesota current-custody information for the detention center in Owatonna from the official inmate roster, with source-listed charges and capture time.",
    article:
      "The Steele County Sheriff's Office publishes an Inmate Roster PDF for the detention center in Owatonna. JailAtlas checks each capture against the roster's Total Records line, keeps names and source-listed charges, and leaves out booking dates, agencies, and hold reasons.",
    officialSourceUrl: "https://www.steelecountymn.gov/Sheriff/Inmate_Roster.pdf",
    officialSourceLabel: "Steele County official inmate roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Crow Wing County",
    slug: "crow-wing-county",
    publishedAt: "2026-10-06",
    seatCity: "Brainerd",
    h1: "Crow Wing County Jail Roster & Inmate Search",
    title: "Crow Wing County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Crow Wing County, Minnesota current-custody information for the jail in Brainerd from the official In Custody list, with booking numbers, statute codes, and capture time.",
    article:
      "The Crow Wing County Sheriff's Office publishes an In Custody list for the jail in Brainerd that it rebuilds through the day. This page keeps names, booking numbers, and each charge's statute code with the source's short charge text, and leaves out photos, ages, intake times, and case status.",
    officialSourceUrl: "https://www3.crowwing.us/letg/Sheriff/Jail/custody2.html",
    officialSourceLabel: "Crow Wing County official In Custody list",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Renville County",
    slug: "renville-county",
    publishedAt: "2026-10-06",
    seatCity: "Olivia",
    h1: "Renville County Jail Roster & Inmate Search",
    title: "Renville County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Renville County, Minnesota current-custody information for the jail in Olivia from the official Inmate List, with booking numbers, statute codes, and capture time.",
    article:
      "The Renville County Sheriff's Office publishes an In Custody list for its 72-bed jail in Olivia, which also holds federal inmates. This page keeps names, booking numbers, and each charge's statute code with the source's short charge text, and leaves out photos, ages, intake times, case status, and bail figures.",
    officialSourceUrl: "https://custody.renvillecountymn.gov/custody.html",
    officialSourceLabel: "Renville County official Inmate List",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Otter Tail County",
    slug: "otter-tail-county",
    publishedAt: "2026-10-11",
    seatCity: "Fergus Falls",
    h1: "Otter Tail County Jail Roster & Inmate Search",
    title: "Otter Tail County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Otter Tail County, Minnesota current-custody information for the jail in Fergus Falls from the official In Custody List, with booking numbers, statute codes, and capture time.",
    article:
      "Otter Tail County publishes a Jail In Custody List for its 111-bed jail in Fergus Falls and says the list is updated every two hours. This page keeps names, booking numbers, and each charge's statute code with the source's charge text, and leaves out photos, MNI numbers, ages, intake dates, bail figures, and projected release dates.",
    officialSourceUrl: "https://web1.co.ottertail.mn.us/sheriff/report/custody%20list.rpt.pdf",
    officialSourceLabel: "Otter Tail County Jail In Custody List",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Sherburne County",
    slug: "sherburne-county",
    publishedAt: "2026-10-11",
    seatCity: "Elk River",
    h1: "Sherburne County Jail Roster & Inmate Search",
    title: "Sherburne County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Sherburne County, Minnesota current-custody information for the jail in Elk River from the official inmate search, with booking numbers, statute codes, and capture time.",
    article:
      "The Sherburne County Sheriff's Office runs a 732-bed regional jail in Elk River that also holds people for ICE, the U.S. Marshals, and other agencies, and it publishes a search of everyone currently in custody. This page lists that search in full, with each booking number and the statute and description of every charge, and leaves out birth dates, SPN numbers, physical descriptions, bail figures, and court details.",
    // The inmate search page loads its list from this official endpoint, which is what is read.
    officialSourceUrl:
      "https://inmatelocatorext.co.sherburne.mn.us/InmateLocatorAPI/api/Inmates/search",
    officialSourceLabel: "Sherburne County Jail inmate search",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Kandiyohi County",
    slug: "kandiyohi-county",
    publishedAt: "2026-10-12",
    seatCity: "Willmar",
    h1: "Kandiyohi County Jail Roster & Inmate Search",
    title: "Kandiyohi County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Kandiyohi County, Minnesota current-custody information for the jail in Willmar from the official In Custody List, with booking numbers, statute codes, and capture time.",
    article:
      "The Kandiyohi County Sheriff's Office publishes an In Custody List for its jail in Willmar, which also holds ICE detainees. This page keeps names, booking numbers, and each charge's statute code with the source's charge text, and leaves out photos, MNI numbers, ages, intake dates, case status, and bail figures.",
    officialSourceUrl: "https://www2.kcmn.us/LETG/custody/custody.html",
    officialSourceLabel: "Kandiyohi County Jail In Custody List",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Ramsey County",
    slug: "ramsey-county",
    publishedAt: "2026-09-26",
    seatCity: "Saint Paul",
    h1: "Ramsey County Jail Roster & Inmate Search",
    title: "Ramsey County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Review Ramsey County, Minnesota adult detention information with official source context, freshness, and clear data limits.",
    article:
      "Ramsey County provides an Adult Detention Center roster through its official open-data service. This page distinguishes current custody from the source's short release window and displays the source update time.",
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
    publishedAt: "2026-09-26",
    seatCity: "Saint Cloud",
    h1: "Stearns County Jail Roster & Inmate Search",
    title: "Stearns County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Check Stearns County, Minnesota custody information with the official jail roster source and its current-custody scope.",
    article:
      "Stearns County's Sheriff's Office links its jail roster for current custody information. This page preserves the source's labels, records the source timestamp, and directs unanswered questions to the official jail contact.",
    officialSourceUrl: "https://jailroster.stearnscountymn.gov/Current",
    officialSourceLabel: "Stearns County current jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Anoka County",
    slug: "anoka-county",
    publishedAt: "2026-09-26",
    seatCity: "Anoka",
    h1: "Anoka County Jail Roster & Inmate Search",
    title: "Anoka County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Find Anoka County, Minnesota custody information with the official inmate locator, source scope, and freshness details.",
    article:
      "Anoka County's official inmate locator covers current and recently released records. This page publishes only the approved current-custody scope and keeps any release window separate from current custody.",
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
    publishedAt: "2026-10-15",
    seatCity: "Stillwater",
    h1: "Washington County Jail Roster & Inmate Search",
    title: "Washington County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Washington County, Minnesota current-inmate information for the jail in Stillwater from the official Adult Inmate Roster Report, with booking numbers and capture time.",
    article:
      "The Washington County Sheriff's Office publishes an Adult Inmate Roster Report for its 228-bed jail in Stillwater. This page keeps each listed name and booking number, and leaves out JID numbers, booking dates, and estimated release dates. The report does not list charges or bail.",
    officialSourceUrl:
      "https://web1.washingtoncountymn.gov/ImageShare/Images/reports/inmateroster/InmateRosterReport.pdf",
    officialSourceLabel: "Washington County Jail Adult Inmate Roster Report",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Dakota County",
    slug: "dakota-county",
    publishedAt: "2026-10-16",
    seatCity: "Hastings",
    h1: "Dakota County Jail Roster & Inmate Search",
    title: "Dakota County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Dakota County, Minnesota current-inmate information for the jail in Hastings from the official jail inmate search, with booking numbers, open charges, statute codes, and capture time.",
    article:
      "The Dakota County Sheriff's Office publishes a Jail Inmate Search for its 263-bed jail at the Law Enforcement Center in Hastings. This page lists everyone the search shows in jail, with booking numbers and each open charge with its Minnesota statute, and leaves out birth dates, demographics, arrest locations, court numbers, and charges the county has already cleared.",
    officialSourceUrl:
      "https://dakotacountymn.gov/content/mndakotacountywebsite/api/search.json?method=JailInmateSearch",
    officialSourceLabel: "Dakota County Jail Inmate Search",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Clay County",
    slug: "clay-county",
    publishedAt: "2026-10-18",
    seatCity: "Moorhead",
    h1: "Clay County Jail Roster & Inmate Search",
    title: "Clay County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Clay County, Minnesota current-inmate information for the correctional facility in Moorhead from the official inmate roster, with charges and capture time.",
    article:
      "Clay County posts an inmate roster of everyone held at the Clay County Correctional Facility in Moorhead, rebuilt from the jail system through the day. This page lists each person with the charges shown for them, and leaves out ages, booking dates, arresting agencies, mugshots, and hold notes.",
    officialSourceUrl: "https://files.claycountymn.gov/InmateRoster/index.htm",
    officialSourceLabel: "Clay County Inmate Roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Winona County",
    slug: "winona-county",
    publishedAt: "2026-10-18",
    seatCity: "Winona",
    h1: "Winona County Jail Roster & Inmate Search",
    title: "Winona County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Winona County, Minnesota current-inmate information for the detention center in Winona from the official Sheriff's roster, with charges, statute codes, bail amounts, and capture time.",
    article:
      "The Winona County Sheriff's Office prints a daily Inmate Roster of everyone held at the Winona County Detention Center. This page lists each person with every charge and its Minnesota statute and the bail amount when one is set, and leaves out ages, arresting agencies, hold reasons, court dates, and mugshots.",
    officialSourceUrl: "https://www.winonaco.com/Sheriff/Reports/Inmate_Roster_.pdf",
    officialSourceLabel: "Winona County Sheriff's Office Inmate Roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Hennepin County",
    slug: "hennepin-county",
    publishedAt: "2026-10-19",
    seatCity: "Minneapolis",
    h1: "Hennepin County Jail Roster & Inmate Search",
    title: "Hennepin County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Hennepin County, Minnesota current-inmate information for the jail in downtown Minneapolis from the Sheriff's official jail roster, with booking numbers, open charges, statute codes, and capture time.",
    article:
      "The Hennepin County Sheriff's Office publishes a jail roster, updated hourly, of people held at the Adult Detention Center in downtown Minneapolis. This page lists everyone the roster shows housed in the jail's two buildings, the Public Safety Facility and City Hall, with booking numbers and each open charge with its Minnesota statute, and leaves out ages, arresting agencies, case numbers, bail options, court dates, and cases the county has already cleared.",
    officialSourceUrl:
      "https://api.hennepincounty.gov/hcso-public-services-api/v1/JailRoster/Search",
    officialSourceLabel: "Hennepin County Sheriff's Office jail roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Nobles County",
    slug: "nobles-county",
    publishedAt: "2026-10-20",
    seatCity: "Worthington",
    h1: "Nobles County Jail Roster & Inmate Search",
    title: "Nobles County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Nobles County, Minnesota current-inmate information for the jail in Worthington from the Sheriff's official Inmate Listing, with charges, offense levels, and capture time.",
    article:
      "The Nobles County Sheriff's Office posts an Inmate Listing of everyone held at the Nobles County Jail in the Prairie Justice Center in Worthington, refreshed through the day. This page lists each person with every charge and its level, and leaves out photos, booking dates, and arresting agencies.",
    officialSourceUrl: "https://ftp.co.nobles.mn.us/jail/Inmate_listing/inmate_listing.html",
    officialSourceLabel: "Nobles County Sheriff's Office Inmate Listing",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Benton County",
    slug: "benton-county",
    publishedAt: "2026-10-20",
    seatCity: "Foley",
    h1: "Benton County Jail Roster & Inmate Search",
    title: "Benton County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Benton County, Minnesota current-inmate information for the jail in Foley from the Sheriff's official Current Inmate List, with charges, offense levels, bonds, and capture time.",
    article:
      "The Benton County Sheriff's Office links a Current Inmate List of people held at the Benton County Jail in Foley. This page lists each person with every charge and its level and the bonds listed for them, and leaves out ages, physical descriptions, photos, arresting agencies, and arrest dates.",
    officialSourceUrl:
      "https://api.correctionsrecordssearch.com/instances/lookup?alias=bentoncountymn",
    officialSourceLabel: "Benton County Sheriff's Office Current Inmate List",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Freeborn County",
    slug: "freeborn-county",
    publishedAt: "2026-10-21",
    seatCity: "Albert Lea",
    h1: "Freeborn County Jail Roster & Inmate Search",
    title: "Freeborn County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Freeborn County, Minnesota current-inmate information for the Adult Detention Center in Albert Lea from the Sheriff's official In Custody List, with charges and capture time.",
    article:
      "The Freeborn County Sheriff's Office posts an In Custody List for the Adult Detention Center in Albert Lea each weekday morning. This page lists each person with every charge on that list, and leaves out photos and intake dates. ICE detainees held at the center are not on the county's list.",
    officialSourceUrl: "https://www.freeborncountymn.gov/438/Jail-Roster",
    officialSourceLabel: "Freeborn County Sheriff's Office In Custody List",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Cottonwood County",
    slug: "cottonwood-county",
    publishedAt: "2026-10-22",
    seatCity: "Windom",
    h1: "Cottonwood County Jail Roster & Inmate Search",
    title: "Cottonwood County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Cottonwood County, Minnesota current-inmate information for the jail in Windom from the Sheriff's official Jail Roster, with charges, statute codes, bail amounts, and capture time.",
    article:
      "The Cottonwood County Sheriff's Office prints a Jail Roster of everyone held at the county jail in Windom twice a day, at 6 a.m. and 6 p.m. This page lists each person with every charge and its statute code and the bail amounts on the roster, and leaves out the agency holding them, hold reasons, booking dates, and projected release dates.",
    officialSourceUrl:
      "https://cms5.revize.com/revize/cottonwoodmn/Photo%20Gallery/Sheriff/Jail%20Roster.pdf",
    officialSourceLabel: "Cottonwood County Sheriff's Office Jail Roster",
    sourceStatus: "audit_pending"
  },
  {
    state: "minnesota",
    stateName: "Minnesota",
    county: "Redwood County",
    slug: "redwood-county",
    publishedAt: "2026-10-23",
    seatCity: "Redwood Falls",
    h1: "Redwood County Jail Roster & Inmate Search",
    title: "Redwood County Jail Roster & Inmate Search - JailAtlas.com",
    description:
      "Search Redwood County, Minnesota current-inmate information for the jail in Redwood Falls from the Sheriff's official In Custody roster, with charges, statute codes, bail amounts, and capture time.",
    article:
      "The Redwood County Sheriff's Office posts an In Custody roster of everyone held at the Redwood County Jail in Redwood Falls. This page lists each person with every charge and its statute code and the bail amounts on the roster, and leaves out the agency holding them, booking dates, and projected release dates.",
    officialSourceUrl: "https://redwoodcounty-mn.gov/download/17042/",
    officialSourceLabel: "Redwood County Sheriff's Office In Custody roster",
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
