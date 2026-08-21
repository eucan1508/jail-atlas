CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TYPE "publication_status" AS ENUM ('draft', 'in_review', 'published', 'retired');
CREATE TYPE "official_institution_kind" AS ENUM ('county_government', 'sheriff', 'jail', 'detention_center', 'public_detention_authority');
CREATE TYPE "official_source_type" AS ENUM ('official_county', 'official_sheriff', 'official_jail', 'official_detention_authority', 'officially_linked_vendor');
CREATE TYPE "source_relationship_kind" AS ENUM ('directly_operated', 'official_link', 'official_embed', 'official_documentation');
CREATE TYPE "custody_data_scope" AS ENUM ('current_custody', 'recent_release', 'historical_booking', 'arrest_report');
CREATE TYPE "source_status" AS ENUM ('proposed', 'verification_pending', 'healthy', 'valid_empty', 'stale', 'fetch_error', 'parser_error', 'disabled');
CREATE TYPE "ingest_outcome" AS ENUM ('succeeded_with_records', 'succeeded_empty', 'fetch_failed', 'validation_failed', 'parser_failed', 'normalization_failed', 'persistence_failed');
CREATE TYPE "bond_state" AS ENUM ('monetary', 'no_bond', 'not_published', 'unknown', 'not_applicable');
CREATE TYPE "contact_kind" AS ENUM ('main_phone', 'records_phone', 'email', 'postal_address', 'physical_address', 'official_webpage');
CREATE TYPE "operation_kind" AS ENUM ('custody_lookup', 'visitation', 'mail', 'property', 'payments', 'release_information', 'accessibility', 'other');
CREATE TYPE "editorial_status" AS ENUM ('draft', 'in_review', 'approved', 'retired');
CREATE TYPE "publication_review_outcome" AS ENUM ('approved', 'changes_required', 'rejected');
CREATE TYPE "correction_category" AS ENUM ('stale_data', 'incorrect_roster_display', 'incorrect_contact', 'incorrect_guidance', 'privacy', 'other');
CREATE TYPE "correction_status" AS ENUM ('received', 'triaged', 'resolved', 'closed_no_change');
--> statement-breakpoint
CREATE TABLE "states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(2) NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "default_locale" varchar(20) NOT NULL,
  "publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "states_code_unique" ON "states" ("code");
CREATE UNIQUE INDEX "states_slug_unique" ON "states" ("slug");
--> statement-breakpoint
CREATE TABLE "counties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "state_id" uuid NOT NULL REFERENCES "states"("id") ON DELETE RESTRICT,
  "name" varchar(150) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "seat_city" varchar(150),
  "canonical_path" varchar(500) NOT NULL,
  "publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "counties_published_timestamp_check" CHECK ("publication_status" <> 'published' OR "published_at" IS NOT NULL)
);
CREATE UNIQUE INDEX "counties_state_slug_unique" ON "counties" ("state_id", "slug");
CREATE UNIQUE INDEX "counties_canonical_path_unique" ON "counties" ("canonical_path");
CREATE INDEX "counties_publication_idx" ON "counties" ("publication_status");
--> statement-breakpoint
CREATE TABLE "official_institutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "county_id" uuid NOT NULL REFERENCES "counties"("id") ON DELETE RESTRICT,
  "name" varchar(250) NOT NULL,
  "kind" "official_institution_kind" NOT NULL,
  "official_url" text NOT NULL,
  "verified_at" timestamptz NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "official_institutions_county_idx" ON "official_institutions" ("county_id");
--> statement-breakpoint
CREATE TABLE "facilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "county_id" uuid NOT NULL REFERENCES "counties"("id") ON DELETE RESTRICT,
  "official_institution_id" uuid NOT NULL REFERENCES "official_institutions"("id") ON DELETE RESTRICT,
  "name" varchar(200) NOT NULL,
  "jurisdiction_label" varchar(200) NOT NULL,
  "city" varchar(150),
  "timezone" varchar(100) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "facilities_county_idx" ON "facilities" ("county_id");
