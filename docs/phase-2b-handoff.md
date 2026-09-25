# Dallas County Phase 2B handoff

## Outcome

**IMPLEMENTED FOR REVIEW — NOT ACTIVATED**

The Dallas County source-specific adapter, fictional HTML regression fixtures, and connection-bound
HTTPS transport are implemented. The adapter is exported for technical review but is deliberately
absent from the default adapter registry and worker job runner. Live source execution, database
writes, Iowa/Dallas publication, public routes, deployment, and real-person persistence remain
disabled.

## Adapter behavior

The adapter key is `dallas-newworld-inmate-inquiry`, parser version `1.0.0`. It requires the exact
reviewed HTTPS current-custody query and enforces:

- exact HTTPS host, list path, `InCustody=True` scope, and reviewed query parameters;
- same-host detail paths and source-emitted, gap-free pagination only;
- Dallas inquiry title/heading, a visible disclaimer region, checked current filter, and the full
  reviewed list-header set;
- explicit `Yes` custody values, distinct person/detail locators, and list/detail name agreement;
- exactly one active booking selected by empty `Release Date` plus populated `Housing Facility`;
- list/detail consistency for the `Multiple Bookings` marker;
- booking-labeled identifiers, current-booking-only charge rows, and booking-level bond rows;
- exact `NO BOND`, `CASH ONLY`, and `CASH/SURETY` enumerations;
- positive dollar-format amounts for monetary bonds, with `USD` required as explicit adapter
  configuration rather than inferred inside parsing;
- missing bond rows normalized as `unknown`, never `no_bond`;
- no booking timestamp normalization until Dallas timezone/DST policy is approved; and
- page-one exact-scope literal `No data` as the only candidate `valid_empty` response.

An emitted later page that returns `No data`, an unmarked zero, partial detail set, ambiguous active
booking, unknown bond type, duplicate locator, filter loss, pagination gap, redirect, or structural
drift fails closed. Historical/released bookings are used only to reject them and do not enter the
normalized snapshot.

## Secure transport behavior

The worker now contains a reusable but unregistered connection-bound HTTPS transport. It:

- validates HTTPS, exact allowlisted host, default port, credentials/fragments, and path prefix;
- rejects IP-literal URLs and any DNS answer in private, loopback, link-local, documentation,
  transition, multicast, or other non-public ranges;
- repeats DNS resolution and validation inside the socket lookup to bind the connection to a
  validated public address and fail DNS rebinding or mixed answers;
- permits only GET, fixed safe headers, identity encoding, an explicit user agent, and no request
  body;
- never follows redirects;
- applies timeout and response-byte limits; and
- removes `Set-Cookie` from the returned in-memory response.

The existing worker configuration and execution guard were intentionally not opened. They continue
to accept only synthetic mode, disabled network, disabled database writes, disabled live-source
flags, and dry-run Scott fixture scenarios. Merely exporting the new transport cannot initiate a
request.

## Fictional fixtures and privacy

The Dallas HTML fixtures are hand-authored structural examples. They contain explicit `SYNTHETIC`
and `TEST ONLY` markers, reserved synthetic identifiers and dates, relative synthetic detail
locators, no photographs, and no real-person data. A fixture-specific safety function rejects
missing sentinels and personal-data-shaped values. The same safety assertion runs in the fixture,
adapter, and web test layers.

No live response, raw HTML, photograph, cookie, detail locator, name, booking value, charge value,
bond amount, or other identifiable roster value was saved during Phase 2B. No live source request
was made during implementation or testing.

## Files added

- `apps/ingest-worker/src/secure-source-fetch.ts`
- `apps/ingest-worker/src/secure-source-fetch.test.ts`
- `packages/source-adapters/src/dallas-county.ts`
- `packages/source-adapters/src/dallas-county.test.ts`
- `packages/test-fixtures/src/dallas-county-source.ts`
- `docs/phase-2b-handoff.md`

The approved Phase 2A research documents also remain uncommitted:

- `docs/research/dallas-county-iowa-source-audit.md`
- `docs/research/dallas-county-iowa-field-matrix.md`
- `docs/phase-2a-dallas-county-handoff.md`

## Files updated

- `apps/ingest-worker/src/network-policy.ts`
- `apps/ingest-worker/src/network-policy.test.ts`
- `apps/web/tests/unit/synthetic-fixture-safety.test.ts`
- `packages/source-adapters/package.json`
- `packages/source-adapters/src/index.ts`
- `packages/test-fixtures/src/fixtures.test.ts`
- `packages/test-fixtures/src/index.ts`
- `pnpm-lock.yaml`
- `docs/architecture.md`
- `docs/threat-model.md`
- `docs/source-publication-policy.md`
- `docs/privacy-and-retention.md`

`cheerio` `1.2.0` is the only new production dependency. It is used as a server-side parser and is
never exposed to the browser.

## Validation results

Run on August 21, 2026:

| Command                                       | Result                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm format:check`                           | Passed across the repository                                                   |
| `pnpm lint`                                   | Passed across all workspace projects                                           |
| `pnpm typecheck`                              | Passed across all workspace projects                                           |
| `pnpm test`                                   | Passed: 111 unit/contract tests and 5 production-bundle smoke tests            |
| `pnpm build`                                  | Passed; Dallas and Scott custody routes absent from the production application |
| `pnpm test:e2e`                               | Passed: 26 Playwright tests                                                    |
| `pnpm test:a11y`                              | Passed: 8 axe/keyboard/mobile accessibility tests                              |
| `pnpm --filter @jail-atlas/database db:check` | Passed: `Everything's fine`                                                    |
| `pnpm audit --prod --audit-level moderate`    | Passed: no known vulnerabilities                                               |

Focused results included 15 source-adapter tests, 58 ingest-worker tests, and 6 fixture tests. Test
execution used only synthetic local documents and injected network primitives.

## Remaining approval gates

Before any live Dallas execution:

1. review and approve this implementation and parser version;
2. approve the exact source record, relationship evidence record, facility ID, explicit USD rule,
   and current-only retention policy;
3. approve the current-booking selector and exact empty/bond enumerations;
4. approve an identifiable user agent, request cadence, serial detail budget, timeout, retry,
   backoff, and `Retry-After` policy;
5. implement and approve anomaly quarantine using the prior successful snapshot so a sudden source
   zero cannot replace records automatically;
6. implement and test current-only persistence/deletion transactions and redacted ingest-run logs;
7. perform a separately approved privacy-preserving compatibility run from the intended worker
   egress without saving or printing person values; and
8. obtain a human source-policy review tied to the exact source, adapter, parser, transport, and
   retention versions.

Publication remains a later decision requiring verified contacts, county-specific editorial
evidence, freshness thresholds, correction workflow review, successful scheduled ingestion,
accessibility/indexation review, and an explicit publication review. Until then Iowa coverage and
Dallas County must continue to return genuine production `404` responses.
