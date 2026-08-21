# Threat model

## Scope and security goals

This model covers the Next.js web application, roster JSON endpoint, correction form, ingest worker,
approved external-source boundary, PostgreSQL database, CI/CD, configuration, and development
fixtures.

Primary security goals are:

1. do not publish incorrect, fabricated, stale-as-current, or out-of-scope custody facts;
2. prevent unauthorized access, alteration, export, or excess retention of personal data;
3. prevent the worker from becoming an SSRF proxy or bypassing source protections;
4. keep secrets and correction content out of browsers, logs, fixtures, and build output;
5. preserve one-county publication and indexation gates; and
6. remain available enough to show truthful failure state without converting failures to empty
   rosters.

Phase 1 has no real source connection, production database, deployment, or real personal data.
Controls must nevertheless be designed for later approved operation.

## Assets

- Accuracy and provenance of custody, charge, bond, source, contact, and operational facts.
- Official-source relationship evidence and human publication decisions.
- Current and retained person-level roster data.
- Correction submissions and optional reply addresses.
- Database credentials, worker/source credentials, signing keys, and spam-protection secrets.
- Adapter/parser code, migrations, fixtures, dependency graph, and CI permissions.
- Canonical/indexation configuration and public trust.
- Service availability and ingestion integrity.

## Actors

- Ordinary visitors, including users of assistive technology.
- Automated crawlers and high-volume roster harvesters.
- Spammers submitting correction content.
- Attackers probing application, API, database, CI, or source-fetch surfaces.
- A compromised or changed official/vendor source.
- A mistaken or malicious operator/reviewer with authorized access.
- Compromised dependencies, build actions, or deployment credentials.

## Trust boundaries

```text
browser -> edge/web runtime -> validated application services -> PostgreSQL
                         |
                         +-> correction intake/rate-limit store

scheduler/administrator -> ingest worker -> safe fetch boundary -> approved external host
                                  |
                                  +-> validation/parser -> PostgreSQL

developer/CI -> dependency and build boundary -> deployable artifacts/migrations
```

External source bytes and user form/API input are untrusted. Database content remains untrusted for
HTML rendering because it originated outside the application. Environment variables and deployment
metadata are trusted only after schema validation. Human approval is an accountable control, not
proof that source content is safe.

## Threats and controls

