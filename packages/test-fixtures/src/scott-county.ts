import {
  syntheticCurrentCustodySnapshot,
  syntheticFetchFailure,
  syntheticParserFailure,
  syntheticRecentReleaseSnapshot,
  syntheticStaleSnapshot,
  syntheticValidEmptyAvailability,
  syntheticValidEmptySnapshot
} from "./custody.js";
import { syntheticEditorialPackage, syntheticPublicationReview } from "./editorial.js";
import {
  SYNTHETIC_FIXTURE_TIME,
  syntheticContacts,
  syntheticCounty,
  syntheticFacility,
  syntheticInstitution,
  syntheticOperations,
  syntheticState
} from "./geography.js";
import {
  syntheticCurrentIngestRun,
  syntheticOfficialSource,
  syntheticSourceAdapterRecord,
  syntheticSourceEvidence
} from "./source.js";

export const SYNTHETIC_FIXTURE_MARKER = "SYNTHETIC_TEST_DATA_ONLY" as const;

export const syntheticScottCountyFixture = Object.freeze({
  fixtureKind: "synthetic" as const,
  fixtureMarker: SYNTHETIC_FIXTURE_MARKER,
  fixtureClock: SYNTHETIC_FIXTURE_TIME,
  publicationAllowed: false as const,
  state: syntheticState,
  county: syntheticCounty,
  institution: syntheticInstitution,
  facility: syntheticFacility,
  source: syntheticOfficialSource,
  sourceEvidence: syntheticSourceEvidence,
  sourceAdapter: syntheticSourceAdapterRecord,
  ingestRun: syntheticCurrentIngestRun,
  contacts: syntheticContacts,
  operations: syntheticOperations,
  currentCustody: syntheticCurrentCustodySnapshot,
  recentRelease: syntheticRecentReleaseSnapshot,
  validEmpty: syntheticValidEmptySnapshot,
  stale: syntheticStaleSnapshot,
  fetchFailure: syntheticFetchFailure,
  parserFailure: syntheticParserFailure,
  validEmptyAvailability: syntheticValidEmptyAvailability,
  editorial: syntheticEditorialPackage,
  publicationReview: syntheticPublicationReview
});

export type SyntheticScottCountyFixture = typeof syntheticScottCountyFixture;
