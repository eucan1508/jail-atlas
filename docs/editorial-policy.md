# Editorial policy

## Editorial purpose

Editorial content exists to help a visitor interpret a county’s custody source and complete a
practical task. It does not exist to reach a word count, create location-keyword inventory, retell
generic criminal-law information, or make the product appear more authoritative than its evidence.

The product is independently operated and is not a government website, law-enforcement agency, legal
service, court, background-check service, or notification service. This distinction appears clearly
on relevant public pages and shapes the tone of every statement.

Phase 1 content is written for a synthetic Scott County demonstration. It may describe the product
and its modeled behavior, but it may not state real county facts, use real contacts, or be deployed
as live information.

## Standards for a publishable statement

A factual county statement must be:

- **specific:** it says exactly which institution, facility, source, audience, or operation it
  concerns;
- **useful:** it supports a realistic custody-verification or facility-contact task;
- **supported:** it cites eligible official evidence at the fact or block level;
- **faithful:** it preserves scope, conditions, uncertainty, and source terminology;
- **current or dated:** it has a verified event date and a review trigger;
- **reviewed:** a human has approved the content and its evidence relationship; and
- **non-duplicative:** it adds information not already stated more clearly nearby.

If any condition fails, remove the statement or replace it with a truthful explanation of what is
unknown and an evidenced contact path.

## Source standard

County facts may come only from an official county government, sheriff, jail/detention center,
public detention authority, or a vendor page whose official relationship is documented by the
eligible institution. The source record must identify the institution, page title, page purpose,
verification date, vendor role, and relationship evidence.

Secondary directories, aggregators, search snippets, marketing sites, bail-bond pages, and
unofficial summaries cannot support a factual statement. A page that merely looks official is not
enough.

## Content model

An `EditorialBlock` is a versioned, typed unit such as scope note, interpretation note, facility
guidance, operational guidance, source explanation, correction guidance, or useful question. Blocks
belong to an exact county or to a clearly identified product-policy context.

Facts within a block reference `EditorialEvidence`. A single evidence link at the bottom of a long
article is insufficient when claims come from different pages or were verified at different times.
Conditions with a meaningful consequence—hours, eligibility, required documents, prohibited items,
fees, address purposes, or procedural steps—receive fact-level evidence.

Every block stores or derives:

- stable internal key and content version;
- jurisdiction and intended page location;
- evidence references;
- authoring and review status;
- `reviewed_at` and next review trigger;
- reviewer as an accountable internal actor, not a fabricated public biography; and
- expiry or invalidation state where applicable.

## County-page hierarchy

The Scott County page follows the user’s decision sequence:

1. breadcrumb;
2. county, facility, and jurisdiction identity;
3. current source status and freshness;
4. plain-language custody scope;
5. roster controls and active count;
6. roster results;
7. interpretation notes;
8. verified facility/contact information;
9. evidenced county-specific operational guidance;
10. method and sources;
11. correction/reporting action; and
12. questions only when their evidenced answers are genuinely useful.

The hierarchy is not a quota. Empty headings, a fixed number of sections, and repeated explanations
are prohibited. Loading additional roster records appends records only and never repeats editorial,
source, contact, or question content.

## Voice and language

Use calm, direct, nonjudgmental language. Prefer “the source lists,” “the roster reports,” or “the
last successful fetch was” over assertions that exceed the evidence. Use “person” or the source’s
precise neutral record label where necessary; avoid sensational, dehumanizing, or guilt-implying
language.

Make uncertainty explicit without vague boilerplate:

- “Bond information was not published for this booking” when the source’s policy supports that
  state.
- “Bond information is unknown” when the available response is ambiguous.
- “The source could not be reached during the latest check” for a fetch failure.
- “The source response could not be interpreted safely” for a parser failure.
- “The source returned a valid roster with no current-custody records” only after source-specific
  empty validation.

Do not convert custody into conviction, charges into findings of guilt, an arrest report into
current custody, absence from a roster into release, or a bond amount into release eligibility. The
product does not offer legal advice.

