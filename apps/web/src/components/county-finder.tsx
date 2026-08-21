import { Button } from "@jail-atlas/ui";

export function CountyFinder({ compact = false }: { compact?: boolean }) {
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
          defaultValue="iowa"
        >
          <option value="iowa">Iowa</option>
        </select>
      </div>
      <div className="field-group">
        <label htmlFor={compact ? "finder-county-compact" : "finder-county"}>County</label>
        <select
          id={compact ? "finder-county-compact" : "finder-county"}
          name="county"
          defaultValue="scott-county"
        >
          <option value="scott-county">Scott County</option>
        </select>
      </div>
      <Button className="county-finder__submit" type="submit">
        Find custody page
      </Button>
    </form>
  );
}
