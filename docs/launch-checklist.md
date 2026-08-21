# Phase 1 handoff and launch checklist

## Status of this checklist

This is a Phase 1 completion gate, not authorization to launch. Phase 1 ends with a synthetic
local/test vertical slice, documented evidence, screenshots, and a review decision. Do not deploy,
connect to a real Scott County source, enable production ingestion, submit a sitemap, configure
production analytics, or begin later-phase work without explicit approval.

Use `Pass`, `Fail`, or `Not applicable` with a link to evidence for each item. A verbal assurance is
not evidence. Any failed release-blocking item keeps Phase 1 open.

## 1. Scope and repository safety

- [ ] Work remained inside the current repository.
- [ ] The prohibited unrelated project was not opened, searched, imported, linked, or used as a
      reference.
- [ ] No previous product code, content, assets, tokens, routes, fixtures, analytics, redirects,
      sitemap logic, or deployment workflow was reused.
- [ ] The workspace contains Iowa only and exactly one synthetic Scott County vertical slice.
- [ ] No inactive-state or inactive-county route, record, placeholder, navigation item, fixture
      geography, or sitemap entry was generated.
- [ ] `BRAND_NAME` and `PRODUCTION_DOMAIN` remain required configuration; fixtures use
      `https://example.test`.
- [ ] Production startup rejects missing/default/placeholder/phase-one/example cursor and correction
      HMAC secrets; both secrets are explicitly supplied outside the repository.
- [ ] No permanent name, production domain, staff identity, credential, award, affiliation, or legal
      claim was fabricated.
- [ ] No commit, push, deployment, live endpoint request, or production service configuration
      occurred without separate authorization.

## 2. Required documentation

- [ ] `docs/product-principles.md`
- [ ] `docs/architecture.md`
- [ ] `docs/seo-indexation-contract.md`
- [ ] `docs/source-publication-policy.md`
- [ ] `docs/data-provenance.md`
- [ ] `docs/editorial-policy.md`
- [ ] `docs/design-system.md`
- [ ] `docs/accessibility.md`
- [ ] `docs/privacy-and-retention.md`
- [ ] `docs/threat-model.md`
- [ ] `docs/launch-checklist.md`
- [ ] Documents agree on Phase 1 synthetic-only scope, publication gates, route contract, timestamp
      semantics, failure classes, and later-phase approvals.

## 3. Workspace and engineering baseline

- [ ] pnpm workspace contains `apps/web`, `apps/ingest-worker`, `packages/domain`,
      `packages/database`, `packages/source-adapters`, `packages/editorial`, `packages/ui`, and
      `packages/test-fixtures`.
- [ ] Next.js uses the stable App Router baseline selected and recorded during Phase 1.
- [ ] TypeScript strict mode is enabled across the workspace with no unexplained suppression.
- [ ] PostgreSQL and Drizzle schema compile; migrations are versioned, deterministic, and checked
      into the repository.
- [ ] Zod validates environment variables, route/API input, correction input, external artifacts,
      adapter output, and database-facing normalized payloads.
- [ ] Web, worker, shared packages, and migrations have one-way dependency boundaries documented in
      architecture.
- [ ] Web visitor requests cannot import or invoke source fetching/parsing code.
- [ ] Data refresh can execute independently from build/deployment.
- [ ] Server Components are the default and client components have a documented interaction need.
- [ ] Loading, error, not-found, and empty boundaries are explicit and accessible.

## 4. Schema and provenance

- [ ] Schema models `State`, `County`, `Facility`, `OfficialInstitution`, `OfficialSource`,
      `SourceEvidence`, `SourceAdapter`, `IngestRun`, `CustodySnapshot`, `Booking`,
      `PersonDisplayRecord`, `Charge`, `BondEntry`, `Contact`, `Operation`, `EditorialBlock`,
      `EditorialEvidence`, `PublicationReview`, and `CorrectionRequest`.
- [ ] Foreign keys and transactions prevent orphaned or cross-booking charges and bonds.
- [ ] Multiple charges and multiple bond entries remain distinct.
- [ ] Bond status separates monetary, no bond, information not published, unknown, and not
      applicable.
- [ ] Missing bond information never normalizes to no bond.
- [ ] Booking identifiers are displayed only when the modeled source explicitly identifies them as
      booking identifiers.
