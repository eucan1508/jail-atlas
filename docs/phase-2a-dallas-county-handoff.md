# Dallas County Phase 2A handoff

## 1. Overall eligibility decision

**ELIGIBLE FOR PHASE 2B**

Dallas County has a verified official institution-to-source relationship and a working HTTPS
current-custody query. The source returns server-rendered records with explicit custody status,
source-specific `No data`, observable pagination, explicit booking headings, and booking-local
charge and bond tables.

This decision authorizes nothing automatically. A separate approval is required before writing the
adapter or fictional fixtures. Dallas County remains unpublished, Iowa remains inactive in
production, and no real data may be persisted. Wayfinder remains a working direction, not final UX.

## 2. Official institutional URL

- Institution: Dallas County Sheriff's Office
- Official URL: `https://www.dallascountyiowa.gov/502/Sheriffs-Office`
- Official jail/evidence page: `https://www.dallascountyiowa.gov/364/Jail-Division`
- Official roster routing path: `https://www.dallascountyiowa.gov/365/Inmate-Search`

## 3. Live roster URL

`https://inmates.dallascountyiowa.gov/NewWorld.InmateInquiry/dallas?InCustody=True`

The exact HTTPS URL returned `200`, `text/html; charset=utf-8`, no redirect, and a nonempty
server-rendered current result during the audit.

## 4. Official evidence chain

```text
Dallas County Sheriff's Office (.gov)
  -> Jail Division (.gov)
  -> Inmate Roster
  -> /365/Inmate-Search (.gov)
  -> Dallas County Inmate Inquiry (.gov subdomain)
```

The official internal routing path currently emits an HTTP destination. The HTTPS version of the
same inquiry host/path was independently verified and must be the only worker source. The source
must never follow the downgrade.

## 5. Source type and custody scope

- Responsible institution: Dallas County Sheriff's Office.
- Proposed type: officially linked vendor application on a Dallas County government subdomain.
- Vendor indication: Tyler Technologies / NewWorld InmateInquiry branding in the application.
- Proposed product scope: records returned by the exact `InCustody=True` query.
- Explicit list state: `Yes` under `In Custody` for every observed current row.
- Excluded scope: released/historical booking sections contained in detail history.

The returned count is a count of source records only. It must not be called total jail population or
a guaranteed census of every person physically held.

## 6. Working fetch mechanism

The source is a server-rendered HTML GET flow:

- list: `/NewWorld.InmateInquiry/dallas?InCustody=True`;
- pagination: the same path with validated retained filters and `Page={integer}`;
- detail: `/NewWorld.InmateInquiry/dallas/Inmate/Detail/{source locator}`; and
- empty renderer: validated results table containing literal `No data`.

No JavaScript execution, CAPTCHA, authentication, supplied cookie, prior session, iframe, PDF, CSV,
or JSON roster transport was required. The parser must not execute scripts or fetch photographs.

## 7. Required allowlisted hosts

No host is yet approved in code. The smallest candidate roster allowlist is:

- `inmates.dallascountyiowa.gov` — exact HTTPS host, port 443, reviewed list/detail path prefix,
  `includeSubdomains: false`, redirects disabled.

`www.dallascountyiowa.gov` is evidence-only and is not needed in the adapter fetch allowlist. No
image, asset, Tyler, CDN, wildcard, alternate scheme, or parent-domain allowance is justified.

Point-in-time DNS checks returned public-address classes only. Production transport must still bind
the validated resolution at connection time and fail on drift or nonpublic addresses.

## 8. Proposed adapter/parser type

Use a dedicated two-stage HTML adapter, provisionally `dallas-newworld-inmate-inquiry`:

1. fetch and validate the exact current list and every emitted page;
2. parse explicit current list records and transient detail locators;
3. fetch the minimum necessary detail documents under an approved serial/low-concurrency budget;
4. select only booking sections meeting the approved current-booking invariant;
5. preserve ordered charge and booking-level bond rows;
6. validate exact empty markers and classify all other zeroes as unexpected;
7. normalize only reviewed fields; and
8. reject partial pagination, detail failure, history leakage, ambiguity, or schema drift.

The existing `SourceAdapter` stage contract is suitable. The Phase 1 network implementation is not;
Phase 2B needs connection-bound DNS and redirect enforcement before any adapter can make a live
request.

## 9. Fields approved for possible Phase 2B normalization

Candidate fields, pending the decisions in section 19:

- source-faithful display name;
- explicit current-custody status;
- source-labeled booking identifier for booking distinction;
- booking date after timezone approval;
- ordered current-booking charge descriptions; and
- ordered current-booking bond entries using exact source type mappings.

This is permission to design fictional fixtures only after approval, not permission to persist live
values.

## 10. Fields rejected or still unconfirmed

Rejected from the initial scope:

- photographs;
- subject/person number and detail path locator;
- race, gender, height, weight, and address;
- historical/released booking persistence;
- court dates, docket numbers, offense dates, sentence data, and disposition;
- bond number and booking total bond/bail fields; and
- fabricated source-update timestamps.

Still unconfirmed or conditional:

- timestamp timezone/DST mapping;
- more than one simultaneously active booking;
- population-wide current-booking selection consistency;
- additional bond types and missing-table meaning;
- ISO currency mapping;
- agency-field necessity; and
- safe request cadence and detail-page budget.

## 11. Bond semantics

The source nests a table with `Bond Number`, `Bond Type`, and `Bond Amount` inside a booking.

