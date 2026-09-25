# Dallas County, Iowa source audit

## Decision

**ELIGIBLE FOR PHASE 2B**

Dallas County is the strongest verified Iowa candidate found in this audit. The Dallas County
Sheriff's Office and Dallas County Correctional Facility are identified on the official county
website. The official Jail Division page routes users to a Dallas County government subdomain
running the `Dallas County Inmate Inquiry` application. The application accepts a normal read-only
HTTPS request with the explicit `InCustody=True` filter and returns a server-rendered, nonempty
current-custody table.

The source also provides a source-specific `No data` state inside an otherwise valid inquiry page,
separate detail pages, explicitly labeled booking identifiers, booking-scoped charge and bond
tables, and an observable `Page` pagination mechanism. These characteristics are sufficient to begin
a source-specific adapter and fictional fixture design after separate approval. They do not publish
Dallas County, authorize persistence, or establish production reliability.

The official county routing endpoint currently redirects to an unencrypted `http://` version of the
inquiry URL, while the same host and path are independently available over HTTPS. A future worker
must never follow or reproduce that downgrade. It must start from the exact reviewed HTTPS source
URL, allowlist only the exact inquiry host, and fail on every redirect unless separately reviewed.

## Research scope

- **Research date:** August 21, 2026
- **County:** Dallas County, Iowa
- **Facility:** Dallas County Correctional Facility / Dallas County Jail
- **Responsible institution:** Dallas County Sheriff's Office
- **Repository baseline:** commit `698a84ef8aac77f907e4877cc349ce0fd0ae8dbc`
  (`Document Scott County source ineligibility`)
- **Mode:** official-source discovery and read-only live-transport research only
- **Implementation state:** no adapter, parser, fixture, route, database record, or ingestion job
  created

No roster response body, screenshot, HAR, PDF, cookie, session material, photograph, source query
identifier, or identifiable person value was saved. Live checks emitted only response metadata,
source labels, aggregate counts, structural booleans, generalized identifier shapes, and field
categories.

## Candidate-selection note

The audit began from official Iowa county and sheriff pages. Linn County was rejected as the working
candidate because its officially linked inmate application presented a CAPTCHA. No attempt was made
to solve, bypass, automate, or work around that protection. Dallas County was selected because its
officially routed source is accessible without a CAPTCHA or authentication and exposes substantially
clearer current-custody, pagination, empty-result, booking, charge, and bond structure.

The unrelated `county-jail` project was not opened, searched, or used. No external implementation
was needed to identify or evaluate the Dallas County source.

## County and facility identity