- [ ] Current custody, recent release, historical booking, and arrest report are separate scopes.
- [ ] Valid empty, source request failure, parser failure, and stale snapshot are separate states.
- [ ] Source records include URL/type, institution URL, relationship-evidence URL/description,
      verification/check/success/error fields, parser version, status, custody scope, and retention
      scope.
- [ ] Visible freshness dates map to real modeled events, not build/request times.
- [ ] Editorial, facility, contact, and operation facts require evidence references.
- [ ] Retention jobs and public-display selection cannot create a booking-history archive.

## 5. Source adapter contract

- [ ] Interface explicitly covers fetch, validate, parse, normalize, health check, empty-result
      interpretation, and failure classification.
- [ ] Phase 1 adapter uses synthetic artifacts only and makes no live request.
- [ ] Fetch contract takes an approved source identifier rather than arbitrary visitor URL.
- [ ] Safe-fetch policy requires HTTPS, exact host/port and redirect allowlists, public IP
      destinations, and response/time/content limits.
- [ ] No behavior bypasses WAF, CAPTCHA, authentication, robots, rate limit, or access control.
- [ ] Parser and adapter versions are recorded with ingest runs/snapshots.
- [ ] A failed run cannot partially replace the last successful snapshot.
- [ ] Source-specific fixtures and regression tests cover every modeled result/failure state.

## 6. Synthetic-data controls

- [ ] Every person and identifier is clearly fictional and non-real.
- [ ] Fixtures contain no copied live roster HTML, real booking data, real contact metadata, or live
      endpoints.
- [ ] Fixed dates are deterministic and labeled synthetic; no fixture timestamp can appear as a real
      verification event.
- [ ] Synthetic cases exercise current custody, recent release, multiple charges, monetary bond,
      explicit no bond, missing/not-published/unknown bond, valid empty, stale source, request
      failure, and parser failure.
- [ ] Fixtures carry an explicit synthetic marker.
- [ ] Production build/startup/seed paths fail closed when synthetic markers or fixture packages are
      present.
- [ ] CI scans fixtures for likely real personal data and forbidden deployment configuration.

## 7. Design checkpoint

- [ ] Development-only lab implements Wayfinder, Evidence Ledger, and Clear Field using the same
      specimen content.
- [ ] Every direction demonstrates header, county identity, source/freshness, desktop roster row,
      mobile roster card, primary/secondary buttons, alert states, contact information, and footer.
- [ ] Desktop and mobile Playwright screenshots exist for each direction or a clearly separated
      composite.
- [ ] Wayfinder is recorded as the approved Phase 2 working direction for task hierarchy, freshness
      comprehension, and mobile scanning, without treating it as final production UX.
- [ ] Wayfinder tokens match `docs/design-system.md`, including canvas/ink/action/focus/status
      colors, system typography, 4px spacing base, radii, 44px controls, breakpoints, and motion.
- [ ] Lab route is disabled at route-registration/build level in production.
- [ ] Lab route has no internal production link, canonical, structured data, or sitemap entry.

## 8. Public information architecture

- [ ] Home prioritizes identity/purpose, county finder, verified coverage, evidence/freshness
      explanation, small active list, methodology/corrections, and a minimal footer.
- [ ] `/coverage/` and `/coverage/iowa/` list only actually published coverage.
- [ ] Iowa coverage presents active coverage, source health, last verification, county finder, and a
      concise “verified” explanation without generic legal filler.
- [ ] County page follows the documented user-task order and uses one meaningful `h1`.
- [ ] No fixed section/FAQ quota or repeated phone-number answers exists.
- [ ] Trust pages are substantive: About, Methodology, Source Policy, Corrections, Privacy, Terms,
      and Disclaimer.
- [ ] Public copy clearly states independent operation and avoids government ownership, endorsement,
      legal authority, or legal-advice implications.
- [ ] Synthetic county content is restricted to development/test and is not a production publication
      record.
- [ ] Unpublished states/counties return genuine `404` responses, not placeholders.
- [ ] Inactive `/coverage/iowa/` is noindex in development and returns a genuine production `404`
      until an Iowa county passes publication review.

## 9. Roster and load-more contract

- [ ] First 25 current-custody records appear in server-rendered HTML with JavaScript disabled.
- [ ] Roster personal data is inside a suitable `data-nosnippet` container.
- [ ] Ordering is stable and deterministic within an immutable snapshot.
- [ ] Cursor is opaque, integrity protected, source/snapshot scoped, and contains no readable
      personal data.
