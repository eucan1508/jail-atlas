# Source and publication policy

## Scope

This policy governs whether a county custody page may exist publicly. It applies to roster sources,
facility and contact facts, operational guidance, editorial evidence, adapter behavior, and human
publication review.

The rule is intentionally conservative: no county page is better than a thin, stale, ambiguous, or
weakly sourced page. An unpublished county returns a genuine `404`; it does not receive a
placeholder, “coming soon” page, search landing page, or sitemap entry.

Phase 1 is synthetic-only. The Scott County vertical slice demonstrates policy behavior but is not
approved for publication and must not be deployed. Phase 2B contains a reviewed Dallas County
adapter implementation and wholly fictional parser fixtures, but the adapter is not registered for
execution and no source, county, state, or route is approved for publication.

## Eligible sources

An information source is eligible only when it is operated by one of these institutions:

- an official county government;
- an official county sheriff;
- an official jail or detention center;
- an official public detention authority; or
- a vendor portal explicitly linked or embedded by one of those official institutions.

A government-like appearance, vendor domain, search result, link from an unrelated site, or common
use by third parties is not proof. The relationship from the official institution to the roster must
be captured as documentary evidence.

Ineligible factual sources include third-party inmate directories, arrest aggregators, scraped
booking sites, SEO directories, attorney marketing sites, bail-bond directories, social posts
without official ownership evidence, search-result snippets, and secondary summaries.

Source acquisition must not bypass access controls, authentication, WAFs, CAPTCHAs, robots
restrictions, rate limits, or other technical protections.

## Required source record

Every `OfficialSource` must store and validate:

- source URL;
- source type;
- official institution URL;
- relationship-evidence URL;
- a plain-language evidence description;
- `verified_at`;
- `last_checked_at`;
- `last_success_at`;
- `last_error` as a redacted operational summary or `null`;
- parser version;
- source status;
- custody-data scope; and
- retention scope.

Related evidence records store page title, responsible institution, purpose, capture or verification
time, reviewer, immutable content fingerprint or approved archive reference where lawful, and any
vendor involvement. Evidence must be reviewable without treating a vendor page as its own authority.

## Publication gates

A county may be marked `published` only when one review confirms all gates below for the exact
county, source, adapter version, and editorial version.

### Source and relationship

- A working current-custody roster exists.
- The source is operated by an eligible official institution or an eligible vendor with documented
  official linkage or embedding.
- The institution-to-roster relationship has documentary evidence.
- The source purpose and custody scope are unambiguous enough for truthful user-facing language.
- Collection is permitted without bypassing technical or policy controls.

### Live behavior and adapter

- A live fetch has succeeded within the approved verification window.
- The source-specific adapter has explicit fetch, validate, parse, normalize, health-check,
  empty-interpretation, and failure-classification behavior.
- Fixtures cover representative nonempty and source-specific empty responses.
- Regression tests protect field mapping, multiple charges, multiple bonds, identifiers, dates, and
  failure modes.
- Parser version and fixture provenance are recorded.
- A valid empty response cannot be confused with fetch or parser failure.

### Data meaning and retention

- Field-level provenance is documented.
- Custody scope distinguishes current custody from any recent-release, historical-booking, or
  arrest-report data.
- Release data is retained no longer than the approved official scope and documented retention
  policy.
- Booking identifiers are retained only if explicitly labeled as booking identifiers by the source.
- Missing bond data cannot become `no bond`.
- Sanitization and structured-log redaction have been verified.

### County usefulness

- Official facility and contact information has been verified.
- Operational guidance is county-specific, useful, and supported by evidence.
- Visible source information names the institution, page title, purpose, verification date, vendor
  role, and official relationship evidence.
- Freshness messages accurately reflect recorded events.
- The page contains no unsupported legal conclusions, repeated filler, invented questions, or
  fabricated details.

### Human review and technical release

- A human publication review records decision, timestamp, review scope, evidence set, source and
  parser versions, editorial version, and reviewer identity as an internal accountable actor.
- Accessibility, indexation, privacy, security, and end-to-end publication checks pass.
- The canonical route, sitemap entry, and navigation link are enabled from the same reviewed
  publication state.
- Production is configured for real approved data; synthetic flags and records are absent.

No single ingestion success, passing parser test, editorial approval, or database flag may bypass
the complete gate.

## Source lifecycle

Recommended source states are:

- `candidate`: identified but not approved or fetched;
- `evidence_review`: official relationship and scope under review;
- `adapter_development`: source-specific implementation and fixtures in progress;
- `ready_for_review`: technical checks complete, human decision pending;
- `approved`: eligible for ingestion and publication review;
- `degraded`: temporarily failing or stale while a last successful snapshot may remain displayable;
- `suspended`: collection or display stopped pending investigation;
- `retired`: no longer an approved source.

County publication state is separate (`draft`, `approved`, `published`, `withdrawn`). A source may
be approved without its county being published, and degrading a source must not silently unpublish
or mislabel its data. Display policy depends on failure class, snapshot age, sensitivity, and the
approved freshness threshold.

## Empty and failure semantics

An adapter may return `valid_empty` only when:

1. the HTTP and content response is valid for that source;
2. the source’s expected structure and identity markers are present;
3. source-specific evidence says the response represents zero in-scope records; and
4. validation and parsing complete without warnings that could hide records.

An empty DOM selection, missing table, changed heading, blocked response, login page, generic error
page, timeout, or parse exception is never a zero roster.

Fetch failures describe inability to obtain an approved artifact. Parser failures describe inability
to interpret a received artifact. Both preserve the prior successful snapshot when allowed, record
the failure, advance `last_checked_at`, do not advance `last_success_at`, and trigger a
source-health response.

## Freshness and review

Each approved source defines expected update behavior, ingestion cadence, warning threshold, stale
threshold, and maximum display age. These values are evidence-based and may differ by source.
`last_checked_at`, `last_success_at`, `verified_at`, snapshot observation time, and editorial review
time are distinct timestamps.

Dates are never refreshed merely to make a page appear current. A human evidence review changes
`verified_at`; a successful live ingestion changes `last_success_at`; any attempted check changes
`last_checked_at`; a publication decision changes the review timestamp.

Material changes require re-review, including official institution or domain changes, source URL or
vendor changes, roster scope changes, parser changes that affect field meaning, facility/contact
changes, retention changes, or meaningful editorial revisions.

## Suspension and withdrawal

Suspend ingestion immediately when the source relationship becomes doubtful, collection appears
prohibited, redirects leave the approved allowlist, source content changes meaning, or personal data
falls outside the approved scope.

Withdraw the public county route when the publication gates can no longer be satisfied within the
documented incident policy, source authority is revoked, no valid current-custody source remains, or
retention risk makes continued display inappropriate. Withdrawal removes the route from navigation
and sitemap and returns a genuine `404`; it does not create a thin explanation page for the county.

## One-county approval process

New geography is never generated in bulk. Each county needs its own source evidence, adapter/fixture
set, field mapping, contacts, operational evidence, publication review, accessibility and indexation
checks, and explicit approval. Adding another state requires a separate approval process before
routes, seeded records, navigation, fixtures, or sitemap entries are created.
