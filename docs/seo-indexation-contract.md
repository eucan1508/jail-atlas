# SEO and indexation contract

## Objective

Search engines may index a small set of useful public documents, never roster pagination, person
profiles, synthetic content, unpublished geography, or application internals. Each published county
has exactly one canonical HTML URL.

Search visibility is subordinate to source accuracy, privacy, and publication gates. The application
does not create pages to capture keyword variants, county permutations, or inactive coverage.

## Origin and environment rules

Canonical and sitemap URLs are derived from the validated `PRODUCTION_DOMAIN`, never from an
untrusted request host. Production requires an absolute HTTPS origin. Test and fixture examples use
`https://example.test`.

| Environment            | Indexation behavior                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| local/development/test | Not publicly served; synthetic content permitted behind development controls                                                                                              |
| preview/staging        | Every response sends `X-Robots-Tag: noindex, nofollow, nosnippet`; robots output also disallows crawling as defense in depth                                              |
| production             | Approved public pages are indexable; private and machine routes retain route-specific noindex controls; a test fails if a site-wide noindex header or meta tag is present |

The environment is explicit configuration. Hostname guessing is not an acceptable substitute.
Preview protection is applied at the response-header layer so it covers HTML, assets, errors, and
unexpected routes.

## Canonical public routes

The Phase 1 production sitemap allowlist is:

```text
/
/coverage/
/about/
/methodology/
/source-policy/
/corrections/
/privacy/
/terms/
/disclaimer/
```

`/coverage/iowa/` and `/iowa/scott-county/custody/` are approved route shapes, not Phase 1 public
documents. Iowa coverage remains an explicitly noindex development prototype and returns a genuine
`404` from the production bundle until at least one Iowa county passes publication review. The Scott
County page and roster API are omitted from production compilation. Only routes backed by approved
publication state are emitted in the sitemap; no route is generated for any other inactive state or
county.

Trailing-slash behavior must be consistent with the framework configuration. All internal links,
canonical metadata, redirects, and sitemap entries use the same normalized form.

## One county, one document

The clean county custody route is the only indexable roster document. The system must not create:

- numbered or cursor route segments;
- `?page=…` documents;
- cursor, sort, or filter canonicals;
- separate roster-record or person URLs;
- booking-history archives; or
- alternate location/keyword paths.

On an HTML county route, query keys that can create page-like or roster-state variants—including
`page`, `cursor`, `limit`, `sort`, `order`, and source-specific pagination keys—trigger a redirect
to the clean canonical URL. They are not rendered as alternate `200` documents. Benign campaign
parameters may be ignored for content, but canonical metadata still points to the clean route.

Unknown child segments such as numbered pages return `404`; they are not redirected into a
plausible-looking document. The rendered page contains one canonical link and one meaningful `h1`.

## Load-more endpoint

The cursor JSON endpoint is an application interface, not a search document:

```text
GET /api/rosters/{sourceId}?cursor={opaqueCursor}&limit=25
```

Every response, including validation, rate-limit, and error responses, sends:

```text
X-Robots-Tag: noindex, nofollow, nosnippet
```

Cursors are opaque, have no anchor `href`, do not enter browser history, and are never placed in
HTML metadata, internal links, XML sitemaps, or structured data. The endpoint returns roster rows
and pagination state only; it does not repeat editorial or contact content.

Roster personal data in both initial and appended markup lives inside an appropriate
`data-nosnippet` container. This is an additional presentation control, not a promise that public
data cannot be indexed; minimization and route design remain primary.

## Search and non-public routes

If `/find/` is implemented, its HTML responses use `noindex, follow`, have no sitemap entry, and
canonicalize to the clean `/find/` route rather than a query-specific URL. Search result pages do
not expose links to unpublished counties.

The following are always excluded from the sitemap and receive noindex protection or are unreachable
in production as appropriate:

- API routes;
- search results;
- the development design lab;
- filters, sort states, and cursors;
- preview routes;
- unpublished states and counties;
- error documents;
- synthetic fixtures and test-only pages.

