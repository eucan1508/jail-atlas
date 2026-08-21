import type { PublicationChecklist, RedactedFailure, RetentionScope } from "@jail-atlas/domain";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "in_review",
  "published",
  "retired"
]);
export const institutionKindEnum = pgEnum("official_institution_kind", [
  "county_government",
  "sheriff",
  "jail",
  "detention_center",
  "public_detention_authority"
]);
export const sourceTypeEnum = pgEnum("official_source_type", [
  "official_county",
  "official_sheriff",
  "official_jail",
  "official_detention_authority",
  "officially_linked_vendor"
]);
export const sourceRelationshipKindEnum = pgEnum("source_relationship_kind", [
  "directly_operated",
  "official_link",
  "official_embed",
  "official_documentation"
]);
export const custodyDataScopeEnum = pgEnum("custody_data_scope", [
  "current_custody",
  "recent_release",
  "historical_booking",
  "arrest_report"
]);
export const sourceStatusEnum = pgEnum("source_status", [
  "proposed",
  "verification_pending",
  "healthy",
  "valid_empty",
  "stale",
  "fetch_error",
  "parser_error",
  "disabled"
]);
export const ingestOutcomeEnum = pgEnum("ingest_outcome", [
  "succeeded_with_records",
  "succeeded_empty",
  "fetch_failed",
  "validation_failed",
  "parser_failed",
  "normalization_failed",
  "persistence_failed"
]);
export const bondStateEnum = pgEnum("bond_state", [
  "monetary",
  "no_bond",
  "not_published",
  "unknown",
  "not_applicable"
]);
export const contactKindEnum = pgEnum("contact_kind", [
  "main_phone",
  "records_phone",
  "email",
  "postal_address",
  "physical_address",
  "official_webpage"
]);
export const operationKindEnum = pgEnum("operation_kind", [
  "custody_lookup",
  "visitation",
  "mail",
  "property",
  "payments",
  "release_information",
  "accessibility",
  "other"
]);
export const editorialStatusEnum = pgEnum("editorial_status", [
  "draft",
  "in_review",
  "approved",
  "retired"
]);
export const reviewOutcomeEnum = pgEnum("publication_review_outcome", [
  "approved",
  "changes_required",
  "rejected"
]);
export const correctionCategoryEnum = pgEnum("correction_category", [
  "stale_data",
  "incorrect_roster_display",
  "incorrect_contact",
  "incorrect_guidance",
  "privacy",
  "other"
]);
export const correctionStatusEnum = pgEnum("correction_status", [
  "received",
  "triaged",
  "resolved",
  "closed_no_change"
]);

export const states = pgTable(
  "states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 2 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    defaultLocale: varchar("default_locale", { length: 20 }).notNull(),
    publicationStatus: publicationStatusEnum("publication_status").default("draft").notNull(),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("states_code_unique").on(table.code),
    uniqueIndex("states_slug_unique").on(table.slug)
  ]
);

export const counties = pgTable(
  "counties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    seatCity: varchar("seat_city", { length: 150 }),
    canonicalPath: varchar("canonical_path", { length: 500 }).notNull(),
    publicationStatus: publicationStatusEnum("publication_status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("counties_state_slug_unique").on(table.stateId, table.slug),
    uniqueIndex("counties_canonical_path_unique").on(table.canonicalPath),
    index("counties_publication_idx").on(table.publicationStatus),
    check(
      "counties_published_timestamp_check",
      sql`${table.publicationStatus} <> 'published' OR ${table.publishedAt} IS NOT NULL`
    )
  ]
);

export const officialInstitutions = pgTable(
  "official_institutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countyId: uuid("county_id")
      .notNull()
      .references(() => counties.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 250 }).notNull(),
    kind: institutionKindEnum("kind").notNull(),
    officialUrl: text("official_url").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    active: boolean("active").default(true).notNull(),
    ...auditColumns
  },
  (table) => [index("official_institutions_county_idx").on(table.countyId)]
);

