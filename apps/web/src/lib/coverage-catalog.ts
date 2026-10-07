import { isProductionEnvironment, readEnvironment } from "./env";

export type CoverageState = "iowa" | "minnesota" | "texas" | "arkansas";

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
    publishedAt: "2026-09-25",
    seatCity: "Des Moines",
    h1: "Polk County Jail Roster & Inmate Search",
    title: "Polk County Jail Roster & Inmate Search - JailAtlas.com",
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
    publishedAt: "2026-09-26",
    seatCity: "Stillwater",
    h1: "Washington County Jail Roster & Inmate Search",
    title: "Washington County Jail Roster & Inmate Search - JailAtlas.com",
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
