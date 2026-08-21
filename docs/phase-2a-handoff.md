# Phase 2A handoff

## 1. Overall eligibility decision

**NOT ELIGIBLE FOR PHASE 2B**

The current official Scott County institution, its direct link to a working secondary-domain roster,
and the mixed current/recent-release semantics were independently verified on August 21, 2026. The
source's own primary notice states that it is **“not a comprehensive listing of all the inmates
being held in the Scott County Jail.”** The application can verify only records it chooses to list;
it cannot establish that every person held is represented.

This express source-scope limit makes the current source not eligible for Phase 2B. Undocumented
enumeration/cap behavior and an ambiguous HTTP `200` no-match/database-unavailable response are
additional, separate failures. No displayed or calculated count may be described as total jail
population or complete active custody.

Scott County remains unpublished. Iowa coverage remains inactive in production. Wayfinder remains
the approved working direction only; no production UX decision or change was made.

## 2. Official institutional URL

- Institution: Scott County Sheriff's Office
- Official URL: `https://www.scottcountyiowa.gov/sheriff`
- Official jail page: `https://www.scottcountyiowa.gov/sheriff/jail`
- Official inmate-information gateway: `https://www.scottcountyiowa.gov/sheriff/inmates`

## 3. Live roster URL

`https://www.scottcountyiowa.us/sheriff/inmates.php`

The exact URL returned `200 OK` and server-rendered `text/html; charset=UTF-8` to normal read-only
requests during the audit. No redirect was present.

## 4. Official evidence chain

```text
Scott County Sheriff's Office (.gov)
  -> Scott County Jail / Inmate Listing (.gov)
  -> direct “Start Search” anchor
  -> Scott County roster application (.us)
```

The `.us` application links back to the official `.gov` Sheriff and inmate pages and carries Scott
County navigation, notices, and attribution. That establishes a current official-link relationship.
It does not by itself prove the `.us` registrant, hosting operator, or a vendor identity.

The older `www3.scottcountyiowa.gov/sheriff/inmates.php` path returned `403` and supplied no usable
redirect. It is excluded from the candidate source chain.

## 5. Source type and custody scope

- Proposed descriptive source type: officially linked Scott County secondary-domain HTML
  application; exact domain-enum classification still needs human approval.
- Responsible institution: Scott County Sheriff's Office.
- Dataset: mixed current custody and releases within the preceding seven days.
- Separate same-application feature: daily booking reports, excluded from the proposed scope.
- Excluded by the source: federal prisoners and detainees.
- Proposed product scope: current custody only. Recent releases should be filtered using the
  explicit source state and not persisted without a separate retention decision.

The application expressly disclaims comprehensive coverage of everyone held. It can verify the
status and fields of a displayed record within the application's terms, but it cannot prove that an
unlisted person is absent or that the returned set represents complete current custody. Every count
is a returned-record count only, never total jail population or complete active custody.

The list explicitly distinguishes `In Custody` from a release date/time. In a limited structural
sample, release dates were observable only within the application's stated zero-to-seven-day
calendar window. Absence from the roster is not release evidence.

## 6. Working fetch mechanism

The observed roster transport is source-specific server-rendered HTML over HTTPS:

- `GET /sheriff/inmates.php` for the search page and source notices;
- `GET /sheriff/inmates.php?startswith={A-Z}` for surname-initial result partitions;
- `GET /sheriff/inmates.php` with custom-search keys (`lastname`, `firstname`, `lcity`, `lstate`,
  `comitau`, `custody`, `submit`);
- `GET /sheriff/inmates.php?sysid={source locator}` for a detail document; and
- `GET /sheriff/inmates.php?comdate={source date}` for out-of-scope daily booking reports.

No roster POST, JSON API, iframe, PDF, CSV, or required client-side roster request was observed. The
initial HTML worked without a supplied cookie or session. A page-level JavaScript warning and
unrelated analytics/newsletter integrations do not need to be executed or fetched by an adapter.

## 7. Required allowlisted hosts

