# Expansion priority list

When the owner asks to "add places" ("yer ekle"), take the next counties from this list, in order,
instead of picking counties at random. Skip an entry only when it fails the standing source rules
(official source, no cut-off charge or name text beyond what an existing live adapter already
accepts, few blank charges, official guide information available, no data-specific redistribution
ban). Record the outcome in the Status column and move on. When the list reaches a new state, ask
the owner for approval before adding it.

Built 2026-11-12 from:

- Google Trends, United States, last 12 months: "inmate search", "county jail", "jail roster",
  "mugshots", "inmate lookup", and "jail inmates", by state, weighted by each term's national volume
  ("county jail" 1.44, "inmate search" 1.0, "jail roster" 0.42, "mugshots" 0.30, "inmate lookup"
  0.14, "jail inmates" 0.08) and multiplied by state population.
- County-name searches ("<name> county jail"). Names shared by many states (Montgomery, Jefferson,
  Washington, Polk, Orange, and others) inflate those scores.
- Texas Commission on Jail Standards, Abbreviated Population Report, June 2022 (Texas county jail
  populations).
- Rosters measured live while adding counties.

## State demand (population-weighted search interest, Texas = 100)

| Rank | State          | Score | Coverage                     |
| ---- | -------------- | ----- | ---------------------------- |
| 1    | Texas          | 100   | Live, 9 small counties       |
| 2    | Florida        | 76    | Not covered (needs approval) |
| 3    | Minnesota      | 43    | Live, 31 counties            |
| 4    | California     | 41    | Not covered                  |
| 5    | Georgia        | 39    | Not covered                  |
| 6    | Ohio           | 38    | Not covered                  |
| 7    | Illinois       | 33    | Not covered                  |
| 8    | North Carolina | 29    | Not covered                  |
| 9    | South Carolina | 29    | Not covered                  |
| 10   | Alabama        | 28    | Live, 7 counties             |
| 11   | Arkansas       | 21    | Live, 22 counties            |
| 16   | Oklahoma       | 17    | Live, 17 counties            |
| 22   | Missouri       | 13    | Live, 9 counties             |

## Priority order

Jail population is the Texas 2022 count where given, or the live roster size measured while
evaluating. "Check" means the official roster has not yet been confirmed to publish a full current
list (rather than a name-only search).

| #   | County          | State | Jail pop.  | Known source / blocker                                                                                | Status           |
| --- | --------------- | ----- | ---------- | ----------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Jefferson       | TX    | ~1,035     | Full roster PDF on jeffersoncountytx.gov; above the 1,000-record cap                                  | Added 2026-11-12 |
| 2   | Madison         | AL    | ~1,234     | Card list hides extra charges behind '+ N more'; reading them needs ~750 profile requests per refresh | Skipped          |
| 3   | Pulaski         | AR    | ~1,337     | Added from the Sheriff-linked records-search instance (arpulaskicounty), not the Zuercher portal      | Added 2026-11-12 |
| 4   | Lubbock         | TX    | 1,325      | publicrecords.lubbockcounty.gov returns an empty page to automated requests                           | Blocked          |
| 5   | Bell            | TX    | 1,022      | NewWorld inquiry server sends an incomplete TLS certificate chain                                     | Blocked          |
| 6   | Oklahoma County | OK    | large      | JailTracker portal requires a CAPTCHA                                                                 | Skipped          |
| 7   | Tulsa           | OK    | large      | 365labs inmate list requires a reCAPTCHA                                                              | Skipped          |
| 8   | Sedgwick        | KS    | large      | Name search only; page forbids unauthorized use of the data                                           | Skipped          |
| 9   | Tarrant         | TX    | 4,024      | Name or CID search only                                                                               | Skipped          |
| 10  | Dallas          | TX    | 5,964      | Name or booking search only, with a search limit                                                      | Skipped          |
| 11  | Harris          | TX    | 9,499      | Name search only, behind a CAPTCHA                                                                    | Skipped          |
| 12  | Bexar           | TX    | 4,557      | County site answers automated requests with HTTP 429                                                  | Blocked          |
| 13  | Travis          | TX    | 2,236      | Name search only (SIP)                                                                                | Skipped          |
| 14  | El Paso         | TX    | 2,217      | Odyssey jail records search with a CAPTCHA                                                            | Skipped          |
| 15  | Hidalgo         | TX    | 1,325      | Odyssey jail search behind a CAPTCHA                                                                  | Skipped          |
| 16  | McLennan        | TX    | 1,351      | Full PDF list exists but was last updated 2026-08-25 (stale)                                          | Skipped          |
| 17  | Nueces          | TX    | 1,128      | County site answers automated requests with HTTP 403                                                  | Blocked          |
| 18  | Denton          | TX    | 1,053      | Name search only (Odyssey jail records)                                                               | Skipped          |
| 19  | Smith           | TX    | 1,050      | Tyler Jail Search needs a 3+ character name query                                                     | Skipped          |
| 20  | Cameron         | TX    | 1,028      | List mixes current inmates with people released in the last 7 days                                    | Skipped          |
| 21  | Collin          | TX    | 1,021      | Judicial search requires a CAPTCHA                                                                    | Skipped          |
| 22  | Brazoria        | TX    | 954        | Odyssey name search; site 403/503                                                                     | Blocked          |
| 23  | Galveston       | TX    | 850        | Moved to the new list (P2C inmate inquiry)                                                            | Moved            |
| 24  | Montgomery      | TX    | 874        | Inmate lookup requires an account and Cloudflare check                                                | Skipped          |
| 25  | Fort Bend       | TX    | 733        | Name search only                                                                                      | Skipped          |
| 26  | Johnson         | TX    | 825        | Name search only; unauthorized-use notice                                                             | Skipped          |
| 27  | Ector           | TX    | 762        | Tyler portal login returns 403                                                                        | Blocked          |
| 28  | Taylor          | TX    | 717        | Odyssey name search only                                                                              | Skipped          |
| 29  | Gregg           | TX    | 688        | Jail page returns 403                                                                                 | Blocked          |
| 30  | Williamson      | TX    | 595        | Site 403; name or booking search only                                                                 | Blocked          |
| 31  | Mobile          | AL    | ~1,550     | Sheriff's "Current Inmates" report (all.mobileso.com)                                                 | Added 2026-11-13 |
| 32  | Jefferson       | AL    | large      | County site answers automated requests with HTTP 403                                                  | Blocked          |
| 33  | Montgomery      | AL    | large      | Sheriff site unreachable from automated requests                                                      | Blocked          |
| 34  | Jackson         | MO    | large      | Name search only                                                                                      | Skipped          |
| 35  | St. Louis Co.   | MO    | large      | County site answers automated requests with HTTP 403                                                  | Blocked          |
| 36  | Greene          | MO    | large      | No public roster link on the Sheriff site                                                             | Skipped          |
| 37  | Johnson         | KS    | large      | Name search only                                                                                      | Skipped          |
| 38  | Wyandotte       | KS    | large      | Vendor search unreachable (HTTP only)                                                                 | Blocked          |
| 39  | Cleveland       | OK    | mid        | No public roster link on the Sheriff site                                                             | Skipped          |
| 40  | Washington      | AR    | mid        | No public roster link on the Sheriff site                                                             | Skipped          |
| 41  | Sebastian       | AR    | mid (~370) | NewWorld inmate inquiry on the county domain                                                          | Added 2026-11-13 |
| 42  | Benton          | AR    | ~668       | Portal reads cleanly; official site blocks automated access (no guide)                                | Blocked          |
| 43  | Brazos          | TX    | 586        | Tyler portal returns 403                                                                              | Blocked          |
| 44  | Potter          | TX    | 533        | Moved to the new list (Spillman PDF report)                                                           | Moved            |
| 45  | Ellis           | TX    | 515        | LockupLists feed; page forbids unauthorized use of the data                                           | Skipped          |
| 46  | Wichita         | TX    | 510        | County site answers automated requests with HTTP 403                                                  | Blocked          |