| Threat                                                    | Principal controls                                                                                                                                                                                                                                                                      | Detection / response                                                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| SSRF through a source URL or redirect                     | Store source configuration server-side; require HTTPS; exact approved hostname/port allowlist; resolve DNS and reject loopback, private, link-local, multicast, and cloud-metadata ranges for IPv4/IPv6; revalidate every redirect; limit redirect count; disable user-supplied targets | Log source ID and rejection class without target secrets; suspend source on destination drift                                        |
| DNS rebinding / resolution drift                          | Resolve and validate immediately before connection; use a fetch implementation that binds the validated resolution or rechecks connected address; disallow mixed/ambiguous records                                                                                                      | Alert on resolved-network class changes                                                                                              |
| Oversized, slow, or malicious source response             | Tight connect/read/total timeouts; byte cap; decompression cap; content-type allowlist; concurrency and per-source rate limits; streaming abort; no executable content                                                                                                                  | Classify fetch/validation failure; preserve prior snapshot; inspect redacted metrics                                                 |
| WAF/CAPTCHA/auth bypass                                   | No automation designed to defeat protections; no credential guessing, headless evasion, proxy rotation, or robots bypass; suspend and require source-policy review                                                                                                                      | Record blocked classification and stop retries according to backoff                                                                  |
| Source poisoning or vendor compromise                     | Validate source identity markers and schema; source-specific invariants; counts/range anomaly checks; immutable ingest run; adapter fixtures; human review for material drift                                                                                                           | Quarantine candidate snapshot; retain last approved success; alert on structural/content anomalies                                   |
| Parser drift presented as empty roster                    | Explicit empty interpretation; require known structural markers; empty DOM selection is failure; regression fixtures; parser versioning                                                                                                                                                 | Distinct `success_empty` and `parser_failed` metrics and UI states                                                                   |
| Partial or cross-booking data association                 | Transactional snapshot write; relational foreign keys; deterministic source-local association; never guess charge/bond links; invariant tests                                                                                                                                           | Reject entire snapshot on referential failure                                                                                        |
| SQL injection                                             | Drizzle parameterization; Zod boundary validation; no interpolated raw SQL; constrained database roles                                                                                                                                                                                  | Database error monitoring with bindings redacted; code review for raw SQL                                                            |
| Stored/reflected XSS from source or correction data       | Treat all text as data; React escaping; sanitize any narrowly permitted rich text with an allowlist; prohibit source HTML rendering; CSP without unsafe script allowances where feasible                                                                                                | CSP reports reviewed without personal URLs/content; security tests use adversarial fixtures                                          |
| Cursor tampering / record mixing                          | Opaque authenticated or encrypted cursor containing version, snapshot ID, stable sort tuple, and expiry/policy data; reject malformed, altered, cross-source, or stale cursors; maximum page size                                                                                       | Rate-limit/rejection metrics; generic client errors                                                                                  |
| Roster API enumeration and scraping                       | No person endpoints; bounded page size; deterministic snapshot-scoped pagination; per-IP/keyed rate limiting; response noindex/nosnippet; no cursor links/history; no bulk export                                                                                                       | Aggregate abuse signals; throttle without logging roster queries or raw IP in routine logs                                           |
| Cache leakage                                             | Mark personalized/correction responses non-cacheable; carefully set public cache keys by canonical route/publication version; never key roster content on unvalidated query; avoid shared caching of errors as empty                                                                    | Header tests and cache-key review                                                                                                    |
| Correction spam / injection / CSRF                        | Minimal text limits; Zod validation; honeypot and elapsed-time check; origin/CSRF control as appropriate; distributed rate limit; no attachments; escaped review UI                                                                                                                     | Quarantine/reject spam; do not echo payload in logs; accessible retry for false positives                                            |
| Sensitive data in logs/telemetry                          | Central redaction; route templates instead of raw URLs; error allowlist; disable body/SQL binding/raw payload logging; tests with canary values                                                                                                                                         | CI log scan and production sampling; purge/rotate on exposure                                                                        |
| Secrets in client/build/Git                               | Environment schema separated by runtime; only explicitly public variables enter client bundles; production startup instrumentation requires explicit non-placeholder cursor/correction secrets; secret scanning; `.env` exclusion; no fixture credentials                               | Unit tests reject missing/default/placeholder/phase-one/example secrets; CI blocks commits/build; rotate and investigate any finding |
| Unauthorized database access                              | Network restriction, TLS, least-privilege roles for web/worker/migration, short-lived credentials where possible, encrypted storage/backups, isolated correction permissions                                                                                                            | Access/audit alerts; credential rotation and incident process                                                                        |
| Publication without review                                | Database constraints/service policy requiring current publication review tied to source, adapter, evidence, and editorial versions; route and sitemap query the same approved state                                                                                                     | Release test enumerates public routes; withdraw route on invalidation                                                                |
| Synthetic data reaches production                         | Explicit `synthetic` markers; production build/startup and seed guard; separate fixture package; CI scan; no Phase 1 deployment                                                                                                                                                         | Fail closed and remove affected deployment immediately                                                                               |
| Site-wide accidental noindex or indexing private surfaces | Environment-specific header tests; strict sitemap allowlist; API robots header; production lab route absent; canonical origin validation                                                                                                                                                | CI release blocker plus post-deploy header/sitemap monitor in Phase 3                                                                |
| Clickjacking / MIME confusion / cross-origin abuse        | CSP `frame-ancestors`; `X-Content-Type-Options: nosniff`; strict content types; conservative CORS (same-origin unless explicitly needed); referrer policy                                                                                                                               | Header contract tests                                                                                                                |
| Dependency or CI compromise                               | Lockfile, minimal dependencies/actions, pinned action revisions, dependency review, production dependency audit at moderate severity, restricted workflow token, protected environments, artifact provenance where available                                                            | CI alerts; revoke tokens, rebuild from known-good revisions                                                                          |
| Denial of service                                         | Edge and application rate limiting, bounded database queries, timeouts, connection pools, cursor pagination, source-job concurrency controls, graceful error boundaries                                                                                                                 | Latency/error/source-health alerts; degrade without mislabeling data                                                                 |
| Insider mistake or misuse                                 | Least privilege, separation of migration/ingestion/publication roles, review audit, no routine raw export, retention enforcement                                                                                                                                                        | Accountable audit events and periodic access review                                                                                  |

