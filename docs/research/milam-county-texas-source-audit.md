# Milam County, Texas source audit

Status: candidate source; publication blocked  
Reviewed: 2026-09-29

## County and source

- State: Texas
- County: Milam County
- County seat: Cameron
- Responsible institution: Milam County Sheriff's Office
- Official institution site: <https://www.milamcountysherifftx.org/>
- Current roster: <https://www.milamcountysherifftx.org/roster.php>

The roster is hosted on the Sheriff's official domain and labels itself `Inmate Roster`. The page
was publicly reachable during research and exposed a paginated list with booking number, booking
date text, source-listed charges, and bond text.

## Intended publication scope

The adapter retains only entries present on the current roster. It keeps the source's booking
number, display name, charge descriptions, and monetary bond labels. It does not retain mugshots or
demographic fields, does not infer a booking timestamp from the source's local date text, and does
not interpret `$0.00` as proof that no bond is available.

## Safety and approval state

The parser enforces the exact HTTPS host and roster path, validates the Milam County identity, caps
pagination and response size, and treats zero records as valid only when the page explicitly says
`Inmate Roster (0)`. Tests use fictional hand-authored HTML only.

The database migration provisions this source as `verification_pending`, with both the adapter and
publication flags disabled. Before production, a live worker dry-run, field comparison, freshness
review, contact review, and human publication approval are still required.
