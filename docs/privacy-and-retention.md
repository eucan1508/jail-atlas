# Privacy and retention

## Purpose and scope

The product publishes a narrow view of officially sourced county custody information so a visitor
can verify current source records and find official contacts. Public availability does not remove
privacy risk. The product minimizes collection, routes, fields, retention, discoverability, and
secondary use.

This policy covers roster data, source artifacts, evidence, correction submissions,
application/security logs, analytics, backups, and synthetic development data. It is a product
baseline, not a substitute for jurisdiction-specific legal review before production.

The eventual operator and privacy contact must be truthfully identified on the public About and
Privacy pages before production. `BRAND_NAME` and `PRODUCTION_DOMAIN` remain configuration; Phase 1
must not invent an operator, staff identity, or permanent domain.

## Data categories and purposes

| Category                         | Purpose                                                                               | Public?                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Current-custody display fields   | Reproduce the approved official roster within its meaning and scope                   | Yes, only on one county page and inside a `data-nosnippet` boundary                                         |
| Recent-release fields            | Only if separately approved and needed to explain an official recent-release source   | Potentially, with distinct label and stricter source-defined retention; not part of current-custody results |
| Charges and bonds                | Preserve officially published booking relationships without legal inference           | Yes when attached to an in-scope display record                                                             |
| Source/evidence metadata         | Explain authority, purpose, vendor relationship, provenance, and freshness            | Yes in useful summarized form; internal review details may be restricted                                    |
| Facility contacts and operations | Help users reach an officially verified institution or follow evidenced procedures    | Yes                                                                                                         |
| Correction submission            | Investigate a stale-data, transformation, evidence, contact, or accessibility concern | Restricted                                                                                                  |
| Operational/security metadata    | Reliability, abuse prevention, incident response, and audit                           | Restricted and redacted                                                                                     |
| Synthetic fixtures               | Exercise application states without real people                                       | Development/test only; never production                                                                     |

The product does not create a permanent person profile, cross-county identity, booking-history
archive, mugshot gallery, background-check dossier, audience segment, or advertising profile.

## Roster minimization

Store and display only fields needed to reproduce the reviewed source meaning. A field is not
included merely because the source exposes it.

- Do not store government identifiers, Social Security numbers, full birth dates, medical details,
  biometric templates, or home contact details unless a separate legal and necessity review
  explicitly changes this policy. The MVP has no need for them.
- Prefer age or source-provided limited display values over a full date of birth where the source
  supports that choice.
- Store booking identifiers only when explicitly labeled as such; never display an internal primary
  key.
- Do not retain source mugshots in the MVP.
- Keep charges and bonds relationally attached to a booking, but do not infer guilt, disposition,
  release eligibility, or “No Bond.”
- Keep current custody, recent release, historical booking, and arrest report scopes separate.

Names and other roster display values are personal data even when officially public. They are
excluded from application logs, structured data, social preview metadata, site search indexes where
avoidable, and search snippets via an appropriate `data-nosnippet` container.

## Roster lifecycle

Every approved source must have a reviewed `retention_scope` before publication. It documents source
scope, local purpose, maximum display and storage interval, removal trigger, and evidence for the
decision. There is no global default that permits indefinite retention.

For current custody:

1. a successful immutable snapshot represents what the approved source reported at the recorded
   observation time;
2. only the latest displayable snapshot is public;
3. absence in a later snapshot does not itself create a public “released” fact;
4. prior person-level records are deleted or irreversibly de-identified as soon as operational
   consistency permits and no later than the source-specific approved interval; and
5. backups age out under the backup schedule and are not used to reconstruct a public history.

For recent release, retention cannot exceed the official source’s represented window and may be
shorter based on necessity and harm. Once outside the window, the person-level record and associated
booking/charge/bond data are removed. Historical booking and arrest-report ingestion are outside the
Phase 1 current-custody slice and require separate approval.

Failed fetches and parser failures do not create new person data. A last successful snapshot may
remain visible only within the approved maximum display age and must carry truthful stale/failure
messaging. After that threshold, suppress the records while keeping a non-personal source-status
explanation if the county publication policy allows it.

Retention jobs run independently of deployment, use database transactions, and record run time,
policy version, source, and aggregate deletion counts without logging the deleted values.

## Source artifacts and fixtures

Raw roster responses are processed ephemerally by default and discarded after validation, parsing,
and commit. If Phase 2 demonstrates that an encrypted artifact is necessary for parser audit or
dispute resolution, its exact fields, access group, storage location, deletion deadline, and legal
basis require approval. Raw artifacts are never committed to Git or included in CI output.

Source-specific regression fixtures must be structurally minimized and fully fictionalized. Phase 1
fixtures use conspicuously fictional names, reserved non-real identifiers, fixed dates,
`example.test`, and `synthetic: true`. They must not reproduce a live roster or real facility
contact set.

