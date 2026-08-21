# Product principles

## Purpose

This product is an independent public-information utility for verifying county custody information.
It helps a person find the correct county page, understand whether the data is current, identify the
official institution behind it, interpret booking, charge, and bond fields without changing their
meaning, find verified facility information, and report a concern.

The product is not a government service, law-enforcement agency, legal service, background-check
provider, or notification service. Every public surface must make independence clear without using
alarmist disclaimers or visual cues that could imply official authority.

`BRAND_NAME` and `PRODUCTION_DOMAIN` are deployment configuration, not editorial facts. Phase 1
examples use `example.test`; no permanent name or domain is assumed.

## Product promise

Evidence and freshness are the advantage. Coverage volume is not.

1. **Publish only what can be defended.** A county is public only after its official-source
   relationship, fetch behavior, parser behavior, field provenance, contact details, county-specific
   editorial value, and human review all satisfy the publication policy.
2. **Show the state of the evidence.** Users can see what the source covers, who operates it, when
   it was checked, when it last succeeded, and whether the displayed snapshot is current, stale,
   empty, or unavailable.
3. **Preserve meaning.** Source values are normalized for display and querying, never editorially
   upgraded. Absence is not a negative fact: a missing bond value is not “No Bond,” and a missing
   release record is not proof of custody.
4. **Design for completion.** The primary journey is county selection, freshness check, roster
   review, source interpretation, verified contact information, and correction reporting. Pages stay
   concise and county-specific.
5. **Protect people by default.** The application has no permanent person-profile pages,
   booking-history archive, or mugshot gallery. Personal custody data is excluded from search
   snippets and is retained only within an approved source scope and documented policy.
6. **Work without fragile dependencies.** Visitor requests never fetch or parse an external roster.
   Approved ingestion jobs write validated snapshots to PostgreSQL; the web application reads those
   records.
7. **Remain useful without JavaScript.** The first roster page and all essential editorial and
   contact information render on the server. JavaScript enhances progressive loading but is not
   required to understand the page.
8. **Make failure honest.** A valid zero-result roster, source request failure, parser failure, and
   stale snapshot are separate product states with different messaging and operational responses.
9. **Add coverage deliberately.** The MVP includes Iowa and a single synthetic Scott County vertical
   slice. County onboarding is one at a time. No inactive-state, inactive-county, nationwide, or
   “coming soon” pages are generated.
10. **Keep code release separate from data refresh.** An ingestion run can update validated records
    without a Git commit or web deployment. A code deployment does not imply a new data verification
    event.

## User-centered decision rules

When product goals conflict, decide in this order:

1. Prevent a misleading custody, charge, bond, source, freshness, or affiliation claim.
2. Protect personal data and minimize retention.
3. Preserve access for disabled users and users on limited devices or connections.
4. Help the user complete the verification task with minimal cognitive load.
5. Preserve a single, stable, indexable county document.
6. Improve operational maintainability and performance.
7. Expand coverage only after every higher-priority condition holds.

Traffic, page count, engagement time, and roster-record count are never success criteria by
themselves.

## Content and interaction constraints

- Use plain, factual language and visible source attribution.
- Distinguish custody data from court disposition, conviction, release eligibility, and notification
  services.
- Do not offer legal conclusions or instructions unsupported by official evidence.
- Do not fabricate identifiers, dates, charges, bonds, addresses, phone numbers, hours, or
  procedures.
- Do not create keyword variants, location permutations, generic state filler, repeated FAQs, or
  artificial answer fragments.
- Do not use police, incarceration, emergency, or mugshot visual clichés.
- Do not show ads or blocking third-party scripts in the MVP.
- Do not expose opaque cursors in browser history or internal HTML links.
- Return a real `404` for a county that has not passed publication review.

## Phase boundaries

### Phase 1: foundation and synthetic verification

Phase 1 uses only clearly labeled, fictional data. It establishes the workspace, contracts, schema,
design system, private design lab, one Scott County vertical slice, load-more behavior, policies,
and tests. Synthetic data must never be deployed or represented as live county data.

### Phase 2: official source integration

Phase 2 is blocked until explicit approval and a separate evidence packet. It requires live endpoint
verification, source-policy approval, source-specific fixtures, regression tests, and field-by-field
review. Phase 1 does not connect to a real Scott County source.

### Phase 3: production readiness

Phase 3 is blocked until source ingestion and editorial review are approved. Production
infrastructure, monitoring, analytics, search-console configuration, sitemap submission, deployment,
and live verification belong here.

## Definition of a trustworthy release

A release is trustworthy when its visible claims can be traced to recorded evidence, its freshness
language reflects real events, its failure states cannot be confused with an empty roster, its
personal-data exposure is minimized, its primary workflows meet WCAG 2.2 AA, and automated tests
enforce the publication and indexation contracts.