- [ ] JSON endpoint validates source ID, cursor, and limit; maximum limit is 25.
- [ ] Rate limiting works in the target runtime model and has accessible retry behavior.
- [ ] Load-more uses a native button, no cursor anchor, no URL/history update, and no full reload.
- [ ] Loading, appended-count, retry, and end-of-results announcements work without duplicate
      live-region speech.
- [ ] Appended results do not repeat article, contacts, sources, questions, or other editorial
      content.
- [ ] API success and error responses send `X-Robots-Tag: noindex, nofollow, nosnippet`.

## 10. SEO and indexation

- [ ] One self-referencing canonical URL is generated from validated `PRODUCTION_DOMAIN` for each
      public page.
- [ ] County HTML pagination/cursor/sort parameters redirect to the clean canonical route.
- [ ] Numbered/page child routes do not exist.
- [ ] Titles and descriptions are unique, useful, and free of keyword/location variants.
- [ ] Sitemap uses an explicit public-route allowlist plus reviewed publication records.
- [ ] Sitemap excludes API, search, design lab, cursors, filters, preview, errors, synthetic
      records, and unpublished geography.
- [ ] `/find/`, if implemented, is noindex and absent from sitemap.
- [ ] Preview and staging send site-wide `X-Robots-Tag: noindex, nofollow`.
- [ ] Production approved public pages do not carry site-wide header/meta noindex.
- [ ] A `next build` + `next start` smoke suite proves development routes and inactive Iowa are 404,
      public utility pages remain indexable, and the sitemap exactly matches its allowlist.
- [ ] Production `robots.txt` is only a crawl hint; HTML metadata, `X-Robots-Tag`, and route absence
      enforce indexation policy.
- [ ] Structured data contains only truthful visible `WebSite`, independent publisher
      `Organization`, appropriate page type, and visible breadcrumbs.
- [ ] No government publisher type, person roster schema, ratings/reviews, legal-service schema,
      unsupported custody type, hidden data, or FAQ markup exists.

Expected production indexable allowlist once real data and Phase 3 approval exist:

```text
/
/coverage/
/coverage/iowa/
/iowa/scott-county/custody/
/about/
/methodology/
/source-policy/
/corrections/
/privacy/
/terms/
/disclaimer/
```

Expected noindex or production-unreachable classes:

```text
/api/**
/find/** (if implemented)
development design lab
preview/staging responses
cursor/filter/sort variants
unpublished geography
errors and synthetic fixtures
```

## 11. Accessibility

- [ ] WCAG 2.2 AA target is documented and applied across mobile/desktop.
- [ ] Skip link, landmarks, heading structure, breadcrumbs, labels, status text, and one-H1 contract
      pass review.
- [ ] Keyboard-only flows work for county finding, roster review/load-more, source links, contacts,
      and correction form.
- [ ] Focus indicators are visible and not obscured by sticky content.
- [ ] Status, bond meaning, and errors do not rely on color/icon alone.
- [ ] Roster table/cards preserve labels, relationships, DOM order, and screen-reader meaning across
      breakpoints.
- [ ] Form errors use summary, field association, retained safe input, and focus management.
- [ ] Layout reflows at 320px and 400% zoom; text-spacing overrides do not clip content.
- [ ] Reduced-motion, forced-colors, touch-target, and high-contrast behavior pass manual review.
- [ ] Axe scans pass for representative home, coverage, county, trust, corrections, error, and all
      design directions at mobile and desktop sizes.
- [ ] At least two screen-reader/platform combinations cover core flows before production approval.

## 12. Performance

- [ ] Mobile test conditions are documented (device/viewport, network/CPU shaping, dataset, build
      mode, and run count).
- [ ] LCP target is below 2.5 seconds in those conditions.
- [ ] CLS is below 0.1; server roster and status reserve stable layout.
- [ ] Client JavaScript is limited to necessary enhancements and bundle output is reviewed.
- [ ] No blocking third-party script, advertising, late roster injection, or decorative heavyweight
      media exists.
- [ ] Fonts are local/system or optimized with stable fallback metrics; images have explicit
      dimensions and responsive behavior.

## 13. Security and privacy

- [ ] Environment validation fails on missing/invalid brand, origin, database, environment class,
      and runtime-specific secrets.
