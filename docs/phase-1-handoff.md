# Phase 1 handoff

Status: **conditional-acceptance hardening complete and stopped for review**. No deployment, commit,
push, live roster request, real custody data, Phase 2 source integration, or Phase 3 production
setup was performed.

## Architecture summary

The repository is a pnpm workspace with a Next.js 16 App Router web application, a separately
runnable ingest worker, and packages for the domain, PostgreSQL/Drizzle persistence, source
adapters, evidence-linked editorial content, original UI primitives, and synthetic fixtures.
External data is accepted only through Zod-validated, source-specific adapters. The web surface
never fetches a roster during a visitor request.

The Phase 1 Scott County page, roster endpoint, and design lab use custom development-only file
extensions. Next includes those extensions under `next dev` and excludes them from production
builds. The final production route manifest therefore contains no synthetic county page, synthetic
roster API, or design-lab route. The public production shell can be built without publishing the
prototype.

PostgreSQL is modeled with Drizzle and a versioned `0000_phase_one_foundation.sql` migration.
Ingestion and web deployment remain independent workflows. Phase 1 ingestion is fail-closed: network
access and database writes are disabled, and only a synthetic dry run is accepted.

The hardening pass resolves `drizzle-orm` 0.45.2, preserves the schema and migration, validates
production configuration before a Next server becomes ready, and requires both signing secrets to be
explicit and non-placeholder in production. Inactive Iowa coverage is noindex in development and a
genuine production `404`. A separate smoke runner performs `next build`, starts that artifact with
`next start`, and checks the actual HTTP contract.

## Major design decisions

- **Wayfinder is approved as the Phase 2 working direction, not final production UX.** It creates
  the clearest task order, keeps source scope and freshness together, retains obvious 44-pixel
  controls, and converts roster rows into readable mobile cards without changing the information
  sequence.
- **Evidence Ledger** is a viable provenance-dense alternative, but its documentary texture
  increases scanning effort.
- **Clear Field** lowers visual density, but the extra vertical space makes long custody lists
  slower to scan.
- Warm paper, evergreen ink/action colors, a purple focus ring, explicit semantic status colors, a
  four-pixel spacing rhythm, local system fonts, and reduced-motion handling form an original token
  system.
- Synthetic fixtures use `example.test`, fixed year-2000 timestamps, explicit test labels, fictional
  display records, and non-real identifiers. Fixture guards reject unsafe content and publication.
- Current custody, recent release, valid empty, stale, fetch failure, and parser failure are
  independent domain states. Charges and bonds remain child records; missing bond data never becomes
  “No Bond.”
- The first 25 records are server-rendered. A signed opaque cursor continues in batches of at most
  25 without URL/history changes or repeated editorial content.
- Public correction input uses server-side Zod validation, a signed form-age token, honeypot, size
  limits, and rate limiting. Synthetic mode validates but never stores or sends a request.
- Only allowlisted public source hosts and public resolved addresses are eligible for future adapter
  fetches. Logs omit personal fields and redact secrets, queries, and raw errors.

## Verification commands and results

Final successful commands:

```text
corepack pnpm install
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm test:a11y
corepack pnpm --filter @jail-atlas/database db:check
corepack pnpm audit --prod --audit-level moderate
```

`corepack pnpm` is the repository's pinned pnpm 10.15.1 invocation; it is equivalent to the
requested `pnpm` commands without installing a global shim.

Results:

- Prettier check: passed.
- ESLint: passed across all eight code workspaces.
- Strict TypeScript: passed across all eight code workspaces.
- Unit and contract tests: **91 passed**.
- Production-bundle smoke tests: **5 passed** after a dedicated `next build` + `next start`. The
  design lab, synthetic Scott County page, synthetic roster API, and inactive Iowa coverage each
  returned `404`; all nine approved utility pages remained free of noindex; and the sitemap matched
  its exact nine-route allowlist. Production search results retained explicit noindex/nofollow
  metadata.
- Next.js 16.3.1 production build: passed; synthetic county, roster API, and design lab are absent
  from the production route manifest.