No host is approved for production ingestion in Phase 2A. If an official institution later supplies
or documents an eligible complete feed, the smallest future candidate may be:

- `www.scottcountyiowa.us` — exact host only, HTTPS, `includeSubdomains: false`, list/detail paths
  only, and only after the complete-feed, enumeration/cap, and empty/failure requirements are met.

These hosts should not be in the roster adapter allowlist:

- `www.scottcountyiowa.gov` — institutional/evidence host, not the roster transport;
- `www3.scottcountyiowa.gov` — current `403`, not a fallback;
- `public.govdelivery.com` — unrelated newsletter submission; and
- `www.googletagmanager.com` — unrelated analytics subresource.

Observed DNS A records for the three Scott County hostnames were public at audit time. Production
must still perform connection-bound DNS validation and revalidate every redirect. No wildcard,
parent-domain, private-address, or implicit subdomain allowance is acceptable.

## 8. Adapter/parser decision

Do not implement an adapter or parser for the current non-comprehensive application. If an official
institution later supplies or documents a complete current-custody feed and Scott County is
separately reconsidered, the replacement feed would require a new Scott-specific adapter, not a
generic scraper. It would have to:

- validate institutional and page identity markers;
- prove every required list partition completed;
- preserve explicit current/release state;
- fetch the minimum approved detail set at low concurrency;
- match list/detail using the source link plus reviewed booking fields;
- preserve ordered charges and booking-level bond rows;
- reject partial snapshots, structural drift, ambiguous empty results, and detail mismatches;
- treat `sysid` as transient untrusted transport state; and
- use a future DNS-bound, redirect-validating transport without weakening the Phase 1 SSRF policy.

The existing `SourceAdapter` stage contract is suitable. No adapter, parser, fetch transport, or
fixture was created in Phase 2A.

## 9. Fields observed but not approved for current Phase 2B normalization

No field is approved for current implementation because the source is expressly non-comprehensive.
The following are structural candidates only if an official institution supplies or documents an
eligible complete replacement feed and Phase 2B is separately approved:

- source-faithful display name;
- explicit current-custody status;
- explicit source-labeled booking number, with a separate public-minimization decision;
- ordered charge descriptions attached to the booking; and
- retrieval/check/success timestamps representing product events.

These fields remain conditional:

- booking date/time — source timezone is not displayed;
- bond rows — exact value, absence, and currency mappings need approval; and
- committing agency — the limited list/detail sample matched, but population-wide consistency is
  unconfirmed and the domain model has no field.

## 10. Fields rejected or still unconfirmed

Rejected from the initial proposed scope:

- recent-release persistence or public rows;
- case number;
- public/stored source detail URL or `sysid`;
- permanent ID;
- full date of birth;
- city/state and physical descriptors;
- aliases and photographs;
- bond `Posted By` and `Date Posted`; and
- a fabricated source-update timestamp.

Still unconfirmed:

- timestamp timezone normalization;
- multiple-booking behavior and `sysid` scope/reuse;
- population-wide list-versus-detail agency consistency and authoritative fallback behavior;
- missing bond/table meaning;
- population-wide field consistency; and
- whether a dollar symbol may be normalized to ISO `USD` under an approved rule.

## 11. Bond semantics

The detail document has a separate bond table with `Date Set`, `Type ID`, `Bond Amt`, `Status`,
`Posted By`, and `Date Posted`. It has no charge or case key.

- Multiple bond rows were observed and must remain separate.
- Rows may attach only to the booking, never to a guessed charge or case.
- `No Bond` was observed explicitly in `Type ID` and may map to `no_bond` only on an exact,
  regression-tested match.
- Zero monetary rows were observed separately from explicit `No Bond`; zero must not be remapped.
- Missing rows/values remain `unknown` unless new official evidence proves another state.
- Dollar-prefixed amounts were observed without an ISO currency code; `USD` needs a reviewed rule.
- No total may be calculated, and no bond field may imply eligibility or release.

## 12. Completeness, pagination, and false-zero safeguards