- Multiple rows in one booking were observed and must remain separate.
- No charge/case key was present; rows attach only to the booking.
- Exact `NO BOND` was observed and is distinct from monetary types.
- `CASH ONLY` and `CASH/SURETY` were observed with positive amounts.
- Zero alone never means `No Bond`.
- Missing data remains `unknown`; it never becomes `no_bond`.
- Dollar display lacks an ISO code; USD mapping requires approval.
- Source totals are omitted initially and never replace individual rows.

## 12. Pagination and false-zero safeguards

The current query returned 78 unique records and no pager at audit time. A separate structural
pagination check observed 100 records on a page and `Page={integer}` navigation. A future adapter
must follow only source-emitted next links while preserving exact current scope and must reject
duplicates, gaps, filter loss, unexpected extra parameters, and partial completion.

The source rendered literal `No data` with application identity, current control, and expected
headers for a conspicuously synthetic no-match and for an out-of-range current page. Neither is a
whole-roster zero.

Only page 1 of the exact unfiltered current query can become `valid_empty`, and only with all
identity/table markers, literal `No data`, no record/pager links, and no other search filter. A
missing table or zero DOM match is parser failure. Sudden zero after a nonempty snapshot must be
quarantined by anomaly policy.

## 13. Production risks

- The official county routing path downgrades to HTTP; workers must bypass that route and use the
  exact reviewed HTTPS source directly.
- Neither host advertised HSTS during the audit.
- Production/serverless egress was not tested.
- Request limits and update cadence are unpublished.
- Full charge/bond ingestion requires detail-page fan-out.
- Current results may later exceed one page.
- Source response and label schema can drift without versioning.
- The source exposes no update timestamp, `ETag`, or `Last-Modified`.
- Source dates have no displayed timezone.
- Detail history can leak released bookings if selection is wrong.
- Empty, page-boundary, and source-failure states require fail-closed validation.
- Source fields include unnecessary high-risk demographics and photographs.

Ordinary CI must use only fictional structural fixtures. No live source request belongs in CI.

## 14. Evidence-packet conflicts

Not applicable. No Dallas County evidence packet was supplied. Official Dallas County pages and the
officially routed inquiry were independently inspected; no packet or legacy project was used as
authority.

## 15. Files created

Only these new research documents were created:

- `docs/research/dallas-county-iowa-source-audit.md`
- `docs/research/dallas-county-iowa-field-matrix.md`
- `docs/phase-2a-dallas-county-handoff.md`

No existing Scott County or Phase 1 document was modified.

## 16. Read-only commands and requests performed

Repository review:

- verified clean branch and baseline commit;
- read source-publication, provenance, editorial, privacy, threat, indexation, architecture, launch,
  handoff, adapter, domain, publication, network, and synthetic-fixture contracts; and
- inspected no file outside the current repository except the previously supplied Phase 2A
  instruction attachment.

Official-source discovery and validation:

- searched for candidates but promoted claims only after opening official institution pages;
- opened the official Dallas County Sheriff's Office and Jail Division pages;
- verified the official inmate-routing path and its redirect behavior;
- made bounded GET requests to the HTTPS inquiry root, current filter, synthetic no-match,
  pagination shapes, and a minimized set of detail structures;
- emitted only metadata, aggregate counts, labels, structural booleans, generalized shapes, and bond
  enumeration categories;
- checked source/official `robots.txt` behavior;
- classified DNS results without recording addresses; and
- did not load source photographs, execute scripts, or save source bodies.

Linn County's officially linked roster was rejected after it presented a CAPTCHA. No bypass was
attempted. The unrelated `county-jail` project was not opened or used.

## 17. Real-person data confirmation

No identifiable person name, photograph, address, demographic value, booking identifier, subject
number, charge value, case/docket number, bond amount, custody date, detail locator, raw response,
cookie, or session material was saved to the repository, fixture, document, log, screenshot, or
final handoff output.

Live values existed only transiently in memory for the minimum structural checks and were discarded.

## 18. Change-scope confirmation

No application code, test, package, lockfile, migration, workflow, environment file, fixture,
database, route, sitemap, robots behavior, canonical, UI, or ingestion configuration was changed. No
live ingestion or database write ran. No real record was persisted. No county or state was
activated. No remote was configured. No commit, push, deployment, or Phase 2B implementation
occurred.

## 19. Decisions requiring human approval before Phase 2B

1. Approve Dallas County as the replacement Iowa Phase 2B candidate and approve this evidence set.
2. Approve `officially_linked_vendor` classification and the exact institution/relationship records.
3. Approve direct HTTPS source configuration despite the official routing endpoint's HTTP downgrade;
   require redirects disabled and exact-host/path validation.
4. Approve implementation of the connection-bound DNS-validating transport before source fetching.
5. Approve the source-specific list identity, page, empty, duplicate, and failure invariants.
6. Approve the sampled current-booking selector and fail-closed multiple-booking cases.
7. Approve the minimum field set and continued exclusion of demographics, photos, released history,
   court details, source locators, and totals.
8. Approve exact bond mappings, missing/unknown behavior, booking-only ownership, and currency rule.
9. Approve Dallas source-local timezone/DST handling or require booking time to remain null.
10. Approve current-only retention and deletion timing for replaced or absent records.
11. Approve a descriptive user agent, list/detail request budget, concurrency, cadence, timeout,
    retry/backoff, and `Retry-After` behavior.
12. Approve wholly fictional, hand-authored fixtures and parser versioning; prohibit live-derived
    fixtures.
13. Name the accountable human source-policy reviewer for adapter approval.

The next permitted step, only after those decisions are approved, is Phase 2B adapter and fictional
fixture implementation. Publication, real persistence, Iowa activation, deployment, and production
ingestion remain later gates.
