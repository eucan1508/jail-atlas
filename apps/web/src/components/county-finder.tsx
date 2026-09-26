import { Button } from "@jail-atlas/ui";
import { countiesForState, type CountyCoverageBrief } from "@/lib/coverage-catalog";

export function CountyFinder({
  compact = false,
  counties = countiesForState("iowa")
}: {
  compact?: boolean;
  counties?: readonly CountyCoverageBrief[] | undefined;
}) {
  return (
    <form
      className={compact ? "county-finder county-finder--compact" : "county-finder"}
      action="/find/"
      method="get"
    >
      <div className="field-group">
        <label htmlFor={compact ? "finder-state-compact" : "finder-state"}>State</label>
        <select
          id={compact ? "finder-state-compact" : "finder-state"}
          name="state"
          defaultValue={counties[0]?.state ?? "iowa"}
        >
          {Array.from(new Set(counties.map((county) => county.state))).map((state) => (
            <option key={state} value={state}>
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="field-group">
        <label htmlFor={compact ? "finder-county-compact" : "finder-county"}>County</label>
        <select
          id={compact ? "finder-county-compact" : "finder-county"}
          name="county"
          defaultValue={counties[0]?.slug}
        >
          {counties.map((county) => (
            <option key={`${county.state}-${county.slug}`} value={county.slug}>
              {county.county}
            </option>
          ))}
        </select>
      </div>
      <Button className="county-finder__submit" type="submit">
        Find custody page
      </Button>
    </form>
  );
}