- [ ] CSP and standard security headers pass on HTML, API, redirect, `404`, and error responses.
- [ ] Server-side input validation and output escaping/sanitization cover every external boundary.
- [ ] SSRF tests cover scheme, credentials, ports, IPv4/IPv6 private/link-local/metadata ranges,
      DNS/redirect behavior, byte/type/time limits, and allowlist drift.
- [ ] Correction form has accessible non-puzzle spam protection, origin/CSRF control as needed, size
      limits, and distributed rate limiting design.
- [ ] Logs use route templates and redaction; canary tests prove no roster values, raw source
      content, correction body/email, cookies, or secrets appear.
- [ ] Web, worker, correction, and migration database roles are designed for least privilege.
- [ ] No secret appears in a client bundle, Git-tracked environment file, test artifact, screenshot,
      or CI log.
- [ ] Dependency, workflow, and secret scanning pass.
- [ ] Retention policy is enforced for roster snapshots, corrections, logs, artifacts, and later
      backups.
- [ ] No ads, behavioral profiles, or production analytics exist in the MVP.

## 14. Required automated proof

- [ ] Unit and contract tests distinguish valid empty, request failure, parser failure, and stale
      data.
- [ ] Tests preserve multi-charge and multi-bond ownership and bond-status meanings.
- [ ] Tests distinguish current custody from recent release.
- [ ] Route tests prove numbered pages do not exist and inactive geography is `404`.
- [ ] Canonical tests prove pagination/cursor normalization and exactly one county canonical.
- [ ] No-JavaScript test proves the first 25 rows are present.
- [ ] Load-more test proves append behavior, no editorial repetition, announcements, retry, and
      completion.
- [ ] Header/sitemap tests prove API/search/lab/fixtures/inactive routes are excluded and API is
      noindex.
- [ ] Environment tests prove preview noindex and production not accidentally noindex.
- [ ] Structured-data test compares JSON-LD with visible page content.
- [ ] Fixture scan proves no real inmate personal data.
- [ ] Keyboard, screen-reader semantics, desktop/mobile axe, and responsive layout tests pass.

Record the exact commands and results in the handoff. At minimum include install/frozen-lockfile
validation, lint, strict typecheck, unit/contract tests, migration validation, production build,
Playwright desktop/mobile/no-JavaScript suites, axe suites, dependency scan, secret scan, and any
performance command actually run. Do not report a command that was not executed.

## 15. Phase 1 evidence package

- [ ] Architecture summary explains system boundaries and independent data refresh.
- [ ] Major design decisions include source/failure semantics, data model, RSC/client split, cursor
      design, indexation, privacy, and design direction.
- [ ] Approved Phase 2 working direction is Wayfinder with evidence from desktop/mobile review;
      final production UX remains subject to later validation.
- [ ] Complete repository file list is generated from the current workspace.
- [ ] Commands run are listed exactly with exit status.
- [ ] Test results include counts, skipped tests, failures, environment, and relevant limitations.
- [ ] Screenshot paths are clickable and identify concept and viewport.
- [ ] Indexable route list and noindex/unreachable route classes are explicit.
- [ ] Known risks distinguish Phase 1 implementation risk from later live-source risk.
- [ ] Approval decisions are listed with owner/phase.
- [ ] Review packet contains no real personal data or secrets.

## 16. Required stop and approval decisions

After all Phase 1 checks pass, stop for review. Do not infer approval from test success.

Explicit approval is required for Phase 2, including:

- official Scott County institution and roster candidate;
- documentary relationship evidence;
- permission/access and robots/technical-protection review;
- live endpoint verification plan;
- source-specific retention and freshness thresholds;
- field-by-field mapping and allowed fields;
- sanitized source fixtures and parser regression plan; and
- human source-policy reviewer.

Explicit approval is required later for Phase 3, including:

- accountable operator and public contact;
- permanent brand and production domain;
- production database roles, region, migrations, backup, and recovery;
- correction, log, roster, artifact, and backup retention periods;
- monitoring, incident response, platform logging, and on-call ownership;
- privacy/legal review and infrastructure vendor disclosure;
- analytics choice or documented decision to omit it;
- Search Console and sitemap submission;
- production deployment and post-deploy accessibility, header, canonical, sitemap, source, and
  synthetic-data verification.

Until both later approvals occur in sequence, the product remains an undeployed, synthetic Phase 1
implementation.
