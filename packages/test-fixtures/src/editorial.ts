import {
  EditorialBlockSchema,
  EditorialEvidenceSchema,
  PublicationReviewSchema
} from "@jail-atlas/domain";

import { SYNTHETIC_FIXTURE_TIME } from "./geography.js";
import { syntheticIds } from "./ids.js";

export const syntheticEditorialEvidence = EditorialEvidenceSchema.parse({
  id: syntheticIds.editorialEvidence,
  countyId: syntheticIds.county,
  officialInstitutionId: syntheticIds.institution,
  url: "https://official.example.test/iowa/scott-county/synthetic-guidance/",
  pageTitle: "Synthetic county guidance — test only",
  sourcePurpose: "Exercises evidence-linked county guidance in tests.",
  evidenceDescription: "Synthetic evidence record for a non-public operational guidance fixture.",
  vendorInvolved: false,
  relationshipEvidenceUrl: null,
  verifiedAt: SYNTHETIC_FIXTURE_TIME,
  lastCheckedAt: SYNTHETIC_FIXTURE_TIME
});

export const syntheticEditorialBlock = EditorialBlockSchema.parse({
  id: syntheticIds.editorialBlock,
  countyId: syntheticIds.county,
  blockKey: "synthetic-operational-guidance",
  heading: "Synthetic operational guidance — test only",
  summary:
    "This block proves county-specific editorial provenance without presenting public instructions.",
  facts: [
    {
      id: syntheticIds.editorialFact,
      statement:
        "This statement is synthetic test content and must never be treated as operational guidance.",
      evidenceIds: [syntheticIds.editorialEvidence],
      asOf: SYNTHETIC_FIXTURE_TIME
    }
  ],
  status: "in_review",
  reviewedAt: null,
  reviewerReference: null,
  displayOrder: 0
});

export const syntheticEditorialPackage = Object.freeze({
  evidence: [syntheticEditorialEvidence] as const,
  blocks: [syntheticEditorialBlock] as const
});

export const syntheticPublicationReview = PublicationReviewSchema.parse({
  id: syntheticIds.publicationReview,
  countyId: syntheticIds.county,
  outcome: "changes_required",
  checklist: {
    currentCustodyRosterWorking: false,
    sourceIsOfficialOrOfficiallyLinked: false,
    relationshipEvidenceRecorded: false,
    liveFetchSucceeded: false,
    sourceSpecificParserTestsPassing: true,
    emptyAndFailureStatesDistinguishable: true,
    fieldProvenanceKnown: true,
    officialContactVerified: false,
    humanReviewRecorded: true,
    usefulCountySpecificContentEvidenced: false
  },
  reviewerReference: "SYNTHETIC-REVIEW-RECORD",
  reviewedAt: SYNTHETIC_FIXTURE_TIME,
  notes: "Synthetic data is never eligible for publication."
});
