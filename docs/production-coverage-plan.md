# Production coverage plan

This is the proposed launch set for the customer product: five Iowa counties and five Minnesota
counties. The county list is an editorial and source-audit plan, not a declaration that live custody
data is already approved for publication. Ramsey is the first Minnesota source with a keyless public
official data contract; the fifth Minnesota county remains intentionally unselected until its
official source passes the same audit.

## Iowa

| County     | Official source to audit                                                                                                        | Status                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Dallas     | [Dallas County Inmate Inquiry](https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True)               | Existing adapter prepared; live execution still gated |
| Cedar      | [Cedar County Sheriff inmate roster](https://cedarcounty.iowa.gov/sheriff/inmate_roster/)                                       | Source audit pending                                  |
| Polk       | [Polk County Jail and Arrest Information](https://www.polkcountyiowa.gov/county-sheriff/detention/jail-and-arrest-information/) | Source audit pending                                  |
| Linn       | [Linn County Law and Public Safety](https://www.linncountyiowa.gov/160/9061/Law-Public-Safety)                                  | Source audit pending                                  |
| Black Hawk | [Black Hawk County Who's In Jail](https://www.bhcso.org/whos-in-jail)                                                           | Source audit pending                                  |

## Minnesota

Minnesota is the proposed second state because five county-level official sources are identifiable
and expose a useful combination of current-custody, roster, and jail-list views. Each still needs a
source-specific parser contract and a human review packet.

| County     | Official source to audit                                                                                                                            | Status                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Ramsey     | [Ramsey County Adult Detention Center roster](https://opendata.ramseycountymn.gov/stories/s/Ramsey-County-Adult-Detention-Center-Roster/xs99-2bse/) | Adapter tested; production approval pending      |
| Stearns    | [Stearns County current jail roster](http://jailroster.stearnscountymn.gov/Current)                                                                 | Reference connector exists; source audit pending |
| Anoka      | [Anoka County inmate locator](https://www.anokacountymn.gov/727/Inmate-Locator)                                                                     | Source audit pending                             |
| Washington | [Washington County inmate information](https://washingtoncountymn.gov/3214/Inmate-Information)                                                      | Source audit pending                             |
| TBD        | An additional official Minnesota county source will be selected after audit                                                                         | Intentionally unselected                         |

## What “API content” means here

The public page will have a stable editorial article, H1, title, meta description, canonical URL,
structured data, and a visible source disclosure. Its custody section will be populated by a
server-side adapter reading the approved official source. Some county sources are HTML, PDFs, or
official data views rather than JSON APIs, so each county must be audited before we promise a
uniform API contract.

No photos, demographic fields, booking history, or cross-county person profiles are part of this
launch set. Charges and bond values are shown only when the selected official source publishes them
with a clear label.

## Release gates

1. Record the exact source URL, official relationship evidence, fields, scope, freshness threshold,
   and retention rule for each county.
2. Build and test one adapter per source. A valid empty roster must remain distinct from a failed
   fetch or parser change.
3. Run a privacy-preserving compatibility fetch, then review the normalized output and anomaly
   checks.
4. Migrate the intended production Neon branch and enable the worker with separate production
   secrets and rate limits.
5. Approve the editorial block and source packet for each county before its URL is added to the
   production sitemap.

The current implementation intentionally keeps these planned counties `audit_pending` and `noindex`
until all five gates pass.