export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countyId: uuid("county_id")
      .notNull()
      .references(() => counties.id, { onDelete: "restrict" }),
    officialInstitutionId: uuid("official_institution_id")
      .notNull()
      .references(() => officialInstitutions.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 200 }).notNull(),
    jurisdictionLabel: varchar("jurisdiction_label", { length: 200 }).notNull(),
    city: varchar("city", { length: 150 }),
    timezone: varchar("timezone", { length: 100 }).notNull(),
    active: boolean("active").default(true).notNull(),
    ...auditColumns
  },
  (table) => [index("facilities_county_idx").on(table.countyId)]
);

export const officialSources = pgTable(
  "official_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    officialInstitutionId: uuid("official_institution_id")
      .notNull()
      .references(() => officialInstitutions.id, { onDelete: "restrict" }),
    sourceUrl: text("source_url").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    officialInstitutionUrl: text("official_institution_url").notNull(),
    relationshipEvidenceUrl: text("relationship_evidence_url").notNull(),
    evidenceDescription: text("evidence_description").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastError: jsonb("last_error").$type<RedactedFailure | null>(),
    parserVersion: varchar("parser_version", { length: 100 }).notNull(),
    sourceStatus: sourceStatusEnum("source_status").notNull(),
    custodyDataScope: custodyDataScopeEnum("custody_data_scope").array().notNull(),
    retentionScope: jsonb("retention_scope").$type<RetentionScope>().notNull(),
    adapterKey: varchar("adapter_key", { length: 200 }).notNull(),
    publicationApproved: boolean("publication_approved").default(false).notNull(),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("official_sources_url_unique").on(table.sourceUrl),
    index("official_sources_status_idx").on(table.sourceStatus)
  ]
);

export const sourceEvidence = pgTable(
  "source_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => officialSources.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    pageTitle: varchar("page_title", { length: 300 }).notNull(),
    description: text("description").notNull(),
    relationshipKind: sourceRelationshipKindEnum("relationship_kind").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
    ...auditColumns
  },
  (table) => [index("source_evidence_source_idx").on(table.sourceId)]
);

export const sourceAdapters = pgTable(
  "source_adapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => officialSources.id, { onDelete: "restrict" }),
    adapterKey: varchar("adapter_key", { length: 200 }).notNull(),
    adapterVersion: varchar("adapter_version", { length: 100 }).notNull(),
    parserVersion: varchar("parser_version", { length: 100 }).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("source_adapters_source_version_unique").on(table.sourceId, table.adapterVersion),
    index("source_adapters_key_idx").on(table.adapterKey)
  ]
);