- Playwright end-to-end: **26 passed** on desktop and mobile Chromium.
- Focused axe/WCAG A-AA suite: **8 passed**, including desktop/mobile roster, corrections, skip
  link, controls, and design lab.
- Drizzle schema/migration check: passed with `Everything's fine`; no database connection was used.
- Production dependency audit at moderate severity: passed with `No known vulnerabilities found`.
- Installed `drizzle-orm`: **0.45.2**; lockfile updated.
- Excluded-jurisdiction scan: no excluded jurisdiction appears in route, fixture, navigation,
  sitemap, or workflow source.
- Fixture safety: no real inmate PII detected by the synthetic guard.

The final tests prove the required no-page-2 and canonical behavior, no-JavaScript first 25 rows,
opaque pagination, retry and end announcements, API noindex headers, sitemap exclusions, genuine
inactive 404s, production startup rejection for missing/placeholder secrets, custody/error/bond
invariants, preview/production robots behavior, visible/structured-data agreement, keyboard
behavior, responsive reflow, and axe results.

Performance targets are documented as LCP below 2.5 seconds and CLS below 0.1 in documented mobile
test conditions. A production-like performance lab was not run because Phase 1 has no approved data
or deployment target; this remains a launch-checklist item rather than a claimed result.

## Screenshot paths

- `artifacts/design-lab/design-lab-desktop.png`
- `artifacts/design-lab/design-lab-mobile.png`
- `artifacts/design-lab/wayfinder-desktop.png`
- `artifacts/design-lab/wayfinder-mobile.png`
- `artifacts/design-lab/evidence-ledger-desktop.png`
- `artifacts/design-lab/evidence-ledger-mobile.png`
- `artifacts/design-lab/clear-field-desktop.png`
- `artifacts/design-lab/clear-field-mobile.png`

## Indexation contract at the Phase 1 stop

Production-indexable utility/trust routes, assuming an official-data production environment and the
configured production origin:

- `/`
- `/coverage/`
- `/about/`
- `/methodology/`
- `/source-policy/`
- `/corrections/`
- `/privacy/`
- `/terms/`
- `/disclaimer/`

Noindex, excluded, or unavailable routes:

- `/coverage/iowa/` — explicitly noindex in development and a genuine production `404` until an Iowa
  county passes publication review; absent from the sitemap.
- `/find/` and every search result — noindex and absent from the sitemap.
- `/corrections/submit/` — form-processing endpoint, never a search document.
- `/design-lab/` — development-only; absent from the production build and sitemap.
- `/iowa/scott-county/custody/` — development-only synthetic vertical slice; absent from the
  production build and sitemap until official approval.
- `/api/rosters/{sourceId}/` — development-only synthetic continuation endpoint; absent from the
  production build and sitemap. Development responses use `noindex, nofollow, nosnippet`.
- Cursor, sort, page, and other county query variants — development requests receive a permanent
  redirect to the clean county URL; no alternate document exists.
- Every preview/staging response — `X-Robots-Tag: noindex, nofollow, nosnippet`.
- Inactive state and county paths — genuine 404s.

Production `robots.txt` allows crawling and identifies the sitemap. It is not the noindex
enforcement layer: route absence, HTML metadata, and `X-Robots-Tag` enforce the policy. Roster API
responses retain `X-Robots-Tag: noindex, nofollow, nosnippet`, and APIs, search results, cursors,
and design routes are absent from internal anchor links and sitemaps.

The sitemap contains only the nine production-indexable paths above at the Phase 1 stop. It adds an
active state or county only after the publication gate reports a real approved record.

## Known risks

- No official Scott County evidence, endpoint, parser, field mapping, retention decision, contact,
  or editorial review exists. The county is therefore correctly unpublished.
- The migration and schema contracts passed, but no live PostgreSQL migration was applied in
  Phase 1.
- The in-memory web rate limiter is correct for the single-process prototype but needs a shared,
  atomic production store before horizontal deployment.
- CSP is restrictive and third-party-free, but Next hydration currently requires inline script/style
  allowances. A nonce-based production policy should be evaluated during production readiness.
- Correction persistence is implemented for official mode but has no approved production operator,
  database, notification workflow, retention job, or legal contact yet.