## Safe source-fetch contract

Only an approved `OfficialSource` record can initiate a fetch. A job accepts a source identifier,
not an arbitrary URL. Before each request and redirect, the worker verifies scheme, normalized host,
port, resolved address, and destination relationship against the reviewed allowlist.

Requests use an identifiable product user agent and conservative cadence where permitted. They do
not submit visitor input, cookies, referers containing roster context, or correction data.
Credentials, if an explicitly approved official integration later requires them, live in a
worker-only secret store and are never used to circumvent a public access restriction.

Responses are data, not trusted HTML. The worker validates expected status, content type, size,
structural identity, and source-specific schema before parsing. It never evaluates scripts, loads
subresources, follows meta refresh, renders vendor HTML to visitors, or persists arbitrary markup.

## Web security headers

Production responses use a tested baseline appropriate to the deployment:

- Content Security Policy with `default-src 'self'`, narrowly enumerated
  script/style/connect/image/font/form sources, `object-src 'none'`, `base-uri 'self'`, and
  `frame-ancestors 'none'`; avoid `unsafe-eval`, and use nonces/hashes where framework support
  requires inline code;
- `X-Content-Type-Options: nosniff`;
- strict referrer policy, preferably `strict-origin-when-cross-origin` or tighter;
- `Permissions-Policy` disabling unneeded camera, microphone, geolocation, payment, and similar
  features;
- HSTS only on an HTTPS production domain after deployment ownership and subdomain implications are
  verified; and
- route/environment-specific `X-Robots-Tag` under the indexation contract.

Header behavior is tested on success, redirect, API, error, and not-found responses. CSP rollout
starts in report-only during an approved production-readiness exercise only if needed; it does not
justify an indefinitely permissive policy.

## Cursor and rate-limit design

The cursor encodes no readable personal data. Its integrity covers source, immutable snapshot,
stable deterministic ordering tuple, and format version. The server verifies it before querying and
returns a generic validation error on failure. Cursors must not be reusable across sources or
snapshots in a way that mixes results.

Page size is capped at 25 regardless of input. Rate limiting must work across serverless instances
via a production-suitable shared store; an in-memory limiter is acceptable only for isolated tests.
Failure responses include accessible retry guidance and do not disclose whether a person or hidden
record exists.

## Data integrity and recovery

Ingestion writes a successful snapshot and all children in one transaction. Fetch, validation, and
parser failures write only the run outcome. Database constraints protect uniqueness, scope enums,
charge/bond ownership, and review references.

Backups and point-in-time recovery are Phase 3 decisions. Restoration tests must run retention
enforcement before traffic and prove publication review and synthetic guards remain intact. Code
rollback must remain compatible with the database migration policy; data refresh does not require
application deployment.

## Residual risks

Public custody data can be copied despite noindex, no person pages, rate limiting, and
`data-nosnippet`. An official source can itself be wrong or delayed. A sophisticated authorized
insider can misuse access. Accessibility-oriented server-rendered records necessarily expose content
in HTML. These risks are reduced through narrow fields and routes, short retention, visible
provenance/freshness, correction handling, access controls, and conservative publication—not
represented as eliminated.

## Verification

Phase 1 security checks include Zod boundary tests, cursor tamper/cross-source cases, rate-limit
behavior, CSP/security-header assertions, adversarial XSS fixtures, SSRF host/address/redirect tests
without live private-network access, log-redaction canaries, synthetic-production guards, dependency
audit, secret scan, and sitemap/noindex contracts.

Before Phase 2, review the exact source host, redirects, robots/access behavior, response size/type,
adapter assumptions, and fixture sanitization. Before Phase 3, conduct a deployment-specific CSP
review, database-role test, correction-data access review, backup/restore exercise, platform log
audit, and incident-response tabletop.
