export function syntheticId(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 999_999_999_999) {
    throw new Error("Synthetic fixture IDs require a nonnegative 12-digit integer");
  }
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

export const syntheticIds = Object.freeze({
  state: syntheticId(1),
  county: syntheticId(2),
  institution: syntheticId(3),
  facility: syntheticId(4),
  source: syntheticId(5),
  sourceEvidence: syntheticId(6),
  adapter: syntheticId(7),
  currentRun: syntheticId(8),
  currentSnapshot: syntheticId(9),
  releaseRun: syntheticId(10),
  releaseSnapshot: syntheticId(11),
  emptyRun: syntheticId(12),
  emptySnapshot: syntheticId(13),
  editorialEvidence: syntheticId(14),
  editorialBlock: syntheticId(15),
  editorialFact: syntheticId(16),
  contact: syntheticId(17),
  operation: syntheticId(18),
  publicationReview: syntheticId(19)
});
