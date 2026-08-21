import {
  IngestRunSchema,
  OfficialSourceSchema,
  SourceAdapterRecordSchema,
  SourceEvidenceSchema
} from "@jail-atlas/domain";

import { SYNTHETIC_FIXTURE_TIME } from "./geography.js";
import { syntheticIds } from "./ids.js";

export const syntheticOfficialSource = OfficialSourceSchema.parse({
  id: syntheticIds.source,
  officialInstitutionId: syntheticIds.institution,
  sourceUrl: "https://roster.example.test/iowa/scott-county/current/",
  sourceType: "officially_linked_vendor",
  officialInstitutionUrl: "https://official.example.test/iowa/scott-county/",
  relationshipEvidenceUrl: "https://official.example.test/iowa/scott-county/custody-link/",
  evidenceDescription:
    "SYNTHETIC relationship evidence for contract tests; not a real source approval.",
  verifiedAt: SYNTHETIC_FIXTURE_TIME,
  lastCheckedAt: SYNTHETIC_FIXTURE_TIME,
  lastSuccessAt: SYNTHETIC_FIXTURE_TIME,
  lastError: null,
  parserVersion: "synthetic-parser-1",
  sourceStatus: "healthy",
  custodyDataScope: ["current_custody", "recent_release"],
  retentionScope: {
    kind: "source_defined_window",
    durationDays: 2,
    description: "Synthetic two-day retention window used only by tests."
  },
  adapterKey: "synthetic.scott-county.fixture",
  publicationApproved: false
});

export const syntheticSourceEvidence = SourceEvidenceSchema.parse({
  id: syntheticIds.sourceEvidence,
  sourceId: syntheticIds.source,
  url: "https://official.example.test/iowa/scott-county/custody-link/",
  pageTitle: "Synthetic custody link evidence — test only",
  description: "Synthetic official-to-vendor relationship evidence for regression tests.",
  relationshipKind: "official_link",
  verifiedAt: SYNTHETIC_FIXTURE_TIME,
  lastCheckedAt: SYNTHETIC_FIXTURE_TIME
});

export const syntheticSourceAdapterRecord = SourceAdapterRecordSchema.parse({
  id: syntheticIds.adapter,
  sourceId: syntheticIds.source,
  adapterKey: "synthetic.scott-county.fixture",
  adapterVersion: "synthetic-adapter-1",
  parserVersion: "synthetic-parser-1",
  enabled: true,
  createdAt: SYNTHETIC_FIXTURE_TIME,
  updatedAt: SYNTHETIC_FIXTURE_TIME
});

export const syntheticCurrentIngestRun = IngestRunSchema.parse({
  id: syntheticIds.currentRun,
  sourceId: syntheticIds.source,
  adapterId: syntheticIds.adapter,
  startedAt: SYNTHETIC_FIXTURE_TIME,
  finishedAt: "2000-01-01T12:00:01.000Z",
  outcome: "succeeded_with_records",
  recordCount: 52,
  validEmptyResult: false,
  failure: null,
  parserVersion: "synthetic-parser-1",
  traceId: "SYNTHETIC-CURRENT-RUN"
});

export const syntheticEmptyIngestRun = IngestRunSchema.parse({
  id: syntheticIds.emptyRun,
  sourceId: syntheticIds.source,
  adapterId: syntheticIds.adapter,
  startedAt: SYNTHETIC_FIXTURE_TIME,
  finishedAt: "2000-01-01T12:00:01.000Z",
  outcome: "succeeded_empty",
  recordCount: 0,
  validEmptyResult: true,
  failure: null,
  parserVersion: "synthetic-parser-1",
  traceId: "SYNTHETIC-EMPTY-RUN"
});
