# Architecture

## Goals and constraints

The system is a small, evidence-first custody-information platform, not a general-purpose directory.
Its initial approved geography is Iowa. Phase 1 contains one synthetic Scott County vertical slice.
Phase 2B adds an unregistered Dallas County adapter, fictional parser fixtures, and a secure source
transport without enabling live execution, persistence, or publication. The architecture optimizes
for explicit provenance, reliable failure semantics, independent code and data releases, minimal
client JavaScript, and safe county-by-county onboarding.

The application must never fetch, parse, or proxy an external roster during a visitor request.
Synthetic Phase 1 records are development and test data only.

## Workspace

The pnpm workspace has these ownership boundaries:

| Path                       | Responsibility                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`                 | Next.js App Router application, server-rendered public pages, the cursor API, correction intake, metadata, headers, sitemap, and development-only design lab |
| `apps/ingest-worker`       | Scheduled and manually invoked source-specific ingestion jobs; no public HTTP rendering responsibility                                                       |
| `packages/domain`          | Zod schemas, domain types, custody and bond semantics, cursor contracts, shared errors, and pure policy rules                                                |
| `packages/database`        | Drizzle PostgreSQL schema, versioned migrations, repositories, transactions, and retention operations                                                        |
| `packages/source-adapters` | Approved source-specific adapters plus fetch safety, parser result, failure classification, and health contracts                                             |
| `packages/editorial`       | Evidence-linked editorial models, rendering contracts, publication validation, and review rules                                                              |
| `packages/ui`              | Original tokens and accessible, product-specific presentation primitives                                                                                     |
| `packages/test-fixtures`   | Fictional source responses and synthetic builders; no real inmate personal data                                                                              |

Applications may depend on packages; packages must not import from applications. `domain` has no
database, framework, or network dependency. `database` implements domain-facing repositories. Source
adapters return validated domain input and do not render UI.

## Runtime topology

```text
approved official source
        |
        | scheduled/manual job only
        v
ingest worker -> source adapter -> validation/normalization
        |                    |
        |                    +-> redacted structured logs
        v
PostgreSQL transaction: run + snapshot + bookings + charges + bonds
        |
        +-> web server components -> canonical HTML
        +-> roster cursor endpoint -> JSON enhancement
```

The external-source boundary exists only in the worker. The web application reads committed,
validated database state. A failed ingestion records an `IngestRun` and leaves the last known
successful snapshot available with truthful stale/error status; it does not replace good records
with an ambiguous empty set.

## Web application

React Server Components are the default. Client components are limited to interactions that require
browser state, principally the county finder, roster “Load more” enhancement, and correction form
affordances.

For the canonical county route, the server:

1. validates the route against a published county record;
2. loads the source, facility, institution, latest displayable snapshot, review, and evidence-linked
   editorial blocks;
3. renders the first 25 current-custody records in deterministic order;
4. emits one self-referencing canonical URL from the configured production origin;
5. places roster personal data within a `data-nosnippet` boundary;
6. renders freshness and failure semantics independently of active count; and
7. provides an opaque next cursor only to the enhancement control, never as an indexable link.

The roster endpoint accepts a source identifier, opaque cursor, and bounded `limit` (default 25,
maximum 25). Zod validates all inputs. The endpoint applies rate limiting, resolves the cursor
against a stable snapshot and sort tuple, and responds with
`X-Robots-Tag: noindex, nofollow, nosnippet`. It never emits editorial sections or contact content.

HTML requests that contain `page` or cursor-like query parameters are normalized to the clean county
URL using a redirect before rendering. Unsupported route segments, inactive geography, and
unpublished counties resolve through `notFound()` to a genuine `404`.

The design-lab route is compiled or registered only when an explicit non-production development flag
is enabled. A production build must not have a reachable design-lab handler.

## Ingestion architecture

Each approved source has a dedicated adapter implementing explicit stages:

```ts
interface SourceAdapter {
  fetch(context: SafeFetchContext): Promise<FetchArtifact>;
  validate(artifact: FetchArtifact): Promise<ValidatedArtifact>;
  parse(artifact: ValidatedArtifact): Promise<ParsedSourceResult>;
  normalize(result: ParsedSourceResult): Promise<NormalizedSnapshot>;
  healthCheck(context: SafeFetchContext): Promise<SourceHealth>;
  interpretEmpty(result: ParsedSourceResult): EmptyInterpretation;
  classifyFailure(error: unknown): FailureClassification;
}
```

Exact names may vary in code, but no stage may be implicit. Source-specific logic is not folded into
a nationwide scraper.

The worker validates the source configuration and exact-host/path allowlist before network access.
Its connection-bound HTTPS transport resolves and validates public addresses inside the socket
lookup, rejects mixed or non-public answers, fixes method and request headers, disables redirects,
strips response cookies, rejects unreviewed content encoding, and caps bytes and timeouts. The Phase
2B Dallas adapter independently enforces the exact reviewed current-custody URL and same-host
list/detail paths. Neither component is registered with the worker job runner yet, and the existing
execution guard still permits only synthetic, network-disabled, database-write-disabled dry runs.
The worker never bypasses authentication, CAPTCHAs, robots restrictions, WAFs, or access controls.

An ingestion transaction writes the run, immutable custody snapshot, and relational children
together. A snapshot is displayable only after structural validation and normalization succeed.
Publication state is a separate reviewed decision; an ingestion success cannot publish a county
automatically.

## Data model boundaries

The database models, at minimum, `State`, `County`, `Facility`, `OfficialInstitution`,
`OfficialSource`, `SourceEvidence`, `SourceAdapter`, `IngestRun`, `CustodySnapshot`, `Booking`,
`PersonDisplayRecord`, `Charge`, `BondEntry`, `Contact`, `Operation`, `EditorialBlock`,
`EditorialEvidence`, `PublicationReview`, and `CorrectionRequest`.

Important invariants:

- a county belongs to one state and is not routable unless a current approval says `published`;
- an official source points to the operating institution and relationship evidence;
- an ingest run records fetch, validation, parser, and write outcomes without conflating them;
- a snapshot records custody-data and retention scopes and can represent a valid zero-result roster;
- a booking owns ordered charge and bond collections; neither is flattened into an untyped string;
- a person display record is snapshot-scoped and is not a durable public profile;
- bond status is an enum that separates monetary, no-bond, not-published, unknown, and
  not-applicable states;
- editorial assertions reference evidence at the block or fact level;
- a publication review records reviewer role or internal actor identifier, decision, scope, time,
  and notes without inventing public staff credentials.

Database migrations are append-only and versioned. Schema changes, destructive retention work, and
source adapter changes are independently reviewable. Application startup may check migration
compatibility but must not perform production migrations implicitly.

## Configuration

Every process validates its environment at startup with Zod. At minimum, configuration
distinguishes:

- `BRAND_NAME`;
- `PRODUCTION_DOMAIN` as an absolute HTTPS origin in production;
- `DEFAULT_LOCALE` (initially `en-US`);
- environment class (`development`, `test`, `preview`, `staging`, `production`);
- database connection;
- worker-only fetch and scheduling credentials;
- correction spam-protection secrets; and
- flags that permit synthetic fixtures or the design lab only outside production.

No fallback may silently treat a preview host as the production canonical origin. Fixtures use
`https://example.test`. Worker secrets never enter `NEXT_PUBLIC_*` variables or browser bundles.