- Performance targets are specified but require production-like measurement after an approved data
  path and deployment environment exist.
- Scheduled ingestion deliberately cannot reach a network or database. Phase 2 needs connection-time
  DNS pinning, redirect revalidation, transactional idempotency, monitoring, and approved secrets.

## Decisions requiring approval

1. Approve a separate Scott County official-source evidence packet and source-policy review before
   any live verification.
2. Approve field-by-field parser semantics, freshness threshold, current/release scope, and
   retention window before persistence.
3. Approve verified facility contacts and county-specific operational evidence before publication.
4. Name an authorized production operator, publisher identity, production domain, correction owner,
   privacy contact, and legal reviewer before Phase 3.
5. Approve a shared rate-limit store, monitoring approach, nonce CSP approach, analytics decision,
   and production performance test conditions during Phase 3.

## Complete file list

Generated dependency folders, package build output, `.next`, transient Playwright diagnostics, and
TypeScript build-info files are excluded. Every authored/reviewed Phase 1 file is listed below.

```text
.env.example
.github/workflows/ci.yml
.github/workflows/scheduled-ingest.yml
.github/workflows/security.yml
.gitignore
.npmrc
.prettierignore
.prettierrc.json
README.md
apps/ingest-worker/package.json
apps/ingest-worker/src/cli-arguments.test.ts
apps/ingest-worker/src/cli-arguments.ts
apps/ingest-worker/src/cli.ts
apps/ingest-worker/src/config.test.ts
apps/ingest-worker/src/config.ts
apps/ingest-worker/src/execution-guard.test.ts
apps/ingest-worker/src/execution-guard.ts
apps/ingest-worker/src/job-runner.test.ts
apps/ingest-worker/src/job-runner.ts
apps/ingest-worker/src/jobs/synthetic-scott-county.ts
apps/ingest-worker/src/logger.test.ts
apps/ingest-worker/src/logger.ts
apps/ingest-worker/src/network-policy.test.ts
apps/ingest-worker/src/network-policy.ts
apps/ingest-worker/tsconfig.json
apps/ingest-worker/vitest.config.ts
apps/web/AGENTS.md
apps/web/CLAUDE.md
apps/web/next-env.d.ts
apps/web/next.config.ts
apps/web/package.json
apps/web/playwright.config.ts
apps/web/playwright.production.config.ts
apps/web/src/app/about/page.tsx
apps/web/src/app/api/rosters/[sourceId]/route.prototype.ts
apps/web/src/app/corrections/loading.tsx
apps/web/src/app/corrections/page.tsx
apps/web/src/app/corrections/submit/route.ts
apps/web/src/app/coverage/iowa/page.tsx
apps/web/src/app/coverage/page.tsx
apps/web/src/app/design-lab/page.dev.tsx
apps/web/src/app/disclaimer/page.tsx
apps/web/src/app/error.tsx
apps/web/src/app/find/page.tsx
apps/web/src/app/globals.css
apps/web/src/app/icon.svg
apps/web/src/app/iowa/scott-county/custody/page.prototype.tsx
apps/web/src/app/layout.tsx
apps/web/src/app/methodology/page.tsx
apps/web/src/app/not-found.tsx
apps/web/src/app/page.tsx
apps/web/src/app/privacy/page.tsx
apps/web/src/app/robots.ts
apps/web/src/app/sitemap.ts
apps/web/src/app/source-policy/page.tsx
apps/web/src/app/terms/page.tsx
apps/web/src/components/brand-mark.tsx
apps/web/src/components/breadcrumbs.tsx
apps/web/src/components/county-finder.tsx
apps/web/src/components/json-ld.tsx
apps/web/src/components/page-intro.tsx
apps/web/src/components/roster-explorer.tsx
apps/web/src/components/site-footer.tsx
apps/web/src/components/site-header.tsx
apps/web/src/components/trust-page.tsx
apps/web/src/instrumentation.ts
apps/web/src/lib/correction-security.ts
apps/web/src/lib/env.ts
apps/web/src/lib/publication.ts
apps/web/src/lib/rate-limit.ts
apps/web/src/lib/roster-contract.ts
apps/web/src/lib/roster.ts
apps/web/src/lib/site.ts
apps/web/src/proxy.ts
apps/web/tests/e2e/accessibility.mobile.spec.ts
apps/web/tests/e2e/accessibility.spec.ts
apps/web/tests/e2e/design-lab.mobile.spec.ts
apps/web/tests/e2e/design-lab.visual.spec.ts
apps/web/tests/e2e/indexation.spec.ts
apps/web/tests/e2e/roster.spec.ts
apps/web/tests/e2e/structured-data.spec.ts
apps/web/tests/e2e/support/contracts.ts
apps/web/tests/production/production-bundle.spec.ts
apps/web/tests/production/run-production-smoke.mjs
apps/web/tests/setup.ts
apps/web/tests/unit/environment-validation.test.ts
apps/web/tests/unit/geographic-scope.test.ts
apps/web/tests/unit/inactive-geography.test.ts
apps/web/tests/unit/robots-policy.test.ts
apps/web/tests/unit/synthetic-fixture-safety.test.ts
apps/web/tsconfig.json
apps/web/vitest.config.ts
artifacts/design-lab/clear-field-desktop.png
artifacts/design-lab/clear-field-mobile.png
artifacts/design-lab/design-lab-desktop.png
artifacts/design-lab/design-lab-mobile.png
artifacts/design-lab/evidence-ledger-desktop.png
artifacts/design-lab/evidence-ledger-mobile.png
artifacts/design-lab/wayfinder-desktop.png
artifacts/design-lab/wayfinder-mobile.png
compose.yaml
docs/accessibility.md
docs/architecture.md
docs/data-provenance.md
docs/design-system.md
docs/editorial-policy.md
docs/launch-checklist.md
docs/phase-1-handoff.md
docs/privacy-and-retention.md
docs/product-principles.md
docs/seo-indexation-contract.md
docs/source-publication-policy.md
docs/threat-model.md
eslint.config.mjs
package.json
packages/database/drizzle/0000_phase_one_foundation.sql
packages/database/drizzle/meta/_journal.json
packages/database/drizzle.config.ts
packages/database/package.json
packages/database/src/client.ts
packages/database/src/environment.ts
packages/database/src/index.ts
packages/database/src/schema.test.ts
packages/database/src/schema.ts
packages/database/tsconfig.json
packages/domain/package.json
packages/domain/src/corrections.ts
packages/domain/src/custody.test.ts
packages/domain/src/custody.ts
packages/domain/src/editorial.ts
packages/domain/src/geography.ts
packages/domain/src/index.ts
packages/domain/src/primitives.ts
packages/domain/src/sources.ts
packages/domain/tsconfig.json
packages/editorial/package.json
packages/editorial/src/index.ts
packages/editorial/src/provenance.test.ts
packages/editorial/src/provenance.ts
packages/editorial/src/publication-readiness.ts
packages/editorial/tsconfig.json
packages/source-adapters/package.json
packages/source-adapters/src/contracts.ts
packages/source-adapters/src/index.ts
packages/source-adapters/src/registry.ts
packages/source-adapters/src/runner.test.ts
packages/source-adapters/src/runner.ts
packages/source-adapters/src/source-url-policy.test.ts
packages/source-adapters/src/source-url-policy.ts
packages/source-adapters/tsconfig.json
packages/test-fixtures/package.json
packages/test-fixtures/src/custody.ts
packages/test-fixtures/src/editorial.ts
packages/test-fixtures/src/fixtures.test.ts
packages/test-fixtures/src/geography.ts
packages/test-fixtures/src/ids.ts
packages/test-fixtures/src/index.ts
packages/test-fixtures/src/safety.ts
packages/test-fixtures/src/scott-county.ts
packages/test-fixtures/src/source.ts
packages/test-fixtures/tsconfig.json
packages/ui/package.json
packages/ui/src/alert.tsx
packages/ui/src/button.tsx
packages/ui/src/evidence-stamp.tsx
packages/ui/src/index.ts
packages/ui/src/status-pill.tsx
packages/ui/src/styles.css
packages/ui/src/visually-hidden.tsx
packages/ui/tsconfig.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
```
