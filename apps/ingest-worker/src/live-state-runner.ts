import {
  executeLiveSource,
  type LiveJobDependencies,
  type LiveJobExecution
} from "./live-job-runner.ts";
import { runCountySequence, type CountyIngestResult } from "./county-sequence.ts";
import type { WorkerConfig } from "./config.ts";

export type LiveState = "IA" | "MN";

type LiveStateSource = Readonly<{
  countySlug: string;
  adapterKey: string;
  sourceHost: string;
}>;

const LIVE_STATE_SOURCES: Readonly<Record<LiveState, readonly LiveStateSource[]>> = {
  IA: [
    {
      countySlug: "dallas",
      adapterKey: "dallas-newworld-inmate-inquiry",
      sourceHost: "inmates.dallascountyiowa.gov"
    },
    {
      countySlug: "cedar",
      adapterKey: "cedar-county-iowa-current-roster",
      sourceHost: "cedarcounty.iowa.gov"
    },
    {
      countySlug: "black-hawk",
      adapterKey: "black-hawk-county-iowa-current-roster",
      sourceHost: "www.bhcso.org"
    }
  ],
  MN: [
    {
      countySlug: "ramsey",
      adapterKey: "ramsey-county-mn-current-roster",
      sourceHost: "opendata.ramseycountymn.gov"
    },
    {
      countySlug: "stearns",
      adapterKey: "stearns-county-mn-current-roster",
      sourceHost: "jailroster.stearnscountymn.gov"
    },
    {
      countySlug: "anoka",
      adapterKey: "anoka-county-mn-current-roster",
      sourceHost: "incustodysearch.co.anoka.mn.us"
    }
  ]
};

export interface LiveStateExecution {
  readonly state: LiveState;
  readonly results: readonly CountyIngestResult<LiveJobExecution>[];
}

export function liveStateSucceeded(
  results: readonly CountyIngestResult<LiveJobExecution>[]
): boolean {
  return (
    results.length > 0 && results.every((result) => result.ok && result.value?.result.ok === true)
  );
}

/**
 * Runs the approved adapter set for one state in declaration order. Each state remains explicit so
 * an unapproved county cannot be reached through a generic live-ingest path.
 */
export async function executeLiveState(
  config: WorkerConfig,
  state: LiveState,
  dependencies: LiveJobDependencies
): Promise<LiveStateExecution> {
  const sources = LIVE_STATE_SOURCES[state];
  if (sources.length === 0) {
    throw new Error(`No live source adapters are configured for state: ${state}`);
  }

  const results = await runCountySequence(
    sources.map((source) => ({
      countySlug: source.countySlug,
      run: () =>
        executeLiveSource(
          {
            ...config,
            liveSourceAdapterKey: source.adapterKey,
            sourceHostAllowlist: [source.sourceHost]
          },
          dependencies
        )
    }))
  );

  return { state, results };
}
