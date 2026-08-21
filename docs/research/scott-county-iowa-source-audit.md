# Scott County, Iowa source audit

## Decision

**NOT ELIGIBLE FOR PHASE 2B**

The Scott County Sheriff's Office is verified as the responsible institution, its current `.gov`
inmate page directly links to a working roster application on `www.scottcountyiowa.us`, and normal
read-only requests to that application succeeded on August 21, 2026. Those facts are necessary but
not sufficient for Phase 2B eligibility.

The primary eligibility failure is stated by the source itself: **“This roster is not a
comprehensive listing of all the inmates being held in the Scott County Jail.”** The public
application can verify only the records it chooses to list. It cannot support a claim that every
person held by Scott County Jail is represented, and no displayed or calculated record count may be
described as the jail's total population or as complete active custody.

Two additional, separate failures remain:

1. The application uses a `200` response containing both a no-match statement and a possible
   database-unavailable explanation. It therefore does not provide source-specific evidence for a
   deterministic valid-empty roster.
2. The public interface partitions records by surname initial and exposes no documented total,
   result cap, complete-enumeration contract, or pagination contract. The sampled result page had no
   pagination controls, but absence of controls does not prove enumeration behavior.

The current source fails the complete-current-custody requirement on its express scope,
independently of any pagination uncertainty. It is not eligible for adapter implementation.

## Research scope

- **Research date:** August 21, 2026
- **County:** Scott County, Iowa
- **Facility:** Scott County Jail
- **Responsible institution:** Scott County Sheriff's Office
- **Baseline reviewed:** commit `3df403c` (`Establish reviewed Phase 1 baseline`)
- **Mode:** read-only source and live-transport research; no ingestion or persistence
- **Evidence packet:** the August 19, 2026 consolidated packet was read completely and used only as
  a lead and claim inventory

No identifiable roster value, response body, cookie, screenshot, HAR, PDF, or raw source artifact
was saved. Live checks emitted only response metadata, source labels, aggregate counts, hashes,
boolean structural observations, and redacted classifications.

## County and facility identity