Development and test may use documented local signing defaults. Next server instrumentation runs the
same Zod validation before an instance is ready. Production requires explicitly supplied
`CURSOR_SIGNING_SECRET` and `CORRECTION_FORM_HMAC_SECRET` values of at least 32 characters and
rejects missing values or values marked as default, placeholder, phase-one, example, replace-with,
or change-me. Production also rejects synthetic data mode and the fixture origin.

The inactive Iowa coverage component calls the publication boundary before rendering. It is a
noindex development prototype, but a production request returns a real `404` until an Iowa county
has an approved publication record. The production-bundle smoke suite builds the application, starts
the result with `next start`, and verifies route absence, response indexation, and the exact
sitemap.

## Observability and error handling

Logging is structured and redacted. Correlation identifiers, source identifiers, adapter versions,
timing, row counts, and failure classes are useful; person names, booking identifiers, addresses,
raw source payloads, correction message bodies, cookies, and secrets are not logged.

Operational states are explicit:

| State              | Meaning                                                                          | Display consequence                                          |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `success_nonempty` | Valid response, parser success, one or more in-scope records                     | Display committed snapshot and true active count             |
| `success_empty`    | Valid response, parser success, source-specific evidence that zero is legitimate | Display verified zero-result state                           |
| `fetch_failed`     | Request did not produce an approved artifact                                     | Keep last successful snapshot, mark source problem/staleness |
| `parser_failed`    | Artifact fetched but could not be safely interpreted                             | Keep last successful snapshot, mark interpretation failure   |
| `stale`            | Last success exceeds the approved freshness threshold                            | Display age and caution; do not claim current verification   |

Alerts and metrics must operate on source health without exposing roster content.

## Performance strategy

- Server-render the first roster results with reserved layout space; do not inject them after
  hydration.
- Keep client bundles interaction-specific and avoid third-party scripts in the MVP.
- Use self-hosted or framework-optimized fonts with controlled fallback metrics.
- Set explicit image dimensions; prefer no decorative raster imagery.
- Test mobile LCP below 2.5 seconds and CLS below 0.1 under documented test conditions.
- Cache public editorial and database reads only where freshness semantics remain correct; never
  cache an error as an empty roster.

## Deployment and data independence

Web and worker artifacts may share a repository but deploy and run independently. Scheduled
ingestion invokes the worker against the existing database without rebuilding the site. Web
deployment does not run ingestion. Database compatibility is enforced through migrations and
versioned adapter/parser identifiers.

GitHub Actions verifies formatting/linting, strict type checking, unit and contract tests, migration
consistency, dependency and secret scanning, builds, Playwright flows, axe checks, production-header
assertions, and sitemap/indexation rules. A separate scheduled workflow may invoke approved
ingestion only after Phase 2 authorization; Phase 1 workflows operate solely on synthetic fixtures.

## Phase 1 acceptance boundary

Phase 1 proves architecture and contracts with fictional records, including current custody, recent
release, multiple charges, multiple bond entries, all required bond meanings, valid empty, stale,
fetch failure, and parser failure. It stops after documented tests and screenshots. No real
endpoint, production database, analytics service, search-console property, deployment, or live data
is configured.