export const ingestRuns = pgTable(
  "ingest_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => officialSources.id, { onDelete: "restrict" }),
    adapterId: uuid("adapter_id")
      .notNull()
      .references(() => sourceAdapters.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    outcome: ingestOutcomeEnum("outcome").notNull(),
    recordCount: integer("record_count"),
    validEmptyResult: boolean("valid_empty_result").default(false).notNull(),
    failure: jsonb("failure").$type<RedactedFailure | null>(),
    parserVersion: varchar("parser_version", { length: 100 }).notNull(),
    traceId: varchar("trace_id", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("ingest_runs_source_started_idx").on(table.sourceId, table.startedAt),
    check(
      "ingest_runs_empty_check",
      sql`${table.outcome} <> 'succeeded_empty' OR ${table.validEmptyResult} = true`
    )
  ]
);

export const custodySnapshots = pgTable(
  "custody_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => officialSources.id, { onDelete: "restrict" }),
    ingestRunId: uuid("ingest_run_id")
      .notNull()
      .references(() => ingestRuns.id, { onDelete: "restrict" }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    sourceLastUpdatedAt: timestamp("source_last_updated_at", { withTimezone: true }),
    custodyScope: custodyDataScopeEnum("custody_scope").notNull(),
    recordCount: integer("record_count").notNull(),
    validEmptyResult: boolean("valid_empty_result").default(false).notNull(),
    stale: boolean("stale").default(false).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("custody_snapshots_ingest_run_unique").on(table.ingestRunId),
    index("custody_snapshots_source_captured_idx").on(table.sourceId, table.capturedAt),
    check("custody_snapshots_count_check", sql`${table.recordCount} >= 0`),
    check(
      "custody_snapshots_empty_check",
      sql`(${table.recordCount} = 0 AND ${table.validEmptyResult} = true) OR (${table.recordCount} > 0 AND ${table.validEmptyResult} = false)`
    )
  ]
);

export const personDisplayRecords = pgTable(
  "person_display_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => custodySnapshots.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 250 }).notNull(),
    sourceDisplayText: varchar("source_display_text", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("person_display_records_snapshot_idx").on(table.snapshotId)]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => custodySnapshots.id, { onDelete: "cascade" }),
    personDisplayRecordId: uuid("person_display_record_id")
      .notNull()
      .references(() => personDisplayRecords.id, { onDelete: "cascade" }),
    bookingIdentifierValue: varchar("booking_identifier_value", { length: 200 }),
    bookingIdentifierSourceLabel: varchar("booking_identifier_source_label", {
      length: 100
    }),
    sourceIdentifiesAsBookingIdentifier: boolean("source_identifies_as_booking_identifier")
      .default(false)
      .notNull(),
    custodyScope: custodyDataScopeEnum("custody_scope").notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "restrict" }),
    sourceOrder: integer("source_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("bookings_snapshot_source_order_unique").on(table.snapshotId, table.sourceOrder),
    index("bookings_snapshot_idx").on(table.snapshotId),
    check("bookings_source_order_check", sql`${table.sourceOrder} >= 0`),
    check(
      "bookings_identifier_provenance_check",
      sql`(${table.bookingIdentifierValue} IS NULL AND ${table.bookingIdentifierSourceLabel} IS NULL AND ${table.sourceIdentifiesAsBookingIdentifier} = false) OR (${table.bookingIdentifierValue} IS NOT NULL AND ${table.bookingIdentifierSourceLabel} IS NOT NULL AND ${table.sourceIdentifiesAsBookingIdentifier} = true)`
    ),
    check(
      "bookings_current_release_check",
      sql`${table.custodyScope} <> 'current_custody' OR ${table.releasedAt} IS NULL`
    ),
    check(
      "bookings_recent_release_check",
      sql`${table.custodyScope} <> 'recent_release' OR ${table.releasedAt} IS NOT NULL`
    )
  ]
);

export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    description: text("description").notNull(),
    sourceLabel: varchar("source_label", { length: 150 }),
    statuteCode: varchar("statute_code", { length: 100 }),
    disposition: varchar("disposition", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("charges_booking_sequence_unique").on(table.bookingId, table.sequence),
    check("charges_sequence_check", sql`${table.sequence} >= 0`)
  ]
);

export const bondEntries = pgTable(
  "bond_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    state: bondStateEnum("state").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }),
    currency: varchar("currency", { length: 3 }),
    sourceLabel: varchar("source_label", { length: 150 }),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("bond_entries_booking_sequence_unique").on(table.bookingId, table.sequence),
    check("bond_entries_sequence_check", sql`${table.sequence} >= 0`),
    check(
      "bond_entries_amount_state_check",
      sql`(${table.state} = 'monetary' AND ${table.amountMinor} IS NOT NULL AND ${table.amountMinor} >= 0 AND ${table.currency} IS NOT NULL) OR (${table.state} <> 'monetary' AND ${table.amountMinor} IS NULL AND ${table.currency} IS NULL)`
    )
  ]
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id").references(() => facilities.id, {
      onDelete: "cascade"
    }),
    officialInstitutionId: uuid("official_institution_id")
      .notNull()
      .references(() => officialInstitutions.id, { onDelete: "cascade" }),
    kind: contactKindEnum("kind").notNull(),
    label: varchar("label", { length: 150 }).notNull(),
    value: text("value").notNull(),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => sourceEvidence.id, { onDelete: "restrict" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    displayOrder: integer("display_order").notNull(),
    active: boolean("active").default(true).notNull(),
    ...auditColumns
  },
  (table) => [index("contacts_institution_idx").on(table.officialInstitutionId)]
);

export const operations = pgTable(
  "operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "cascade" }),
    kind: operationKindEnum("kind").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    guidance: text("guidance").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    displayOrder: integer("display_order").notNull(),
    active: boolean("active").default(true).notNull(),
    ...auditColumns
  },
  (table) => [index("operations_facility_idx").on(table.facilityId)]
);

