# Data provenance

## Purpose

Every visible factual claim must have a traceable path back to an approved official source or
evidence record. Provenance covers roster fields, source status and dates, facility/contact facts,
operations, and editorial statements. It must be possible to answer: who supplied this value, what
did the source mean, when was it observed or verified, how was it transformed, and which reviewed
version allowed it to appear?

Phase 1 uses fictional fixtures only. Synthetic records exercise semantics and failure states; they
are not evidence about Scott County and may not be deployed.

## Lineage model

Roster lineage follows this chain:

```text
OfficialInstitution
  -> SourceEvidence (documents official relationship and purpose)
  -> OfficialSource (scope, URL, status, retention, verification)
  -> SourceAdapter + parser version
  -> IngestRun (attempt and outcome)
  -> CustodySnapshot (immutable successful interpretation)
  -> Booking / PersonDisplayRecord
  -> Charge[] / BondEntry[]
  -> rendered county page
```

Editorial lineage follows this chain:

```text
official page or document
  -> EditorialEvidence
  -> EditorialBlock or individual fact reference
  -> PublicationReview
  -> rendered county page or trust page
```

Contacts and operations record their own evidence references and verification times. They do not
inherit truth merely because they share an institution with the roster source.

## Time semantics

Timestamps are named by event and never substituted for one another:

| Field                                      | Event represented                                             |
| ------------------------------------------ | ------------------------------------------------------------- |
| `observed_at`                              | When the source artifact or fact was observed                 |
| `source_updated_at`                        | Source-published update time, only if explicitly supplied     |
| `ingest_started_at` / `ingest_finished_at` | Worker execution boundaries                                   |
| `last_checked_at`                          | Most recent attempted source check, successful or not         |
| `last_success_at`                          | Most recent fetch, validate, parse, and normalization success |
| `verified_at`                              | Human verification of source authority, relationship, or fact |
| `reviewed_at`                              | Human editorial/publication decision                          |
| `created_at` / `updated_at`                | Internal record lifecycle, not public evidence freshness      |

The UI labels the actual event. It never presents a build time, database update time, or request
time as a source verification date.

## Scope semantics

Every source and snapshot declares one custody-data scope:

- `current_custody`: people the official source represents as currently held;
- `recent_release`: a source-defined window of releases;
- `historical_booking`: older booking information not asserting current custody;
- `arrest_report`: an arrest record that is not itself proof of jail custody.

These scopes are never merged into an undifferentiated roster. Current custody and recent release
can share domain components while remaining separately queried, labeled, and retained.

A snapshot also records an explicit result meaning:

- valid, nonempty result;
- valid, source-specific zero-result roster;
- no committed snapshot because source request failed; or
- no committed snapshot because parsing failed.

Staleness is calculated independently from the last successful snapshot and the source’s reviewed
threshold. An empty snapshot can be fresh or stale; a failed check is not empty.

## Field-level mapping

Each adapter maintains a reviewed field map containing:

- source label or structural selector;
- source meaning and scope;
- raw type and permitted formats;
- normalized domain field;
- normalization rule;
- null/absence interpretation;
- confidence or ambiguity notes;
- fixture coverage; and
- parser version where the mapping took effect.

Normalization may trim harmless whitespace, normalize well-defined date representations with a
recorded timezone policy, map explicitly equivalent enumerations, and sanitize untrusted text for
safe rendering. It may not add an identifier, infer a legal status, expand an ambiguous abbreviation
as fact, infer “No Bond,” or convert an arrest into custody.

Raw source payloads are transient by default. If a narrowly scoped artifact must be retained for
parser audit, its need, encrypted location, access control, and deletion time are documented; it is
never committed to Git or emitted to logs.

## Relational integrity

A snapshot owns ordered bookings. A booking may reference one snapshot-scoped `PersonDisplayRecord`
and owns zero or more `Charge` and `BondEntry` records.

- Charges remain separate records in source order where source order is meaningful.
- Bond entries remain separate and preserve any explicit source association to a charge or case.
- Associations are not guessed. An unassociated bond stays unassociated.
- Booking identifiers are stored only when the source explicitly labels them as booking identifiers.
  Internal database primary keys are never displayed as source booking numbers.
