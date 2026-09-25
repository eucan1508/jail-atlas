# Ingest scheduling plan

The production refresh is a daily state schedule with six-hour windows. The schedule is expressed in
UTC so daylight-saving changes in Iowa or Minnesota do not silently change the cadence.

## Two-state launch

| UTC slot | State     | Local county refresh work                                  |
| -------- | --------- | ---------------------------------------------------------- |
| 00:00    | Iowa      | Process the five approved Iowa counties independently      |
| 06:00    | Minnesota | Process the five approved Minnesota counties independently |
| 12:00    | Idle      | No state selected in the two-state launch                  |
| 18:00    | Idle      | No state selected in the two-state launch                  |

If the customer wants these times to mean Türkiye time, the cron entries must be shifted to 21:00
UTC (Iowa) and 03:00 UTC (Minnesota) for the current UTC+3 offset. The deployment configuration
should choose one convention explicitly.

## State batch and county isolation

The scheduler selects one state. The worker then loads only the approved sources for that state and
runs each county as an independent job. A county fetch, validation, parser, normalization, and
persistence failure must not roll back a successful neighboring county. The last successful snapshot
remains available with a stale/error status when the new source check fails.

The worker must validate the official relationship and exact current-custody scope before parsing.
It must preserve source labels for charges and bonds, reject unexpected empty responses, rate-limit
each host, redact logs, and publish only after the snapshot and publication checks pass.

## Reference implementation

The existing `county-jail` repository uses a four-hour state rotation in
[refresh-roster-data.yml](C:/Users/comez/Desktop/county-jail/.github/workflows/refresh-roster-data.yml)
and source-specific connector configurations in
[sources_by_state](C:/Users/comez/Desktop/county-jail/sources/sources_by_state). We are borrowing
its failure isolation and connector audit ideas, while keeping this project's Neon schema and
no-person-profile retention rules.
