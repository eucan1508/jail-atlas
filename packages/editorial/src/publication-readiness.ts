import {
  PublicationReviewSchema,
  type PublicationChecklist,
  type PublicationReview
} from "@jail-atlas/domain";

export type PublicationRequirement = keyof PublicationChecklist;

export interface PublicationReadiness {
  readonly ready: boolean;
  readonly unmetRequirements: readonly PublicationRequirement[];
  readonly review: PublicationReview;
}

export function assessPublicationReadiness(input: PublicationReview): PublicationReadiness {
  const review = PublicationReviewSchema.parse(input);
  const unmetRequirements = Object.entries(review.checklist)
    .filter(([, satisfied]) => !satisfied)
    .map(([requirement]) => requirement as PublicationRequirement);
  return {
    ready: review.outcome === "approved" && unmetRequirements.length === 0,
    unmetRequirements,
    review
  };
}