--> statement-breakpoint
CREATE TABLE "official_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "official_institution_id" uuid NOT NULL REFERENCES "official_institutions"("id") ON DELETE RESTRICT,
  "source_url" text NOT NULL,
  "source_type" "official_source_type" NOT NULL,
  "official_institution_url" text NOT NULL,
  "relationship_evidence_url" text NOT NULL,
  "evidence_description" text NOT NULL,
  "verified_at" timestamptz,
  "last_checked_at" timestamptz,
  "last_success_at" timestamptz,
  "last_error" jsonb,
  "parser_version" varchar(100) NOT NULL,
  "source_status" "source_status" NOT NULL,
  "custody_data_scope" "custody_data_scope"[] NOT NULL,
  "retention_scope" jsonb NOT NULL,
  "adapter_key" varchar(200) NOT NULL,
  "publication_approved" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "official_sources_url_unique" ON "official_sources" ("source_url");
CREATE INDEX "official_sources_status_idx" ON "official_sources" ("source_status");
--> statement-breakpoint
CREATE TABLE "source_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "official_sources"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "page_title" varchar(300) NOT NULL,
  "description" text NOT NULL,
  "relationship_kind" "source_relationship_kind" NOT NULL,
  "verified_at" timestamptz NOT NULL,
  "last_checked_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "source_evidence_source_idx" ON "source_evidence" ("source_id");
--> statement-breakpoint
CREATE TABLE "source_adapters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "official_sources"("id") ON DELETE RESTRICT,
  "adapter_key" varchar(200) NOT NULL,
  "adapter_version" varchar(100) NOT NULL,
  "parser_version" varchar(100) NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "source_adapters_source_version_unique" ON "source_adapters" ("source_id", "adapter_version");
CREATE INDEX "source_adapters_key_idx" ON "source_adapters" ("adapter_key");
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "official_sources"("id") ON DELETE RESTRICT,
  "adapter_id" uuid NOT NULL REFERENCES "source_adapters"("id") ON DELETE RESTRICT,
  "started_at" timestamptz NOT NULL,
  "finished_at" timestamptz,
  "outcome" "ingest_outcome" NOT NULL,
  "record_count" integer,
  "valid_empty_result" boolean DEFAULT false NOT NULL,
  "failure" jsonb,
  "parser_version" varchar(100) NOT NULL,
  "trace_id" varchar(100) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "ingest_runs_empty_check" CHECK ("outcome" <> 'succeeded_empty' OR "valid_empty_result" = true)
);
CREATE INDEX "ingest_runs_source_started_idx" ON "ingest_runs" ("source_id", "started_at");
--> statement-breakpoint
CREATE TABLE "custody_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "official_sources"("id") ON DELETE RESTRICT,
  "ingest_run_id" uuid NOT NULL REFERENCES "ingest_runs"("id") ON DELETE RESTRICT,
  "captured_at" timestamptz NOT NULL,
  "source_last_updated_at" timestamptz,
  "custody_scope" "custody_data_scope" NOT NULL,
  "record_count" integer NOT NULL,
  "valid_empty_result" boolean DEFAULT false NOT NULL,
  "stale" boolean DEFAULT false NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "custody_snapshots_count_check" CHECK ("record_count" >= 0),
  CONSTRAINT "custody_snapshots_empty_check" CHECK (("record_count" = 0 AND "valid_empty_result" = true) OR ("record_count" > 0 AND "valid_empty_result" = false))
);
CREATE UNIQUE INDEX "custody_snapshots_ingest_run_unique" ON "custody_snapshots" ("ingest_run_id");
CREATE INDEX "custody_snapshots_source_captured_idx" ON "custody_snapshots" ("source_id", "captured_at");
--> statement-breakpoint
CREATE TABLE "person_display_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "snapshot_id" uuid NOT NULL REFERENCES "custody_snapshots"("id") ON DELETE CASCADE,
  "display_name" varchar(250) NOT NULL,
  "source_display_text" varchar(500) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "person_display_records_snapshot_idx" ON "person_display_records" ("snapshot_id");
