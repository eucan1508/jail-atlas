import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  bondEntries,
  bookings,
  charges,
  correctionRequests,
  custodySnapshots,
  editorialBlocks,
  editorialEvidence,
  facilities,
  ingestRuns,
  officialInstitutions,
  officialSources,
  publicationReviews,
  sourceAdapters,
  sourceEvidence
} from "./schema.js";

describe("database schema", () => {
  it("defines the evidence and custody entities as separate tables", () => {
    expect(
      [
        facilities,
        officialInstitutions,
        officialSources,
        sourceEvidence,
        sourceAdapters,
        ingestRuns,
        custodySnapshots,
        bookings,
        charges,
        bondEntries,
        editorialBlocks,
        editorialEvidence,
        publicationReviews,
        correctionRequests
      ].map(getTableName)
    ).toEqual([
      "facilities",
      "official_institutions",
      "official_sources",
      "source_evidence",
      "source_adapters",
      "ingest_runs",
      "custody_snapshots",
      "bookings",
      "charges",
      "bond_entries",
      "editorial_blocks",
      "editorial_evidence",
      "publication_reviews",
      "correction_requests"
    ]);
  });
});