## Dates and freshness language

Use event-specific labels:

- “Official relationship verified” for `verified_at`;
- “Source last checked” for `last_checked_at`;
- “Last successful roster update” for `last_success_at`; and
- “Editorial content reviewed” for `reviewed_at`.

Do not use “updated today,” “live,” “real-time,” or “current” unless the recorded source behavior
and threshold support the exact claim. Do not refresh dates on build, request, or inconsequential
copy edit.

Freshness messages state the observed age, source status, and user consequence. A stale but
displayable last snapshot must not visually resemble a freshly verified roster.

## Contacts and operational guidance

Label each contact by institution and purpose. Do not repeat a general phone number throughout the
page or imply that it handles visitation, court, medical, release, or records questions unless
official evidence says so.

Operational content includes only verified, county-specific facts needed for the task. Preserve
audience, location, hours, prerequisites, exceptions, and effective dates. When a procedure is
complex or likely to change, summarize only the stable verified point and link to the official page.

Do not fabricate addresses, numbers, hours, fees, booking identifiers, visiting rules, mail formats,
deposit options, transportation instructions, or release procedures.

## Useful questions

A question is included only when:

1. a visitor reasonably needs the answer;
2. official evidence supports a concise answer;
3. the answer adds something not already clear nearby; and
4. the framing does not imply legal advice or certainty beyond the source.

Questions are ordinary visible content. They do not receive FAQ structured data and are not
generated as keyword permutations. Remove a question if its answer becomes duplicate, stale, or
unsupported.

## Automation and human review

Automation may fetch approved sources, detect changes, validate structure, normalize reviewed
fields, flag stale evidence, and suggest draft summaries. Automation does not approve a source
relationship, invent missing meaning, publish a county, or make an unsupported legal or custody
inference.

Before publication, a human reviewer checks the source chain, every consequential fact, dates,
vendor disclosure, custody/retention scope, links, display in context, and accessible wording.
Review records state what was reviewed, not professional credentials the product cannot
substantiate.

Material source, scope, contact, parser, policy, or content changes reopen review. Automated
evidence expiry unpublishes or suppresses the dependent block according to policy; it does not roll
the verification date forward.

## Corrections

The correction path is visible and usable without requiring a person to publish sensitive
information. It accepts a minimal category, affected page, concise description, optional reply
address, and spam-protection fields. Guidance asks users not to submit Social Security numbers,
birth dates, medical information, credentials, or unnecessary booking details.

Correction intake is triaged by potential harm and evidence:

1. acknowledge receipt without admitting or denying a custody fact;
2. minimize and restrict the submission;
3. compare the claim against the approved official source and evidence;
4. temporarily suppress content when credible harm or provenance failure warrants it;
5. record the decision and evidence;
6. correct the displayed fact and its provenance, not merely the wording; and
7. notify the submitter only if a reply was requested and permitted.

The product does not promise removal of official public information on demand, but it honors its
retention scope, corrects transformation errors, and stops publishing information that no longer
satisfies policy.

## Prohibited editorial patterns

- Generic state or county jail essays.
- Word-count targets and filler paragraphs.
- Rephrased versions of the same answer.
- Keyword/location permutations.
- Unsupported “most accurate,” “official,” “real-time,” or “complete” claims.
- Fabricated staff, expertise, awards, testimonials, endorsements, or affiliations.
- Legal conclusions, predictions, or advice.
- Guilt-implying language or sensational descriptions.
- Copying source prose beyond the minimum necessary; prefer precise summaries and direct official
  links.
- Hidden text or structured data not represented visibly.
- Public synthetic content.

## Review checklist

An editor may approve a block only after confirming the jurisdiction, institution, source
eligibility, relationship evidence, claim-to-evidence mapping, scope, dates, transformation
fidelity, contact purpose, accessible link text, non-duplication, privacy/retention fit, and visible
independence statement. County publication additionally requires the complete source-publication
gate.
