import type { CountyCoverageBrief, CoverageState } from "./coverage-catalog";
import type { CountyGuideProfile } from "./county-guides";

const stateCodes: Record<CoverageState, string> = {
  iowa: "IA",
  minnesota: "MN",
  texas: "TX",
  arkansas: "AR",
  oklahoma: "OK",
  missouri: "MO"
};

/**
 * The search result title. The state code tells apart counties that share a name across states,
 * and Texas searchers often call the roster a "jail log".
 */
export function countySearchTitle(entry: CountyCoverageBrief): string {
  const base = `${entry.county} Jail Roster (${stateCodes[entry.state]}) – Current Inmates`;
  const withJailLog = `${base} & Jail Log`;
  return entry.state === "texas" && withJailLog.length <= 60 ? withJailLog : base;
}

// Search results cut descriptions at about 160 characters.
const MAX_DESCRIPTION_LENGTH = 160;

/**
 * The search result description, written from the latest published roster when there is one.
 * The longest wording that fits is used, so long facility names lose detail rather than get cut.
 */
export function countySearchDescription({
  entry,
  profile,
  recordCount
}: {
  entry: CountyCoverageBrief;
  profile: CountyGuideProfile | undefined;
  recordCount: number | null;
}): string {
  const facility = profile?.facilityName ?? `${entry.county} Jail`;
  const state = stateCodes[entry.state];
  const places = [`${facility}, ${entry.seatCity}, ${state}`, `${facility}, ${state}`];
  const candidates =
    recordCount === null
      ? places.flatMap((place) => [
          `${place}: jail roster and inmate search from the official source, plus visiting, money, phone, and bail rules.`,
          `${place}: jail roster and inmate search, plus visiting, money, and bail rules.`
        ])
      : places.flatMap((place) => {
          const count =
            recordCount === 0
              ? "No one listed"
              : `${recordCount} ${recordCount === 1 ? "person" : "people"}`;
          return [
            `${count} in custody at ${place}. Updated twice daily from the official roster. Search names, charges, visiting, and money rules.`,
            `${count} in custody at ${place}. Updated twice daily from the official roster. Search names and charges.`,
            `${count} in custody at ${place}, updated twice daily. Search names and charges.`
          ];
        });
  return (
    candidates.find((candidate) => candidate.length <= MAX_DESCRIPTION_LENGTH) ?? candidates.at(-1)!
  );
}