The primary failure is the official source-scope notice: the application is not a comprehensive list
of everyone held at Scott County Jail. This is not merely a pagination inference. Records returned
by the application may be evaluated individually, but the set cannot establish complete active
custody. Its count cannot be presented as total jail population.

One sampled surname-initial partition contained 38 unique detail targets and no pagination key,
next-page control, result total, or documented cap. That number describes only the sampled response.
A complete current-only request was not identified, and non-letter coverage or truncation behavior
remains unknown.

A synthetic no-match custom query returned HTTP `200` with wording that combines no matches and
possible database unavailability. It cannot become `valid_empty`. A future adapter must classify it
as `unexpected_empty` or validation failure and preserve the prior successful snapshot.

Scott County may be reconsidered only if an official institution supplies or documents:

1. a complete current-custody feed;
2. that feed's complete enumeration and cap/pagination behavior; and
3. deterministic empty semantics distinct from database, request, block, and parser failures.

## 13. Production risks

- The source expressly omits some people held, so it cannot support complete current custody.
- A returned-record count could be misrepresented as total jail population or complete active
  custody.
- `.gov` direct tooling encountered a Cloudflare challenge; the working `.us` host uses Sucuri and
  may apply different policy to production egress.
- Production/serverless source access was not tested.
- Detail fan-out has no approved request budget or published rate limit.
- The source exposes no `ETag`, `Last-Modified`, or actual update timestamp.
- Source timestamps have no displayed timezone.
- HTML and malformed-form details can drift without versioning.
- Silent result truncation or a partial partition can look successful.
- List/detail mismatch can corrupt booking ownership.
- An ambiguous `200` no-match response can create a false zero.
- Current and recent-release records are mixed and have different retention risk.
- Raw source data is highly sensitive and must remain out of logs, CI, fixtures, and artifacts.

Ordinary CI should use only fictional, hand-authored structural fixtures. A later approved
production-like health probe must be separate, redacted, low-rate, and unable to publish data.

## 14. Evidence-packet conflicts

Independent checks confirmed the packet's current `.gov` gateway, working `.us` application, `www3`
`403`, seven-day mixed scope, federal exclusion, ten-minute update statement, ambiguous
no-match/error language, and unlinked bond-row concern.

The packet's “ready for writing” outcome was not adopted as implementation eligibility. The live
source's express non-comprehensive notice is a primary eligibility failure, not merely an unresolved
pagination concern. The packet's unresolved `sysid`, result-cap, and hostname warnings remain
unresolved except that the current `.us` working path and `www3` failure were reobserved. The
ambiguous no-match/database-unavailable behavior remains a separate false-zero failure.

## 15. Files created

Only these authorized files were created:

- `docs/research/scott-county-iowa-source-audit.md`
- `docs/research/scott-county-iowa-field-matrix.md`
- `docs/phase-2a-handoff.md`

The external evidence packet was not modified or copied into the repository.

## 16. Read-only commands and requests performed

Repository and evidence review:

- `Get-Content -LiteralPath ... -Encoding utf8` read the 929-line evidence packet in bounded ranges
  and read the 379-line Phase 2A instruction file.
- `git status --short --branch` and `git log -1 --oneline` verified clean baseline `3df403c` before
  documentation work.
- `rg --files`, targeted `rg -n`, and `Get-Content` read the mandatory policies, handoff,
  source-adapter contracts, worker network/guard contracts, domain/database semantics, publication
  rules, and synthetic Scott County contract.

Official-source browsing:

- Opened the official Sheriff, Jail, Inmate Listing, and inmate FAQ pages on
  `www.scottcountyiowa.gov`.
- Followed the official `Start Search` link to the exact `.us` roster application.
- Reopened the live `.us` roster root for this correction and independently confirmed its express
  non-comprehensive-listing notice without opening a person record or recording roster data.
- No unofficial search result, directory, aggregator, marketing page, or packet assertion was used
  as factual authority.

Transport checks:

- `curl.exe --head --max-redirs 0` checked the exact `.us` application, the `.gov` gateway, the
  obsolete `www3` endpoint, and both relevant `robots.txt` paths.