export const operationEvidence = pgTable(
  "operation_evidence",
  {
    operationId: uuid("operation_id")
      .notNull()
      .references(() => operations.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => sourceEvidence.id, { onDelete: "restrict" })
  },
  (table) => [primaryKey({ columns: [table.operationId, table.evidenceId] })]
);

export const editorialEvidence = pgTable(
  "editorial_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countyId: uuid("county_id")
      .notNull()
      .references(() => counties.id, { onDelete: "cascade" }),
    officialInstitutionId: uuid("official_institution_id")
      .notNull()
      .references(() => officialInstitutions.id, { onDelete: "restrict" }),
    url: text("url").notNull(),
    pageTitle: varchar("page_title", { length: 300 }).notNull(),
    sourcePurpose: text("source_purpose").notNull(),
    evidenceDescription: text("evidence_description").notNull(),
    vendorInvolved: boolean("vendor_involved").default(false).notNull(),
    relationshipEvidenceUrl: text("relationship_evidence_url"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
    ...auditColumns
  },
  (table) => [
    index("editorial_evidence_county_idx").on(table.countyId),
    check(
      "editorial_evidence_vendor_check",
      sql`${table.vendorInvolved} = false OR ${table.relationshipEvidenceUrl} IS NOT NULL`
    )
  ]
);

export const editorialBlocks = pgTable(
  "editorial_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countyId: uuid("county_id")
      .notNull()
      .references(() => counties.id, { onDelete: "cascade" }),
    blockKey: varchar("block_key", { length: 150 }).notNull(),
    heading: varchar("heading", { length: 200 }).notNull(),
    summary: text("summary").notNull(),
    status: editorialStatusEnum("status").default("draft").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewerReference: varchar("reviewer_reference", { length: 200 }),
    displayOrder: integer("display_order").notNull(),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("editorial_blocks_county_key_unique").on(table.countyId, table.blockKey),
    check(
      "editorial_blocks_approval_check",
      sql`${table.status} <> 'approved' OR (${table.reviewedAt} IS NOT NULL AND ${table.reviewerReference} IS NOT NULL)`
    )
  ]
);

export const editorialFacts = pgTable(
  "editorial_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockId: uuid("block_id")
      .notNull()
      .references(() => editorialBlocks.id, { onDelete: "cascade" }),
    statement: text("statement").notNull(),
    asOf: timestamp("as_of", { withTimezone: true }),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("editorial_facts_block_idx").on(table.blockId)]
);

export const editorialFactEvidence = pgTable(
  "editorial_fact_evidence",
  {
    factId: uuid("fact_id")
      .notNull()
      .references(() => editorialFacts.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id")
      .notNull()
      .references(() => editorialEvidence.id, { onDelete: "restrict" })
  },
  (table) => [primaryKey({ columns: [table.factId, table.evidenceId] })]
);

export const publicationReviews = pgTable(
  "publication_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countyId: uuid("county_id")
      .notNull()
      .references(() => counties.id, { onDelete: "restrict" }),
    outcome: reviewOutcomeEnum("outcome").notNull(),
    checklist: jsonb("checklist").$type<PublicationChecklist>().notNull(),
    reviewerReference: varchar("reviewer_reference", { length: 200 }).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("publication_reviews_county_idx").on(table.countyId)]
);

export const correctionRequests = pgTable(
  "correction_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countyId: uuid("county_id").references(() => counties.id, {
      onDelete: "set null"
    }),
    category: correctionCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    contactEmail: varchar("contact_email", { length: 320 }),
    sourcePagePath: varchar("source_page_path", { length: 500 }).notNull(),
    status: correctionStatusEnum("status").default("received").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    spamRisk: numeric("spam_risk", { precision: 4, scale: 3 }).notNull(),
    submitterFingerprint: varchar("submitter_fingerprint", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("correction_requests_status_idx").on(table.status, table.submittedAt),
    check(
      "correction_requests_spam_risk_check",
      sql`${table.spamRisk} >= 0 AND ${table.spamRisk} <= 1`
    )
  ]
);