Production builds, startup validation, and seed commands reject synthetic markers and fixture
packages. Synthetic content must never be publicly deployed.

## Correction submissions

The correction form collects only:

- concern category;
- affected public page;
- concise description;
- optional reply email; and
- non-content spam/rate-limit signals.

It warns users not to submit Social Security numbers, full birth dates, medical information,
credentials, government-ID images, or unnecessary personal booking details. Attachments are not
accepted in the MVP.

Submission content is restricted to authorized reviewers, encrypted in transit and at rest through
the production platform/database, omitted from logs and analytics, and never used for marketing.
Spam signals must not build a cross-site behavioral profile.

Proposed baseline retention, subject to operator/legal approval before Phase 3:

- unverified spam: delete within 7 days;
- correction case content: delete 90 days after resolution;
- reply email: delete with the case, or earlier when no reply is needed;
- minimal non-personal decision audit (category, page, dates, outcome): retain up to 12 months for
  quality review.

If a submission contains high-risk unnecessary data, restrict access and delete that material
promptly while preserving only what is needed to investigate the correction.

## Logs, rate limiting, and diagnostics

Structured logs may contain timestamp, correlation ID, route template, response class, latency,
source ID, adapter/parser version, aggregate record count, and classified error. They must not
contain person names, roster/booking identifiers, charge or bond content, full URLs with query
values, correction text or email, cookies, authorization headers, source response bodies, database
connection strings, or secrets.

Use keyed hashes or short-lived server-side keys for rate-limit identifiers where possible; do not
store raw IP addresses in ordinary application logs. Proposed baseline retention is 30 days for
security/access metadata and 90 days for non-personal ingestion-run diagnostics, shortened when
operational needs allow. Confirm platform logs honor the same redaction and retention before
production.

Debug modes that emit SQL bindings, request bodies, raw errors, or source payloads are prohibited in
production. Error pages and client telemetry contain no roster content.

## Analytics and third parties

The MVP has no advertising and no blocking third-party scripts. Phase 1 does not configure
production analytics. If analytics is proposed in Phase 3, it requires a privacy review, data-flow
inventory, retention limit, consent/legal assessment, and configuration that excludes roster fields,
correction content, query strings, and stable person/device profiling.

Official-source links are ordinary outbound links; the product does not transmit roster context in
URL parameters. Vendor involvement is disclosed in source evidence, but an official roster vendor is
not automatically authorized to receive product visitor data.

Production infrastructure vendors must be listed truthfully on the Privacy page once selected. No
vendor, location, or contractual safeguard is invented during Phase 1.

## Cookies and local storage

The public MVP should function without nonessential cookies. Security cookies, if required, use
`Secure`, `HttpOnly`, and appropriate `SameSite` settings and a narrowly scoped lifetime. Do not
store roster content, correction text, opaque page cursors beyond the active interaction, or
identity profiles in browser storage.

## Security and access

Database roles follow least privilege: the web application reads publication data and writes
correction intake through a constrained path; the worker writes ingestion data; migration
administration is separate. Sensitive correction content is isolated or permissioned separately from
public roster reads.

Access to production data is limited to accountable operators with a current need. Administrative
access, export, retention override, and correction review are audited without copying personal
content into the audit event. Secrets remain server-side and rotate under incident policy.

## Requests and corrections involving personal data

The public Privacy and Corrections pages provide an accessible contact method. The operator must
authenticate and evaluate requests proportionately without asking for more sensitive information
than necessary. Responses distinguish a transformation error, stale source, retention-policy issue,
source-level dispute, and legal request.

When the product faithfully reflects an official source but the underlying fact is disputed, direct
the person to the verified official institution while still checking product scope, freshness, and
retention compliance. Correct product errors promptly and record the evidence-backed outcome.

## Backups and deletion

Production backup design belongs to Phase 3. The proposed upper bound is a rolling 35-day encrypted
backup window, with access restricted and restoration tested. Deletion propagates from live data
immediately under policy and from backups through natural expiry; restored backups must rerun
retention jobs before serving traffic.

Aggregated operational statistics may be kept longer only when they cannot reasonably identify a
person or reconstruct a roster history.

## Incident response

On suspected overcollection, retention failure, synthetic publication, credential exposure,
source-scope drift, or unauthorized access:

1. stop the affected ingestion/display path;
2. preserve minimal non-content evidence;
3. assess affected data, people, systems, and time window;
4. rotate credentials and close the control gap;
5. delete improperly held data where safe and lawful;
6. make required notifications through the verified operator process; and
7. record corrective actions and policy/test changes.

## Approval items before production

The accountable operator, privacy contact, applicable legal basis, jurisdictional notice language,
source-specific roster retention, correction/log/backup periods, infrastructure vendors, data
locations, request process, and incident-notification duties all require explicit Phase 3 review.
Until then, the repository remains a non-deployed synthetic implementation.