The design lab is not merely hidden from navigation: its route registration is disabled in
production.

## Sitemap contract

The XML sitemap is generated from a strict route allowlist plus reviewed publication records. It
contains only:

- canonical public utility pages;
- active state coverage pages;
- active county pages that passed every publication gate; and
- approved editorial trust pages.

Database existence alone does not create a sitemap URL. Draft, candidate, suspended, withdrawn,
synthetic, or stale-beyond-display-policy records are excluded. All entries use the configured
production origin and normalized trailing-slash form.

`lastmod` appears only when it represents a meaningful, recorded change to the public document.
Ingest checks that do not change visible content, build times, request times, and synthetic
timestamps do not update it.

Automated tests parse the final XML and prove the exact allowlist, absence of machine/search/design
routes, absence of inactive geography, correct origin, and absence of duplicate normalized URLs.

## Robots controls

Production `robots.txt` allows crawling and identifies the canonical sitemap. It does not attempt to
enforce noindex with route-specific `Disallow` rules: a disallowed URL can still be discovered and a
crawler cannot read its noindex directive. HTML metadata, `X-Robots-Tag`, and route nonexistence are
the enforcement layers. Preview/staging may additionally disallow all crawling as defense in depth,
but their site-wide response header remains authoritative.

Roster API responses always send `X-Robots-Tag: noindex, nofollow, nosnippet`. Search results use
explicit noindex metadata. APIs, search results, cursor states, and development/design routes never
appear as internal anchor links or sitemap entries.

The production test suite requests representative public HTML, trust pages, API responses, `404`
pages, and robots/sitemap output. It fails on either of these regressions:

- an approved public page inherits a site-wide `noindex`; or
- a non-public route loses its required noindex/unreachable behavior.

## Metadata

Each indexable page has a unique, useful title and description based on its actual purpose.
Templates do not generate spelling variants, near-duplicate location permutations, or claims of
real-time accuracy.

County metadata describes the visible county custody utility, official-source evidence, and
freshness interpretation without exposing person names, booking facts, or unsupported superlatives.
State coverage metadata reflects only currently published counties.

Open Graph and social metadata, if implemented, use neutral product graphics and the same truthful
page description. No mugshots or roster personal data become preview images.

## Structured data

Structured data is rendered only when it matches visible content:

- `WebSite` for the configured product;
- `Organization` for the independent publisher;
- `WebPage` or `CollectionPage` according to the page’s actual role; and
- `BreadcrumbList` matching the visible breadcrumb trail.

The publisher is not typed as a government organization. Do not emit person entities for roster
records, reviews/ratings, legal-service types, unsupported custody types, hidden content, or FAQ
rich-result markup. Identifiers and URLs use the configured production origin.

A contract test extracts JSON-LD, validates its schema shape, and compares names, URLs, breadcrumbs,
publisher description, and visible page type against rendered content. Structured data is omitted
rather than guessed when a required fact is unavailable.

## Content quality contract

Indexable pages exist to complete a task. Editorial statements are county-specific, useful,
reviewed, and linked to official evidence. Verification, successful fetch, and editorial review
dates appear only when real recorded events occurred.

The home page remains compact. Coverage pages list only published geography. Questions are visible
only when they add an officially supported answer not already stated nearby. No word-count targets,
boilerplate state essays, aggressive SEO blocks, or repeated phone numbers are used.

## Required automated assertions

Tests must prove:

1. numbered county subroutes do not exist;
2. HTML pagination/cursor parameters normalize to the clean county route;
3. the county HTML has exactly one correct canonical URL;
4. the first 25 records render without JavaScript;
5. enhancement does not repeat editorial content or create history URLs;
6. roster API responses carry the complete robots header;
7. machine, search, lab, fixture, and inactive routes are absent from the sitemap;
8. inactive geography returns `404`;
9. preview/staging responses are site-wide noindex; and
10. production public pages are not accidentally noindex.

These assertions are release blockers, not monitoring suggestions.
