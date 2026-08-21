import {
  ContactSchema,
  CountySchema,
  FacilitySchema,
  OfficialInstitutionSchema,
  OperationSchema,
  StateSchema
} from "@jail-atlas/domain";

import { syntheticIds } from "./ids.js";

export const SYNTHETIC_FIXTURE_TIME = "2000-01-01T12:00:00.000Z";

export const syntheticState = StateSchema.parse({
  id: syntheticIds.state,
  code: "IA",
  name: "Iowa",
  slug: "iowa",
  defaultLocale: "en-US",
  publicationStatus: "in_review",
  createdAt: SYNTHETIC_FIXTURE_TIME,
  updatedAt: SYNTHETIC_FIXTURE_TIME
});

export const syntheticCounty = CountySchema.parse({
  id: syntheticIds.county,
  stateId: syntheticIds.state,
  name: "Scott County",
  slug: "scott-county",
  seatCity: "Davenport",
  canonicalPath: "/iowa/scott-county/custody/",
  publicationStatus: "in_review",
  publishedAt: null,
  createdAt: SYNTHETIC_FIXTURE_TIME,
  updatedAt: SYNTHETIC_FIXTURE_TIME
});

export const syntheticInstitution = OfficialInstitutionSchema.parse({
  id: syntheticIds.institution,
  countyId: syntheticIds.county,
  name: "SYNTHETIC OFFICIAL INSTITUTION — TEST ONLY",
  kind: "county_government",
  officialUrl: "https://official.example.test/iowa/scott-county/",
  verifiedAt: SYNTHETIC_FIXTURE_TIME,
  active: true
});

export const syntheticFacility = FacilitySchema.parse({
  id: syntheticIds.facility,
  countyId: syntheticIds.county,
  officialInstitutionId: syntheticIds.institution,
  name: "SYNTHETIC CUSTODY FACILITY — TEST ONLY",
  jurisdictionLabel: "Scott County fixture jurisdiction",
  city: "Davenport",
  timezone: "America/Chicago",
  active: true,
  createdAt: SYNTHETIC_FIXTURE_TIME,
  updatedAt: SYNTHETIC_FIXTURE_TIME
});

export const syntheticContacts = [
  ContactSchema.parse({
    id: syntheticIds.contact,
    facilityId: syntheticIds.facility,
    officialInstitutionId: syntheticIds.institution,
    kind: "official_webpage",
    label: "Synthetic official contact page — test only",
    value: "https://official.example.test/iowa/scott-county/contact/",
    evidenceId: syntheticIds.sourceEvidence,
    verifiedAt: SYNTHETIC_FIXTURE_TIME,
    displayOrder: 0,
    active: true
  })
] as const;

export const syntheticOperations = [
  OperationSchema.parse({
    id: syntheticIds.operation,
    facilityId: syntheticIds.facility,
    kind: "custody_lookup",
    title: "Synthetic operational guidance — test only",
    guidance:
      "This fixture demonstrates evidence-linked guidance and is not an instruction for the public.",
    evidenceIds: [syntheticIds.sourceEvidence],
    verifiedAt: SYNTHETIC_FIXTURE_TIME,
    displayOrder: 0,
    active: true
  })
] as const;