## Verified list (approved by the owner 2026-11-13)

The first list ran out of usable entries. Every county below was checked at the source on
2026-11-13: an official full current roster with charges, readable with a plain request, no CAPTCHA
or login. "Template" means the shared "Inmate Roster (N)" sheriff site already read by
`sheriff-roster-site.ts`. Take these in order for "yer ekle".

| #   | County    | State | People | Source                                                                                            | Status           |
| --- | --------- | ----- | ------ | ------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Galveston | TX    | 667    | P2C inmate inquiry (p2c.galvestoncountytx.gov); list gives the primary charge only, shown as such | Added 2026-11-14 |
| 2   | Potter    | TX    | ~590   | Spillman "Prisoners with their Offenses" PDF (public.pottercountysheriff.org)                     | Added 2026-11-14 |
| 3   | Etowah    | AL    | 581    | Template, roster.php (www.etowahcountysheriff.com)                                                | To do            |
| 4   | Morgan    | AL    | 505    | Template, roster.php (www.morgancountysheriffal.gov)                                              | To do            |
| 5   | Escambia  | AL    | 341    | Template, roster.php (www.escambiacountysheriffal.org); thin guide info                           | To do            |
| 6   | Elmore    | AL    | 301    | Template, inmate-roster path (www.elmoreso.com)                                                   | To do            |
| 7   | Callaway  | MO    | 129    | Template, roster.php (www.callawaysheriff.org)                                                    | To do            |
| 8   | Mayes     | OK    | 117    | Template, roster.php (www.mayessheriff.org)                                                       | To do            |
| 9   | Cherokee  | AL    | 91     | Template, roster.php (www.cherokeecountyalsheriff.com)                                            | To do            |
| 10  | Saline    | MO    | 73     | Template, roster.php (www.salinecountysheriff.com)                                                | To do            |

Smaller template counties to check next: Barry MO, Labette KS, Miller MO, Phillips AR, Harrison MO
(skip any whose official site lacks jail guidance). Pottawattamie IA runs a Zuercher portal whose
custody list could not be checked yet.

## New states, in order (owner approval required before starting each)

1. **Florida** (demand 76; about 56,400 jail inmates statewide in 2024). Start with the largest
   counties whose sheriffs publish full current lists: Pinellas, Hillsborough, Polk, Orange, Duval,
   Broward, Palm Beach, Escambia.
2. **Georgia** (39).
3. **South Carolina** (29; highest per-capita "inmate search" interest in the country).
4. **Ohio** (38).

## Notes

- Several top entries exceed today's per-source caps (1,000 records for most adapters, 900 for jail
  portals, 40 pages for sheriff-roster sites, 1 MB default and 3 MB portal response limits). Raising
  those caps safely is part of the first three entries.
- Our pages need a full current roster. A sheriff site that only offers a name search cannot be read
  into a roster page; mark such entries "Skipped (name search only)".