--> statement-breakpoint
CREATE TABLE "bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "snapshot_id" uuid NOT NULL REFERENCES "custody_snapshots"("id") ON DELETE CASCADE,
  "person_display_record_id" uuid NOT NULL REFERENCES "person_display_records"("id") ON DELETE CASCADE,
  "booking_identifier_value" varchar(200),
  "booking_identifier_source_label" varchar(100),
  "source_identifies_as_booking_identifier" boolean DEFAULT false NOT NULL,
  "custody_scope" "custody_data_scope" NOT NULL,
  "booked_at" timestamptz,
  "released_at" timestamptz,
  "facility_id" uuid NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT,
  "source_order" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "bookings_source_order_check" CHECK ("source_order" >= 0),
  CONSTRAINT "bookings_identifier_provenance_check" CHECK (("booking_identifier_value" IS NULL AND "booking_identifier_source_label" IS NULL AND "source_identifies_as_booking_identifier" = false) OR ("booking_identifier_value" IS NOT NULL AND "booking_identifier_source_label" IS NOT NULL AND "source_identifies_as_booking_identifier" = true)),
  CONSTRAINT "bookings_current_release_check" CHECK ("custody_scope" <> 'current_custody' OR "released_at" IS NULL),
  CONSTRAINT "bookings_recent_release_check" CHECK ("custody_scope" <> 'recent_release' OR "released_at" IS NOT NULL)
);
CREATE UNIQUE INDEX "bookings_snapshot_source_order_unique" ON "bookings" ("snapshot_id", "source_order");
CREATE INDEX "bookings_snapshot_idx" ON "bookings" ("snapshot_id");
--> statement-breakpoint
CREATE TABLE "charges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "sequence" integer NOT NULL,
  "description" text NOT NULL,
  "source_label" varchar(150),
  "statute_code" varchar(100),
  "disposition" varchar(300),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "charges_sequence_check" CHECK ("sequence" >= 0)
);
CREATE UNIQUE INDEX "charges_booking_sequence_unique" ON "charges" ("booking_id", "sequence");
--> statement-breakpoint
CREATE TABLE "bond_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "sequence" integer NOT NULL,
  "state" "bond_state" NOT NULL,
  "amount_minor" bigint,
  "currency" varchar(3),
  "source_label" varchar(150),
  "note" varchar(500),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "bond_entries_sequence_check" CHECK ("sequence" >= 0),
  CONSTRAINT "bond_entries_amount_state_check" CHECK (("state" = 'monetary' AND "amount_minor" IS NOT NULL AND "amount_minor" >= 0 AND "currency" IS NOT NULL) OR ("state" <> 'monetary' AND "amount_minor" IS NULL AND "currency" IS NULL))
);
CREATE UNIQUE INDEX "bond_entries_booking_sequence_unique" ON "bond_entries" ("booking_id", "sequence");
--> statement-breakpoint
CREATE TABLE "contacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "facility_id" uuid REFERENCES "facilities"("id") ON DELETE CASCADE,
  "official_institution_id" uuid NOT NULL REFERENCES "official_institutions"("id") ON DELETE CASCADE,
  "kind" "contact_kind" NOT NULL,
  "label" varchar(150) NOT NULL,
  "value" text NOT NULL,
  "evidence_id" uuid NOT NULL REFERENCES "source_evidence"("id") ON DELETE RESTRICT,
  "verified_at" timestamptz NOT NULL,
  "display_order" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "contacts_institution_idx" ON "contacts" ("official_institution_id");
--> statement-breakpoint
CREATE TABLE "operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "facility_id" uuid NOT NULL REFERENCES "facilities"("id") ON DELETE CASCADE,
  "kind" "operation_kind" NOT NULL,
  "title" varchar(200) NOT NULL,
  "guidance" text NOT NULL,
  "verified_at" timestamptz NOT NULL,
  "display_order" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "operations_facility_idx" ON "operations" ("facility_id");
