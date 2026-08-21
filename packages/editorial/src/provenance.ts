import {
  EditorialBlockSchema,
  EditorialEvidenceSchema,
  type EditorialBlock,
  type EditorialEvidence
} from "@jail-atlas/domain";
import { z } from "zod";

export const EditorialPackageSchema = z.object({
  blocks: z.array(EditorialBlockSchema),
  evidence: z.array(EditorialEvidenceSchema)
});
export type EditorialPackage = z.infer<typeof EditorialPackageSchema>;

export interface ProvenanceIssue {
  readonly code:
    "duplicate_evidence" | "missing_evidence" | "county_mismatch" | "vendor_relationship_missing";
  readonly blockId?: string;
  readonly factId?: string;
  readonly evidenceId?: string;
  readonly message: string;
}

export type ProvenanceValidation =
  | Readonly<{ valid: true; blocks: readonly EditorialBlock[] }>
  | Readonly<{ valid: false; issues: readonly ProvenanceIssue[] }>;

export function validateEditorialProvenance(input: EditorialPackage): ProvenanceValidation {
  const parsed = EditorialPackageSchema.parse(input);
  const issues: ProvenanceIssue[] = [];
  const evidenceById = new Map<string, EditorialEvidence>();

  for (const evidence of parsed.evidence) {
    if (evidenceById.has(evidence.id)) {
      issues.push({
        code: "duplicate_evidence",
        evidenceId: evidence.id,
        message: "Evidence identifiers must be unique within an editorial package."
      });
    }
    evidenceById.set(evidence.id, evidence);
    if (evidence.vendorInvolved && evidence.relationshipEvidenceUrl === null) {
      issues.push({
        code: "vendor_relationship_missing",
        evidenceId: evidence.id,
        message: "Vendor evidence requires an official relationship-evidence URL."
      });
    }
  }

  for (const block of parsed.blocks) {
    for (const fact of block.facts) {
      for (const evidenceId of fact.evidenceIds) {
        const evidence = evidenceById.get(evidenceId);
        if (!evidence) {
          issues.push({
            code: "missing_evidence",
            blockId: block.id,
            factId: fact.id,
            evidenceId,
            message: "Every editorial fact must resolve to recorded official evidence."
          });
          continue;
        }
        if (evidence.countyId !== block.countyId) {
          issues.push({
            code: "county_mismatch",
            blockId: block.id,
            factId: fact.id,
            evidenceId,
            message: "Editorial facts cannot borrow evidence from another county."
          });
        }
      }
    }
  }

  return issues.length > 0 ? { valid: false, issues } : { valid: true, blocks: parsed.blocks };
}

export interface VisibleSourceAttribution {
  readonly officialInstitutionId: string;
  readonly officialPageTitle: string;
  readonly sourcePurpose: string;
  readonly verificationDate: string;
  readonly vendorInvolved: boolean;
  readonly officialRelationshipEvidence: string | null;
  readonly sourceUrl: string;
}

export function buildVisibleSourceAttributions(
  evidence: readonly EditorialEvidence[]
): readonly VisibleSourceAttribution[] {
  return evidence.map((item) => ({
    officialInstitutionId: item.officialInstitutionId,
    officialPageTitle: item.pageTitle,
    sourcePurpose: item.sourcePurpose,
    verificationDate: item.verifiedAt,
    vendorInvolved: item.vendorInvolved,
    officialRelationshipEvidence: item.relationshipEvidenceUrl,
    sourceUrl: item.url
  }));
}