- A PowerShell `Invoke-WebRequest` to the `.gov` gateway encountered a Cloudflare challenge and was
  stopped; no token, cookie, JavaScript, or bypass was attempted.
- Minimal inline Node `fetch` scripts requested the root search page, one surname-initial partition,
  one current and one recent-release detail structure, one conspicuously synthetic no-match query,
  and one conspicuously synthetic invalid-detail query. Repeated detail reads were limited to the
  same two redacted structural samples needed to validate matching and bond categories.
- Scripts emitted only HTTP metadata, hashes, field labels, query-key shapes, boolean matches,
  aggregate counts, date-range classifications, and bond-state categories. They never emitted a
  name, identifier, date, charge, amount, photograph, address, or raw body.
- `Resolve-DnsName` checked point-in-time A-record classes without recording addresses. An attempted
  `pnpm exec tsx` DNS helper failed because `tsx` is not installed; it made no network or file
  change.
- `corepack pnpm format:check` passed for the full workspace after documentation was formatted.
- A targeted `rg` scan found no phone-like, long-identifier, or monetary-value pattern in the three
  created documents.
- `git ls-files --others --exclude-standard`, `git diff --name-only`, and `git status --short`
  confirmed that only the three authorized untracked documents exist and no tracked file changed.

Observed HTTP outcomes:

- exact `.us` roster: `200`, HTML, no redirect;
- obsolete `www3` roster: `403`;
- `.gov` direct command-line request: Cloudflare `403`, while the normal browser path loaded;
- `.us/robots.txt`: `404` (absence of rules is not an authorization grant);
- synthetic no-match search: ambiguous application `200`; and
- synthetic invalid `sysid`: `500` without detail markers.

## 17. Real-person data confirmation

No identifiable real-person data was saved, copied, printed into repository files, placed in a
fixture, written to logs, included in terminal summaries, or included in this handoff. No raw roster
response, screenshot, HAR, PDF, cookie, session value, or live query identifier was persisted.

## 18. Change-scope confirmation

No application code, test, package, lockfile, migration, workflow, environment file, fixture,
existing policy document, database, route, sitemap, robots behavior, canonical, UI, or ingestion
configuration was changed. No live ingestion ran. No real record was persisted. No county or state
was activated. No remote was configured. No commit, push, deployment, or Phase 2B implementation
occurred.

## 19. Requirements before Scott County may be reconsidered

1. Require an official institution to supply or document a complete current-custody feed and its
   complete enumeration, caps, partitions, pagination, and non-letter behavior.
2. Accept an official or deterministic technical signal that distinguishes a valid zero roster from
   database/application failure.
3. Approve the exact source classification, official-link evidence record, source URL, and exact
   host/path allowlist.
4. Approve collection permission assumptions, request cadence, maximum list/detail request budget,
   concurrency, timeouts, retry/backoff, and `Retry-After` handling.
5. Approve a production-egress/WAF verification plan that does not bypass controls.
6. Approve `sysid` handling and evidence for multiple-booking/list-detail identity behavior.
7. Approve the source-local timestamp timezone/DST rule or a raw-local-time representation.
8. Approve the minimum stored and publicly displayed fields, including whether booking number and
   committing agency are proportionate; keep case number and rejected personal fields excluded
   unless separately reviewed.
9. Approve exact bond mappings for `No Bond`, zero monetary, missing/unpublished/unknown values,
   currency, row order, and booking-only ownership.
10. Approve current-only retention, superseded-snapshot deletion, backup behavior, and explicit
    non-retention of recent releases.
11. Approve the Scott-specific synthetic fixture design, parser-version plan, structural invariants,
    drift monitoring, false-zero alerts, and failure classifications.
12. Name the accountable human source-policy reviewer for any later source/adapter approval.

Until the complete-feed, enumeration/cap, and deterministic empty/failure requirements are all met
and a new Phase 2B decision is explicitly authorized, Scott County is not eligible for Phase 2B. The
correct next action is to stop for review.