CREATE TABLE "operation_evidence" (
  "operation_id" uuid NOT NULL REFERENCES "operations"("id") ON DELETE CASCADE,
  "evidence_id" uuid NOT NULL REFERENCES "source_evidence"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("operation_id", "evidence_id")
);
--> statement-breakpoint
CREATE TABLE "editorial_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "county_id" uuid NOT NULL REFERENCES "counties"("id") ON DELETE CASCADE,
  "official_institution_id" uuid NOT NULL REFERENCES "official_institutions"("id") ON DELETE RESTRICT,
  "url" text NOT NULL,
  "page_title" varchar(300) NOT NULL,
  "source_purpose" text NOT NULL,
  "evidence_description" text NOT NULL,
  "vendor_involved" boolean DEFAULT false NOT NULL,
  "relationship_evidence_url" text,
  "verified_at" timestamptz NOT NULL,
  "last_checked_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "editorial_evidence_vendor_check" CHECK ("vendor_involved" = false OR "relationship_evidence_url" IS NOT NULL)
);
CREATE INDEX "editorial_evidence_county_idx" ON "editorial_evidence" ("county_id");
--> statement-breakpoint
CREATE TABLE "editorial_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "county_id" uuid NOT NULL REFERENCES "counties"("id") ON DELETE CASCADE,
  "block_key" varchar(150) NOT NULL,
  "heading" varchar(200) NOT NULL,
  "summary" text NOT NULL,
  "status" "editorial_status" DEFAULT 'draft' NOT NULL,
  "reviewed_at" timestamptz,
  "reviewer_reference" varchar(200),
  "display_order" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "editorial_blocks_approval_check" CHECK ("status" <> 'approved' OR ("reviewed_at" IS NOT NULL AND "reviewer_reference" IS NOT NULL))
);
CREATE UNIQUE INDEX "editorial_blocks_county_key_unique" ON "editorial_blocks" ("county_id", "block_key");
CREATE TABLE "editorial_facts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "block_id" uuid NOT NULL REFERENCES "editorial_blocks"("id") ON DELETE CASCADE,
  "statement" text NOT NULL,
  "as_of" timestamptz,
  "display_order" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "editorial_facts_block_idx" ON "editorial_facts" ("block_id");
CREATE TABLE "editorial_fact_evidence" (
  "fact_id" uuid NOT NULL REFERENCES "editorial_facts"("id") ON DELETE CASCADE,
  "evidence_id" uuid NOT NULL REFERENCES "editorial_evidence"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("fact_id", "evidence_id")
);
--> statement-breakpoint
CREATE TABLE "publication_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "county_id" uuid NOT NULL REFERENCES "counties"("id") ON DELETE RESTRICT,
  "outcome" "publication_review_outcome" NOT NULL,
  "checklist" jsonb NOT NULL,
  "reviewer_reference" varchar(200) NOT NULL,
  "reviewed_at" timestamptz NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "publication_reviews_county_idx" ON "publication_reviews" ("county_id");
--> statement-breakpoint
CREATE TABLE "correction_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "county_id" uuid REFERENCES "counties"("id") ON DELETE SET NULL,
  "category" "correction_category" NOT NULL,
  "description" text NOT NULL,
  "contact_email" varchar(320),
  "source_page_path" varchar(500) NOT NULL,
  "status" "correction_status" DEFAULT 'received' NOT NULL,
  "submitted_at" timestamptz NOT NULL,
  "resolved_at" timestamptz,
  "spam_risk" numeric(4, 3) NOT NULL,
  "submitter_fingerprint" varchar(200) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "correction_requests_spam_risk_check" CHECK ("spam_risk" >= 0 AND "spam_risk" <= 1)
);
CREATE INDEX "correction_requests_status_idx" ON "correction_requests" ("status", "submitted_at");