The official [Dallas County Sheriff's Office](https://www.dallascountyiowa.gov/502/Sheriffs-Office)
page identifies the institution and its county role. The official
[Jail Division](https://www.dallascountyiowa.gov/364/Jail-Division) page identifies the Dallas
County Correctional Facility in Adel and states that charge and bond information is available
through the county's Arrest Inquiry Database.

The jail page and official county directory use the same facility location and distinguish the jail
contact from general Sheriff's Office contact. Contact and operational facts remain separate
editorial evidence; this source audit does not approve them for publication.

## Official institutional source

| Item                         | Finding                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Official institution         | Dallas County Sheriff's Office                                                               |
| Institutional URL            | `https://www.dallascountyiowa.gov/502/Sheriffs-Office`                                       |
| Official jail/evidence page  | `https://www.dallascountyiowa.gov/364/Jail-Division`                                         |
| Official roster routing path | `https://www.dallascountyiowa.gov/365/Inmate-Search`                                         |
| Candidate live source        | `https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True`          |
| Source title                 | `Dallas County Inmate Inquiry`                                                               |
| Relationship kind            | Official county route to a county-government inmate-inquiry subdomain                        |
| Vendor indication            | The inquiry footer identifies Tyler Technologies; the path identifies NewWorld InmateInquiry |
| Proposed source type         | `officially_linked_vendor`, subject to human source-type approval                            |
| Current status               | Eligible for Phase 2B adapter development; not approved for publication                      |

The source is on a Dallas County government subdomain. The vendor indication is disclosed rather
than treating the county subdomain alone as proof of who operates the application.

## Exact source evidence chain

The independently verified path is:

```text
Dallas County Sheriff's Office (.gov)
  -> Jail Division (.gov)
  -> Inmate Roster link
  -> /365/Inmate-Search (.gov)
  -> Dallas County Inmate Inquiry on inmates.dallascountyiowa.gov
```

The Jail Division page also describes the destination as the online Arrest Inquiry Database for
charge and bond information. The inquiry itself identifies Dallas County and the Sheriff's Office
and carries a Tyler Technologies footer. No directory, search snippet, aggregator, or third-party
custody site was used as factual evidence.

## Redirect-chain findings

- The official Jail Division's `Inmate Roster` link points first to the internal county path
  `/365/Inmate-Search`.
- That internal path returned `302` with a `Location` header using
  `http://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas`.
- The HTTP target served content without upgrading to HTTPS and did not advertise HSTS during the
  audit. A worker must therefore never follow the official routing endpoint as a fetch chain.
- The corresponding HTTPS base form returned `200`, and its non-roster base document was byte-for-
  byte identical to the HTTP base document during the audit.
- The exact reviewed HTTPS current-custody URL returned `200` with no redirect.
- Sampled HTTPS detail URLs remained on the same exact host and returned `200` without redirect.

The relationship evidence and fetch URL must consequently be stored separately: the official county
path proves the relationship, while the worker fetches only the reviewed HTTPS inquiry URL.

## Live-fetch result

Repeated normal read-only requests to the HTTPS inquiry succeeded on August 21, 2026. The current
query returned server-rendered HTML with 78 unique list records. Every sampled list status cell was
the explicit value `Yes` under the `In Custody` heading. The number 78 is only the count returned by
that request; it is not Dallas County Jail's total population or a permanent source total.

The source did not require JavaScript execution, authentication, CAPTCHA completion, a supplied
cookie, a browser-specific header set, or a prior session. JavaScript enhances the source search
interface, but the current list, detail fields, charge rows, and bond rows were present in initial
HTML. Photographs and other subresources were not requested.

The live host's `robots.txt` returned `404`. Absence of a robots file is not permission by itself;
the public official relationship, unprotected read-only interface, conservative request plan, and
human source approval remain required.

## Source and data type

The candidate is a current-custody inquiry when requested with `InCustody=True`:

- the search form contains an `In Custody` control;
- the current result table contains an `In Custody` column;
- every row observed in the reviewed query carried the explicit value `Yes`; and
- the official county navigation calls the destination an inmate roster.

Detail pages also contain `Booking History`, including released historical bookings for some people
who currently appear in custody. Those older booking sections are not part of the proposed source
scope and must not be persisted or published. The source is not an assertion of conviction, case
disposition, release eligibility, or victim notification.

No non-comprehensive-roster notice like the Scott County notice was found on the official Dallas
County pages or inquiry response reviewed. That absence is not converted into a claim that the
displayed count equals everyone physically held. Public wording must describe the records returned
by the official current-custody query and must never label their count as total jail population.

## Current-versus-released semantics

Current custody is explicit at the list boundary: the request uses `InCustody=True`, the control
remains checked, and each returned row reports `Yes` in the `In Custody` column.

The detail boundary is more complex. Three minimally sampled `Multiple Bookings` records each had:

- one booking section with an empty `Release Date` and a populated `Housing Facility`; and
- one historical booking section with a populated `Release Date` and no populated housing facility.

This consistent sample supports a candidate current-booking selector, but the adapter must validate
it rather than assume it. For a person explicitly listed as in custody, Phase 2B may accept only
booking sections satisfying the reviewed current-booking invariants. Zero or ambiguous matches, or
an unexpected number of active-looking sections, must fail the entire snapshot. A missing person on
a later list must never be described as released.

## Transport mechanism

The source is a server-rendered HTML application using source-specific GET requests.

| Purpose                       | Method and path                                                     | Parameters                                             | Response                                      |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Search form                   | `GET /NewWorld.InmateInquiry/dallas`                                | none                                                   | HTML form and source identity; no roster rows |
| Current roster                | `GET /NewWorld.InmateInquiry/dallas`                                | `InCustody=True`                                       | HTML results table or source `No data` state  |
| Pagination                    | same path                                                           | reviewed filters plus `Page={integer}`                 | HTML results page                             |
| Synthetic no-match validation | same path                                                           | `InCustody=True` plus a conspicuously synthetic `Name` | HTML table with `No data`                     |
| Booking detail                | `GET /NewWorld.InmateInquiry/dallas/Inmate/Detail/{source locator}` | path locator emitted by list                           | HTML demographic and booking-history sections |

The source locator in a detail URL is sensitive transient transport state. It must not enter logs,
fixtures, analytics, product URLs, sitemaps, structured data, or public person pages.

## Pagination and result-limit findings

The current query returned 78 unique detail links and no pagination link, so the complete displayed
current result fit on one source page at the audit time. Names were in nondecreasing alphabetical
order; detail links were unique within the response.

The same source's pagination mechanism was validated structurally without recording historical
values:

- an observed paginated response contained 100 unique detail links;
- pager links used the integer `Page` query parameter;
- the observed pager exposed first, previous, and next destinations; and
- an out-of-range `InCustody=True&Page=2` request retained the checked current filter and returned
  the source's validated `No data` table.

A future adapter must follow only pager links emitted by a validated response, require the exact
host/path and `InCustody=True` scope on every page, reject unknown filters, reject repeated pages or
detail locators, and stop only when the validated pager has no next destination. It must not infer a
page count from 100 or manufacture an unbounded sequence of page requests.

No source-published total, backend maximum, or formal API contract was exposed. Page and aggregate
counts must be monitored as returned-record counts, never represented as jail population.

## Detail-record matching and booking identity

Each list row has one source-emitted detail link. The current response contained no duplicate detail
link. Detail pages provide:

- a `Booking History` section;
- one or more headings explicitly prefixed `Booking` followed by a source identifier;
- `Booking Date`, `Release Date`, `Prisoner Type`, `Housing Facility`, `Total Bond Amount`,
  `Total Bail Amount`, and `Booking Origin`; and
- booking-local bond, charge/court-date, and charge-detail tables.

The `Booking …` heading is adequate evidence that the following value is a booking identifier. It
must not be confused with the list/detail path locator or the separately exposed `Subject Number`.
The latter is a person-oriented identifier and is excluded.

The list signals when multiple bookings exist. Sampled multiple-booking detail pages preserved
booking sections separately. Phase 2B must attach each retained charge and bond row to the selected
current booking section and reject cross-section association.

## Freshness behavior

The inquiry did not expose a source-generated last-update timestamp, update cadence, timezone,
`ETag`, or `Last-Modified` header. The current response used `Cache-Control: private`.

Consequences are:

- `sourceLastUpdatedAt` remains null;
- worker `lastCheckedAt`, `lastSuccessAt`, and snapshot `capturedAt` represent product events only;
- no UI may call the data real-time or label retrieval time as a county update time;
- polling cadence, warning threshold, stale threshold, and maximum display age require human
  approval before scheduled ingestion; and
- source date/time fields must not be converted to UTC until an explicit Dallas County timezone and
  daylight-saving rule is approved.

## Field summary

The current list exposes photo, name, explicit custody status, demographic fields, and a multiple-
booking marker. Detail pages expose booking history, a booking identifier, booking and release
dates, facility, origin, charge rows, court-date associations, and bond rows.

The proposed product should collect far less than the source exposes. Photographs, subject number,
race, gender, height, weight, address, historical bookings, court dates, docket numbers, offense
dates, sentence fields, and other demographic or court-detail fields are excluded from the initial
scope. The complete decision is in
[dallas-county-iowa-field-matrix.md](./dallas-county-iowa-field-matrix.md).

## Bond findings

Each booking section can contain a separate bond table with:

```text
Bond Number | Bond Type | Bond Amount
```

Across the minimized structural sample:

- multiple bond rows within one booking were observed;
- `NO BOND`, `CASH ONLY`, and `CASH/SURETY` were observed as explicit `Bond Type` values;
- observed `NO BOND` rows carried a zero amount, while observed cash bond types carried positive
  monetary amounts;
- multiple charge rows and multiple bond rows remained separate within the booking; and
- no bond-table key linked a bond row to a particular charge.

Therefore bond rows may attach only to their booking and must remain ordered individual records.
`NO BOND` may map to `no_bond` only on an exact reviewed value. Zero alone must never map to
`no_bond`. A missing table, row, type, or amount remains `unknown` unless further source evidence
proves another state.

The source displays a dollar sign but no ISO currency code in the reviewed field structure. A USD
normalization needs an approved jurisdiction/source rule. Source-published total bond/bail fields
are unnecessary for the MVP and should not replace or collapse individual bond rows.

## Empty-result and error distinction

A conspicuously synthetic name query within `InCustody=True` returned:

- HTTP `200`;
- the `Dallas County Inmate Inquiry` identity and disclaimer;
- the checked current-custody control;
- the expected result-table headers; and
- the literal `No data` in the empty table body.

An out-of-range current page returned the same validated empty-table structure. These observations
establish the source's empty renderer, but neither represents a zero-person Dallas County roster.

For the exact unfiltered current query, `valid_empty` is permitted only when page 1 contains all
identity, scope, form, and table markers, contains the literal `No data`, contains no record or
pager link, and no other person/search filter is present. `No data` on a name search or later page
is not a whole-roster zero. A zero row selection without the literal marker is `unexpected_empty` or
parser failure.

Transport timeout, DNS/TLS failure, non-`200`, redirect, wrong content type, missing identity,
missing headers, authentication/challenge content, malformed rows, or detail mismatch remains a
fetch or parser failure. A sharp transition from a prior nonempty snapshot to source-reported zero
must be quarantined by anomaly policy rather than automatically replacing the prior snapshot.

## Adapter and parser recommendation

Phase 2B should use a dedicated two-stage HTML adapter, provisionally named
`dallas-newworld-inmate-inquiry`. It should not become a generic Tyler or nationwide scraper.

Proposed stages:

1. fetch the exact HTTPS `InCustody=True` page with redirects disabled;
2. validate host, status, content type, application identity, disclaimer, checked custody scope,
   expected headers, and the mutually exclusive record/`No data` states;
3. follow only validated source-emitted pager links while preserving current scope;
4. parse list display name, explicit `Yes` custody status, multiple-booking marker, source order,
   and a transient detail locator;
5. fetch necessary details serially or at very low bounded concurrency under an approved budget;
6. validate detail identity and booking-section structure;
7. retain only booking sections that satisfy the approved current-booking invariant;
8. parse booking identifiers, charge rows, and bond rows as separate ordered collections;
9. interpret an empty result only under the exact page-1 rule above;
10. normalize only approved fields, with source-local timestamps unresolved until timezone review;
    and
11. reject the entire snapshot on partial pagination, detail failure, ambiguous active booking,
    duplicate locator, structural drift, or unknown required enumeration.

The current repository contract can host this adapter, but the Phase 1 transport cannot. Phase 2B
must first implement a connection-bound DNS-validating HTTPS transport that revalidates redirects
and preserves every current SSRF control.

## Allowlist recommendation

| Host                           | Roster allowlist                      | Justification and restrictions                                                                   |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `inmates.dallascountyiowa.gov` | Candidate yes after Phase 2B approval | Exact HTTPS host for list/detail; port 443; exact path prefix; no subdomains; redirects disabled |
| `www.dallascountyiowa.gov`     | No for roster ingestion               | Institution, facility, contact, and relationship evidence only                                   |
| Any Tyler/CDN/image host       | No                                    | Source scripts, images, and vendor assets are unnecessary for HTML ingestion                     |

No wildcard, parent-domain, alternate scheme, or implicit subdomain allowance is justified.
Point-in-time DNS resolution returned only public-address classes for both reviewed Dallas County
hosts. Addresses were not recorded. Resolution must be repeated and bound at connection time; any
private, loopback, link-local, metadata, mixed, or changed destination fails closed.

## Network operating constraints

The source publishes no request-rate contract. Phase 2B must use an identifiable user agent,
redirects disabled, strict HTML content checks, conservative byte/decompression caps, bounded
timeouts, serial or very low-concurrency detail requests, and bounded retry with jitter only for
transient failures. It must honor `Retry-After` and stop on any block, challenge, authentication,
scheme change, or unreviewed host.

Because complete charge and bond information requires detail fan-out, the request budget and update
cadence require explicit approval. CI must never fetch the live source.

## Reliability and production-risk review

### Local development

The exact HTTPS current query and minimized detail samples repeatedly returned `200` HTML without a
supplied session. The current response was small enough for conservative HTML limits, and sampled
detail documents were materially smaller. This is local read-only evidence, not a service-level
guarantee.

### CI

Ordinary CI must use hand-authored fictional fixtures. Live data, mutable counts, source
availability, and personal content make live CI inappropriate. Fixtures must reproduce only the
minimum reviewed structure and may not be derived by redacting a live response.

### Production worker/serverless

Production egress has not been tested. The application has no HSTS signal, the official routing path
contains an HTTP downgrade, request limits are undocumented, and charge/bond ingestion needs detail
fan-out. The production worker also lacks the required connection-bound DNS transport, redirect
enforcement, shared scheduling controls, monitoring, and retention job.

### Principal failure modes

- official source URL or relationship-route change;
- accidental following of the official route's HTTP downgrade;
- TLS, DNS, hosting, or production-egress failure;
- source pagination appearing after the current result exceeds one page;
- filter loss between pages;
- silent result truncation or duplicate pages/details;
- a search-specific or later-page `No data` being mistaken for whole-roster zero;
- a source/application failure rendered as a misleading empty table;
- list/detail mismatch or multiple-booking ambiguity;
- historical released bookings leaking into current custody;
- detail fan-out exceeding an undocumented source limit;
- one failed detail creating an unsafe partial snapshot;
- HTML, label, enumeration, or table drift;
- unlabeled timezone conversion;
- bond totals or zero amounts being misinterpreted; and
- retention creating a booking-history archive.

Monitoring should cover relationship-route changes, response classes and sizes, current filter
presence, page and returned-record counts, duplicate locators, detail counts, active-booking
invariants, charge/bond row distributions, unknown enumerations, zero transitions, parser version,
run duration, last success age, and retention deletion outcomes. Logs contain aggregates only.

## Privacy and retention considerations

The source exposes far more personal information than the product needs. Initial collection should
be limited to source-faithful display name, explicit current status, approved current booking
identifier, booking time only after timezone approval, ordered charge descriptions, and ordered
booking-level bond rows. It should exclude photographs, subject number, race, gender, height,
weight, address, released booking history, court dates, docket numbers, sentence data, and other
demographic or court-detail fields.

Detail HTML must remain transient. Recent or historical booking sections are parsed only far enough
to exclude them and are never persisted. Superseded current-person records require a separately
approved short deletion interval. Disappearance from the current list is not release evidence.

## Third-party confusion risks

- Dallas County's official routing endpoint proves the relationship but is not a safe worker fetch
  URL because it redirects to HTTP.
- Tyler Technologies/NewWorld supplies or brands the inquiry application; it is not the responsible
  public institution.
- The Dallas County Sheriff's Office is the responsible institution; the independent product is not
  affiliated with or endorsed by it.
- A current inquiry record is not a conviction or court disposition.
- Historical booking sections are not current custody.
- `Subject Number`, the detail path locator, booking identifier, bond number, and charge number are
  different identifiers and must not be conflated.
- A bond row does not determine release eligibility, and a source total must not be recomputed or
  attached to a charge without evidence.
- VINE and Iowa court records serve different purposes and are not substitutes for this source.

## Evidence-packet conflicts

No Dallas County evidence packet was supplied. Every material finding was obtained by reopening an
official Dallas County page or directly observing the officially routed Dallas County inquiry. No
packet, legacy project, directory, source snippet, or copied implementation was used as authority.

## Unresolved questions

1. Will Dallas County or the vendor correct the official HTTP redirect and enable HSTS?
2. What source update cadence is expected, and what collection cadence is permitted?
3. What warning, stale, and maximum-display ages should apply?
4. What timezone and daylight-saving rule should normalize unlabeled booking timestamps?
5. Can a person ever have more than one simultaneously active booking section?
6. Can an active booking ever have an empty housing facility or a populated release value delayed by
   source synchronization?
7. Does the paginator always preserve `InCustody=True` after the current result exceeds one page?
8. Is there a documented backend cap beyond the visible page mechanism?
9. What source conditions distinguish an upstream database outage from a valid `No data` response?
10. Which additional bond types, amount formats, and missing-table states can occur?
11. May dollar-prefixed amounts be normalized to ISO `USD` under an approved rule?
12. What request budget will Dallas County and the vendor tolerate for detail-page fan-out?
13. Will the exact HTTPS requests succeed from the approved production egress environment?

## Publication recommendation

**ELIGIBLE FOR PHASE 2B**

Dallas County has a verified official relationship, a working HTTPS current-custody query, explicit
custody markers, observable pagination, a source-specific empty renderer, and relational
booking/charge/bond structure. It is eligible for a separately approved source-specific adapter and
fictional fixture phase.

It is not eligible for publication now. Phase 2B must resolve or fail closed on the HTTP-route
caveat, current-booking selection, pagination invariants, empty anomaly policy, timestamp mapping,
request budget, retention, and field decisions. Dallas County, Iowa coverage, and every production
route remain inactive until adapter tests, live verification, official contact/editorial evidence,
and a human publication review all pass.