- Display-name parts are stored only to the degree needed to reproduce the source’s public display;
  they do not create a durable person identity.

The bond semantic is an explicit discriminated union:

| State            | Required meaning                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `monetary`       | Source explicitly publishes a monetary amount; currency and amount are separate structured fields |
| `no_bond`        | Source explicitly states that no bond applies or is allowed in the represented context            |
| `not_published`  | Source or reviewed source documentation states that bond information is not published             |
| `unknown`        | Available evidence cannot determine bond status                                                   |
| `not_applicable` | Bond does not apply to the represented record for an evidenced reason                             |

A missing value defaults to `unknown` unless source-specific evidence supports `not_published` or
`not_applicable`. It never maps to `no_bond`.

## Evidence for institutions, facilities, contacts, and operations

An evidence record includes the official URL, official page title, responsible institution, purpose,
relevant fact or excerpt summary, observed/verified time, reviewer, vendor involvement where
applicable, and a content fingerprint or approved archive reference. Quoted material is minimized;
the application stores a concise fact summary and source location.

Contacts preserve type (phone, address, email, or other), purpose, audience, hours/availability if
explicitly stated, source, and verification time. A phone number verified for the jail office is not
silently reused as a visitation, records, emergency, or legal-help number.

Operations such as visitation, mail, deposits, property release, or arrival instructions must carry
evidence for each consequential condition. When evidence is incomplete, the UI gives the verified
contact path rather than inventing procedure.

## Editorial provenance

An `EditorialBlock` records county, block type, stable internal key, content version, review status,
and review time. Each factual sentence or grouped fact has one or more `EditorialEvidence`
references. Shared product explanations may cite policy rather than county evidence, but may not
introduce county facts.

Editors must be able to see unsupported facts before publication. Deleting or expiring evidence
marks dependent blocks for re-review; it does not silently leave them published.

## Ingestion auditability

Each `IngestRun` records source and adapter identifiers, parser version, start/end times, artifact
metadata without personal content, fetch/HTTP classification, validation result, parser result,
counts, empty interpretation, redacted error class, and committed snapshot identifier when
successful.

Normalized writes are transactional. Failed validation or parsing commits the run but not a partial
snapshot. Reprocessing is tied to a known artifact fingerprint and adapter version where retention
permits; otherwise the source must be fetched again under policy.

Structured logs contain only operational metadata and correlation identifiers. Names, booking
identifiers, charge text, bond details tied to a person, raw payloads, addresses, correction
narratives, and secrets are redacted or omitted.

## Retention lineage

`OfficialSource.retention_scope` documents which records the source exposes, the approved local
display/retention window, the event that starts deletion, and evidence supporting that decision.
Snapshot and child records inherit that scope, with a deletion deadline when applicable.

Released-person information is deleted or made inaccessible no later than the approved source scope.
A person moving from current custody to absent is not automatically reclassified as released; an
explicit recent-release source is required to make that claim. Retention jobs record aggregate
counts and run identifiers, not deleted personal content.

Corrections and operational audit data follow separate, minimal retention schedules defined in the
privacy policy.

## Synthetic fixture controls

Test fixtures use conspicuously fictional names and non-real identifiers from reserved patterns.
They contain no copied source HTML, real facility contact details, real booking facts, or live
endpoints. Fixture metadata marks `synthetic: true`, uses `example.test`, and uses deterministic
fixed dates.

Production startup and build validation reject synthetic sources, snapshots, evidence, and fixture
flags. CI scans fixture fields for prohibited real-data patterns and verifies the explicit synthetic
marker.

## Provenance acceptance tests

Tests must prove that:

- current custody and recent release remain different scopes;
- a valid empty roster differs from fetch and parser failure;
- multiple charges stay with the correct booking;
- multiple bond entries remain separate;
- explicit no-bond differs from missing/not-published/unknown bond data;
- a displayed identifier originates from an explicitly labeled source field;
- visible freshness dates map to the correct recorded events;
- editorial and contact facts have evidence references; and
- fixtures contain no real personal custody data.