The [Scott County Sheriff's Office](https://www.scottcountyiowa.gov/sheriff) is an institutional
Scott County government page. The official
[Scott County Jail](https://www.scottcountyiowa.gov/sheriff/jail) page identifies the jail as a
Scott County facility overseen by the Sheriff and links users to the county inmate-information page.
These pages establish institution and facility identity; they are not themselves live roster
transports.

## Official institutional source

| Item                       | Finding                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Official institution       | Scott County Sheriff's Office                                                                                         |
| Institutional URL          | `https://www.scottcountyiowa.gov/sheriff`                                                                             |
| Official inmate gateway    | `https://www.scottcountyiowa.gov/sheriff/inmates`                                                                     |
| Gateway page title         | `Inmate Listing`                                                                                                      |
| Candidate live application | `https://www.scottcountyiowa.us/sheriff/inmates.php`                                                                  |
| Relationship kind          | Direct official link from the `.gov` inmate gateway                                                                   |
| Candidate classification   | Officially linked Scott County secondary-domain application; direct operational ownership is not independently proven |
| Official status            | Institution and official-link relationship verified; source not approved for ingestion or publication                 |

The institutional gateway visibly states that its listing covers people currently in custody and
people released within the last seven days. Its `Start Search` link resolves directly to the exact
`.us` application URL above.

## Exact source evidence chain

The verified user path is:

```text
Scott County Sheriff's Office (.gov)
  -> Scott County Jail (.gov)
  -> Inmate Listing gateway (.gov)
  -> direct HTML anchor, “Start Search”
  -> www.scottcountyiowa.us/sheriff/inmates.php
```

The `.us` application reciprocally links to the `.gov` Sheriff's Office and inmate pages, uses Scott
County navigation and notices, and displays Scott County attribution. This makes the secondary
domain clearly associated with the institution for the roster function. This audit did not use
domain appearance alone and does not claim a registrant or vendor relationship that was not shown.

No roster vendor was named on the observed application. Sucuri appeared as an HTTP proxy/server and
Google Tag Manager appeared as an unrelated page subresource; neither is evidence that it operates
or supplies the roster. The newsletter form target on `public.govdelivery.com` is also unrelated to
roster transport. None of those hosts belongs in a roster-source allowlist.

## Redirect-chain findings

- The `.gov` gateway does **not** redirect to the roster. It returns an institutional HTML page that
  contains a direct link to the `.us` application.
- A direct `HEAD` request to the exact `.us` application returned `200 OK`,
  `text/html; charset=UTF-8`, and no `Location` header.
- `https://www3.scottcountyiowa.gov/sheriff/inmates.php` returned `403 Forbidden`; it did not
  provide a usable redirect to the working application.
- Direct command-line requests to the `.gov` gateway encountered a Cloudflare challenge and `403`,
  while the normal browser research path loaded the institutional page. No challenge was bypassed.
- The working source chain therefore ends at the exact `.us` hostname. The `www3` hostname is not a
  fallback and must not be allowlisted.

## Live-fetch result

Repeated normal, read-only `GET` requests to the `.us` application succeeded without a supplied
cookie, authenticated session, CAPTCHA solution, WAF clearance token, referrer, or browser-specific
header set. The root application, a surname-initial result partition, and a minimal current and
recent-release detail sample all returned server-rendered HTML.

The page displays a JavaScript warning, but the search form, notices, result table, and detail
tables were present in the initial HTML. No roster JSON endpoint, iframe, PDF, CSV, or required
client-side lazy-load transport was observed. The worker must not execute the page's scripts or
fetch analytics subresources.

This is evidence of local read-only availability only. It is not evidence that CI or production
serverless egress will be accepted.

## Source and data type

The roster's primary scope notice states that it is not a comprehensive listing of all people held
at Scott County Jail. The application therefore represents a selected public roster, not a complete
current-custody census. It can verify the displayed source records within their stated status; it
cannot verify that an unlisted person is absent or that the displayed set covers everyone held.

Within that expressly limited public set, the application is a mixed, short-window dataset:

- current Scott County Jail custody;
- releases within the preceding seven days; and
- separate daily-booking-report links on the same application.

The core inmate list is not a historical booking archive, an arrest-report repository, a court
disposition, an Iowa Department of Corrections roster, a notification service, or a federal-custody
locator. Daily booking reports use a separate `comdate` query shape and are outside the proposed
current-custody adapter scope.

Any source-row count, current-status count, partition count, or detail-link count is only a count of
records returned by that request. It must never be labeled total jail population, total inmates,
complete roster, or complete active custody.

The official [inmate FAQ](https://www.scottcountyiowa.gov/sheriff/inmates/faq) independently states
that online records are limited to current custody or releases in the prior seven days and that
federal inmates are excluded.

## Current-versus-released semantics

The application provides two explicit custody-state signals:

- the search form offers `In Custody` and `Released (within last seven days)` options; and
- each list row's `Release Date Time` cell contains either the literal `In Custody` or a release
  date/time.

A privacy-preserving sample of one surname-initial partition contained both states. Every sampled
release date was parseable and fell from zero through seven calendar days behind the application's
own displayed `Today` date. This confirms that the stated window was observable in the sample; it
does not override the official non-comprehensive notice or prove administrative synchronization.

Current custody must be selected only from the explicit `In Custody` literal. A person's absence, an
empty search, or a later missing record must never be converted into a release fact. If an official
institution later supplies or documents an eligible complete feed and Phase 2B is separately
authorized, recent-release rows should be used only to exclude them from the current snapshot and
should not be persisted without a separate necessity and retention approval.

## Federal-custody limitation

Both the official `.gov` material and the linked roster notice state that federal prisoners or
detainees are not included. The product must describe that as a source limitation, not as evidence
that an absent person is not held elsewhere.

## Transport mechanism

The roster is a source-specific, server-rendered HTML application. The observed request shapes were:

| Purpose                   | Method and path            | Parameters                                                                 | Response                                              |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| Search form and notices   | `GET /sheriff/inmates.php` | none                                                                       | HTML                                                  |
| Surname-initial partition | `GET /sheriff/inmates.php` | `startswith={A-Z}`                                                         | HTML result table                                     |
| Custom search             | `GET /sheriff/inmates.php` | `lastname`, `firstname`, `lcity`, `lstate`, `comitau`, `custody`, `submit` | HTML result table or ambiguous no-match/error message |
| Booking detail            | `GET /sheriff/inmates.php` | `sysid={source locator}`                                                   | HTML definition list plus charge and bond tables      |
| Daily booking report      | `GET /sheriff/inmates.php` | `comdate={source date}`                                                    | HTML; out of proposed scope                           |

No roster form `POST` was observed. No agency or facility identifier was required for the sampled
predefined list/detail path. The `comitau` field is a committing-agency search input, not an
approved source or facility identifier.

The source locator carried by `sysid` must be treated as untrusted, sensitive transport state. Its
meaning and persistence are undocumented. It must not appear in logs, fixtures, analytics, canonical
URLs, product person URLs, sitemaps, or public structured data.

## Source completeness, pagination, and result-limit findings

The source expressly says its roster is not comprehensive. This is a definitive source-scope limit,
not an inference from missing pagination controls. The application may accurately describe each
displayed row while still omitting other people held by the jail. Consequently, the current public
application cannot satisfy the product's complete current-custody source gate.

The application exposes A-through-Z surname partitions and search fields. In the sampled `S`
partition:

- one HTML table contained 38 data rows;
- all 38 detail links had unique `sysid` values within that response;
- no `page`, `offset`, `limit`, or cursor query key was present; and
- no result total, next-page control, or documented cap was exposed.

The sample count describes only that response and is not a jail-population or complete-custody
count. Separately, the public pages do not document:

- a maximum result count;
- how names outside A-through-Z are handled;
- whether a partition can be silently truncated;
- whether records can be omitted during an update;
- a complete current-only feed; or
- a machine contract for enumerating all partitions.

A custody-only custom query without a name or agency criterion returned the same ambiguous
no-match/database-unavailable response described below. Therefore it cannot currently replace the
partitioned path as a proven complete current roster.

Both the source-scope and enumeration gates fail. Scott County may be reconsidered only if an
official institution supplies or documents a complete current-custody feed, its complete
enumeration/cap behavior, and deterministic empty/failure semantics.

## Detail-record matching and booking identity

List rows link to detail pages through `sysid`. In a minimal current/recent sample:

- normalized name components from the detail were contained in the linked list name;
- `Booking Date Time` matched exactly between list and detail;
- `Committing Agency` matched exactly between list and detail;
- the detail explicitly labeled `Booking Number`; and
- current and recent-release detail requests returned the expected detail structure.

The committing-agency text matched in that sample. Population-wide consistency is still unconfirmed,
so the adapter must validate rather than assume that relationship.

The explicit `Booking Number` label is sufficient evidence that its value is a source booking
identifier. It does not prove that `sysid` is a booking identifier; the same detail page also
exposes a separately labeled `Permanent ID`, which must not be collected. The source does not
document whether one person can have simultaneous or repeated booking records behind the same
`sysid`. Multiple-booking collision behavior is therefore not confirmed.

## Freshness behavior

The application states that the roster is updated every ten minutes. It does not expose a
source-generated update timestamp, timezone label, `Last-Modified`, or `ETag` in the observed
response. The only trustworthy technical event available to the product would be its own retrieval
and successful-parse time.

Consequences for a future adapter are:

- keep `sourceLastUpdatedAt` null unless Scott County begins publishing a real update timestamp;
- record `lastCheckedAt`, `lastSuccessAt`, and snapshot `capturedAt` as distinct worker events;
- do not label retrieval time as the county's update time;
- do not poll more often than the stated ten-minute source cycle; and
- obtain human approval for warning, stale, and maximum-display thresholds before persistence.

`Booking Date Time`, `Release Date Time`, and detail date fields contain no displayed timezone or
UTC offset. They may be displayed as source-local text during review. Converting them to an instant
requires an explicitly approved, daylight-saving-aware Scott County timezone rule; the adapter must
not silently append a timezone.

## Field summary

The list exposes name, age, booking date/time, release date/time or current-custody literal,
committing agency, and charges. Detail pages expose name components, an explicitly labeled booking
number, booking/release information, a charge table, and a bond table.

The source also exposes fields the product does not need, including full birth date, a permanent
identifier, physical descriptors, location text, aliases, and images. Those fields are excluded by
data minimization even though they are public at the source. The complete field-by-field decision is
in [scott-county-iowa-field-matrix.md](./scott-county-iowa-field-matrix.md).

## Bond findings

The detail page has a separate bond table with these observed headers:

```text
Date Set | Type ID | Bond Amt | Status | Posted By | Date Posted
```

The charge table is separate and includes `Case #` and `Description`. The bond table has no case or
charge column. Therefore:

- bond rows can be attached only to the displayed booking, not to a particular charge or case;
- multiple bond rows must remain separate and in source order;
- no combined or payable total may be calculated;
- an observed `No Bond` literal appears in the source's `Type ID` column and may map to `no_bond`
  only on an exact reviewed match;
- source rows with a zero monetary amount were also observed and were distinct from explicit
  `No Bond`; zero currency must not be converted to `no_bond`;
- absence of a bond table, row, amount, or status has not been proven to mean any specific bond
  state and must remain `unknown`; and
- monetary cells displayed a dollar sign but no ISO currency code. A USD mapping requires an
  approved source/jurisdiction rule.

The limited sample showed multiple bond and charge rows, confirming that a flattened string or
single bond value would lose meaning.

## Empty-result and error distinction

A custom query using a conspicuously synthetic, non-person search term returned:

- HTTP `200`;
- valid-looking application chrome and source notices; and
- a message containing both a no-match statement and a possible database-unavailable explanation.

That response cannot prove a valid zero-person roster. Treating it as `valid_empty` would violate
the source-publication policy. It must be classified as `unexpected_empty` or a validation failure.

Other sampled failure classes were distinguishable at transport level:

- the obsolete `www3` endpoint returned `403`;
- a deliberately invalid synthetic `sysid` returned `500` with no detail markers; and
- a changed response can be rejected by missing identity, table-header, notice, and relationship
  markers.

Those distinctions do not solve the valid-empty problem. No source-specific response was found that
unambiguously means the application returned zero listed current-custody records. Even a future
unambiguous zero for this non-comprehensive application would not prove that Scott County Jail holds
zero people.

## Adapter and parser recommendation

No adapter or parser should be implemented for the current non-comprehensive source. If Scott County
later supplies or documents a complete current-custody feed and the source is separately
reconsidered, that future feed would require a new Scott-specific adapter; a generic scraper would
weaken source-specific validation and is not acceptable.

The proposed stages are:

1. fetch the newly supplied or documented complete feed using only exact approved request shapes;
2. validate host, status, content type, page identity, notices, expected table headers, and result
   completeness markers;
3. parse list rows while preserving source order and explicit current/release state;
4. fetch the minimum necessary detail pages at low concurrency for approved fields only;
5. validate list/detail identity using source-labeled booking number and reviewed matching fields;
6. parse charges and bond rows as separate ordered collections;
7. interpret empty only from a future deterministic source-specific signal;
8. normalize only approved fields, with local timestamps unresolved until timezone policy approval;
9. classify transport, WAF, invalid request, unexpected empty, schema drift, and detail mismatch
   separately; and
10. commit a snapshot only after every required partition and detail succeeds.

The existing adapter interface could host a future source-specific implementation, but no such work
is authorized. Any reconsidered feed would also need a connection-time DNS-bound transport that
revalidates every redirect and preserves all current SSRF controls.

## Allowlist recommendation

| Host                       | Roster allowlist                                         | Justification and restrictions                                                                                                              |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `www.scottcountyiowa.us`   | Candidate only after complete-feed evidence and approval | Exact host for list and detail HTML; HTTPS only; `includeSubdomains: false`                                                                 |
| `www.scottcountyiowa.gov`  | No for the roster adapter                                | Institutional and relationship evidence host; direct scripted access was challenged; any evidence-check job requires its own exact approval |
| `www3.scottcountyiowa.gov` | No                                                       | Returned `403`; not the current official working path                                                                                       |
| `public.govdelivery.com`   | No                                                       | Newsletter form target, unrelated to custody data                                                                                           |
| `www.googletagmanager.com` | No                                                       | Analytics subresource, unnecessary and prohibited for ingestion                                                                             |

No wildcard or parent-domain allowlist is justified. The working roster did not redirect, so the
future transport should use manual redirect handling and fail closed on any unreviewed target.

DNS checks on the three Scott County hostnames returned only public A records during the audit. That
is a point-in-time observation, not a security guarantee. Resolution must be repeated and bound at
connection time; mixed, private, link-local, loopback, metadata, or changed destinations must fail.

## Network operating constraints

If later approved, the initial transport policy should use a descriptive user agent, serial or very
low-concurrency detail requests, strict HTML content checks, a conservative body cap, short connect
and total timeouts, and bounded retries with jitter only for transient failures. It must honor
`Retry-After`, stop on `403`/challenge responses, and never rotate proxies, replay challenge tokens,
or automate a bypass.

The source publishes no rate-limit contract. Because current-booking bond data requires detail-page
fan-out and complete enumeration is unresolved, a safe request budget cannot yet be approved.

## Reliability and production-risk review

### Local development

The `.us` list and sampled detail pages repeatedly returned `200` with server-rendered HTML. The
`.gov` institutional site challenged direct command-line requests, and the obsolete `www3` endpoint
returned `403`. These are host-specific observations; a failed request must be classified by its
actual response rather than called a local-network problem.

### CI

Ordinary CI must not fetch the live roster. Network availability, WAF decisions, mutable data, and
real-person output make live CI both unreliable and inappropriate. If a complete replacement feed is
later approved, its parser tests must use fully synthetic, structurally minimized fixtures created
without copying live values or raw HTML.

### Production worker/serverless

Production egress identity has not been tested. Sucuri or future bot controls may treat data-center
traffic differently. The worker also lacks the approved DNS-bound transport, redirect revalidation,
shared scheduling/rate controls, and end-to-end transaction path required for live use. A successful
local fetch is not evidence that production will work.

### Principal failure modes

- express source-scope omission: the application is not a comprehensive list of everyone held;
- a displayed/calculated count being mislabeled as total population or complete active custody;
- WAF or bot-control challenge, `403`, or changed CDN behavior;
- source hostname or link-chain change;
- HTML header, malformed markup, or table structure drift;
- partial surname partition or undocumented result truncation;
- ambiguous false-zero response;
- list/detail mismatch or changed `sysid` meaning;
- detail-page fan-out exceeding an undocumented source limit;
- one failed detail producing an unsafe partial snapshot;
- source update lag despite the ten-minute statement;
- local timestamp ambiguity during daylight-saving transitions; and
- retaining current or released person data beyond an approved scope.

If a complete replacement feed is later approved, monitoring must separately alert on
relationship-link drift, HTTP classes, challenge markers, response sizes, structural fingerprints,
partition and returned-record counts, current/release counts, duplicate detail locators, detail
mismatch, bond/charge row anomalies, parser failures, run duration, last success age, and
deletion-job results. Returned-record counts must always be labeled as such unless the official feed
contract proves a total. Logs may contain only aggregate operational metadata.

## Privacy and retention considerations

The source exposes substantially more personal data than this product needs. If an eligible complete
replacement feed and Phase 2B are later approved, collection should be limited to a display name,
explicit custody state, source-labeled booking number if approved, booking time under an approved
timezone rule, charges, booking-level bond rows, and possibly committing agency. It should exclude
date of birth, permanent ID, physical descriptors, aliases, city/state, photographs, posted-by
values, and other unnecessary detail fields.

Recommended scope is current custody only. Recent-release entries should not be persisted merely
because the source includes them. Disappearance from a later valid full snapshot is not proof of
release. Person-level data from superseded snapshots must be deleted or made inaccessible within a
separately approved short current-custody retention interval, and backups must not become a booking
history.

Raw HTML must remain transient. A fixture may reproduce only source structure with conspicuously
fictional data; it may not be derived by redacting and committing a live person's response.

## Third-party confusion risks

- The `.us` hostname is a secondary domain, not independent proof of authority. Its official link
  and reciprocal county identity must remain monitored.
- Sucuri and Google Tag Manager are infrastructure/subresources, not roster authorities or data
  sources.
- The daily booking report is not current custody.
- A recent-release row is not current custody.
- The committing agency is not necessarily the Scott County Sheriff's Office.
- A charge is not guilt, conviction, or final court disposition.
- A bond row is not a release guarantee, eligibility decision, or case-level total.
- Scott County Jail, Iowa DOC, court, VINE, and federal systems are not interchangeable.

## Conflicts and confirmations against the supplied packet

The packet was not used as authority. Independent checks produced these results:

| Packet lead                                                      | Independent result                                                     |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `.gov` inmate page is the institutional gateway                  | Confirmed                                                              |
| `.us` application is the working roster                          | Confirmed for normal read-only local requests                          |
| `www3` is currently inconsistent/blocked                         | Confirmed: `403`, no usable redirect                                   |
| Current and prior-seven-day release records are mixed            | Confirmed in official text and sampled list structure                  |
| Roster is expressly not a comprehensive list of everyone held    | Confirmed from the live application's primary notice                   |
| Federal prisoners/detainees are excluded                         | Confirmed in official `.gov` FAQ and roster notice                     |
| Roster says it updates every ten minutes                         | Confirmed; no actual source update timestamp was exposed               |
| No-match and database-unavailable meanings are combined          | Confirmed with a synthetic no-match request                            |
| Bond rows lack documented charge/case mapping                    | Confirmed from separate table headers                                  |
| Backend caps and `sysid` persistence are unresolved              | Still unresolved                                                       |
| Packet writing readiness implies source implementation readiness | Rejected; the express source-scope limit prevents Phase 2B eligibility |

No material packet claim was promoted without reopening an official source or directly observing the
current transport.

## Unresolved questions

1. Will an official institution supply or document a complete current-custody feed?
2. What are the result cap, partition-completeness rules, and non-letter surname behavior?
3. What source signal unambiguously represents a valid zero current-custody roster?
4. Is there an official health or data-service endpoint distinct from the public HTML application?
5. What request cadence and detail-page fan-out does Scott County permit?
6. Is `sysid` person-scoped, booking-scoped, stable, or recyclable?
7. How are multiple concurrent or repeated bookings for one person represented?
8. Is committing-agency text consistently identical between list and detail across the full source,
   and which representation is authoritative if a later mismatch occurs?
9. What timezone and daylight-saving rule apply to unlabeled roster timestamps?
10. Can a missing bond table/row be distinguished from unavailable or unpublished bond data?
11. Does Scott County define the monetary `$` fields as USD for machine normalization?
12. Can the county provide a documented no-data response that is distinct from database failure?
13. Will the same normal requests succeed from the approved production egress environment?

## Publication recommendation

**NOT ELIGIBLE FOR PHASE 2B**

The institutional relationship and live application are verified, but the source expressly states
that it is not a comprehensive listing of everyone held. It can support only claims about records it
displays, not complete active custody or total jail population. Ambiguous false-zero behavior and
undocumented enumeration/cap behavior remain separate failures.

Scott County may be reconsidered only if an official institution supplies or documents a complete
current-custody feed, its enumeration/cap behavior, and deterministic empty/failure semantics. Scott
County remains unpublished, and the production Iowa coverage route must remain inactive.
