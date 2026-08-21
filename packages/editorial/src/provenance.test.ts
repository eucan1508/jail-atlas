import { describe, expect, it } from "vitest";

import { validateEditorialProvenance } from "./provenance.js";

const ids = {
  county: "00000000-0000-4000-8000-000000000001",
  institution: "00000000-0000-4000-8000-000000000002",
  evidence: "00000000-0000-4000-8000-000000000003",
  block: "00000000-0000-4000-8000-000000000004",
  fact: "00000000-0000-4000-8000-000000000005"
};

const editorialPackage = {
  evidence: [
    {
      id: ids.evidence,
      countyId: ids.county,
      officialInstitutionId: ids.institution,
      url: "https://official.example.test/synthetic-guidance/",
      pageTitle: "Synthetic official guidance fixture",
      sourcePurpose: "Supports a synthetic operational fact for tests.",
      evidenceDescription: "Synthetic evidence; never publish.",
      vendorInvolved: false,
      relationshipEvidenceUrl: null,
      verifiedAt: "2000-01-01T12:00:00.000Z",
      lastCheckedAt: "2000-01-01T12:00:00.000Z"
    }
  ],
  blocks: [
    {
      id: ids.block,
      countyId: ids.county,
      blockKey: "synthetic-guidance",
      heading: "Synthetic guidance",
      summary: "Synthetic editorial content for provenance contract tests.",
      facts: [
        {
          id: ids.fact,
          statement: "This is a synthetic fact and is not public guidance.",
          evidenceIds: [ids.evidence],
          asOf: "2000-01-01T12:00:00.000Z"
        }
      ],
      status: "approved" as const,
      reviewedAt: "2000-01-01T12:00:00.000Z",
      reviewerReference: "SYNTHETIC-REVIEWER-REFERENCE",
      displayOrder: 0
    }
  ]
};

describe("editorial provenance", () => {
  it("accepts a county-specific fact with resolvable official evidence", () => {
    expect(validateEditorialProvenance(editorialPackage).valid).toBe(true);
  });

  it("rejects a fact whose evidence reference is missing", () => {
    const result = validateEditorialProvenance({
      ...editorialPackage,
      blocks: [
        {
          ...editorialPackage.blocks[0]!,
          facts: [
            {
              ...editorialPackage.blocks[0]!.facts[0]!,
              evidenceIds: ["00000000-0000-4000-8000-000000000099"]
            }
          ]
        }
      ]
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0]?.code).toBe("missing_evidence");
  });

  it("requires official relationship evidence when a vendor is involved", () => {
    const result = validateEditorialProvenance({
      ...editorialPackage,
      evidence: [
        {
          ...editorialPackage.evidence[0]!,
          vendorInvolved: true,
          relationshipEvidenceUrl: null
        }
      ]
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.code === "vendor_relationship_missing")).toBe(
        true
      );
    }
  });
});
