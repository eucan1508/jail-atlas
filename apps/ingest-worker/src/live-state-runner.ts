import {
  executeLiveSource,
  type LiveJobDependencies,
  type LiveJobExecution
} from "./live-job-runner.ts";
import { runCountySequence, type CountyIngestResult } from "./county-sequence.ts";
import type { WorkerConfig } from "./config.ts";

export type LiveState = "IA" | "MN" | "TX" | "AR" | "OK";

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
    },
    {
      countySlug: "cerro-gordo",
      adapterKey: "cerro-gordo-county-iowa-current-roster",
      sourceHost: "sofiles.cerrogordo.gov"
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
    },
    {
      countySlug: "mower",
      adapterKey: "mower-county-mn-current-roster",
      sourceHost: "mower-sftp.co.mower.mn.us"
    },
    {
      countySlug: "wright",
      adapterKey: "wright-county-mn-current-roster",
      sourceHost: "www.wrightcountymn.gov"
    },
    {
      countySlug: "carlton",
      adapterKey: "carlton-county-mn-current-roster",
      sourceHost: "jailroster.co.carlton.mn.us"
    },
    {
      countySlug: "douglas",
      adapterKey: "douglas-county-mn-current-roster",
      sourceHost: "www.douglascountymn.gov"
    },
    {
      countySlug: "st-louis",
      adapterKey: "st-louis-county-mn-current-roster",
      sourceHost: "www.stlouiscountymn.gov"
    },
    {
      countySlug: "steele",
      adapterKey: "steele-county-mn-current-roster",
      sourceHost: "www.steelecountymn.gov"
    },
    {
      countySlug: "crow-wing",
      adapterKey: "crow-wing-county-mn-current-roster",
      sourceHost: "www3.crowwing.us"
    },
    {
      countySlug: "renville",
      adapterKey: "renville-county-mn-current-roster",
      sourceHost: "custody.renvillecountymn.gov"
    }
  ],
  TX: [
    {
      countySlug: "milam",
      adapterKey: "milam-county-tx-current-roster",
      sourceHost: "www.milamcountysherifftx.org"
    },
    // Hutchinson is paused: its sheriff domain stopped resolving on 2026-09-30, and the county's
    // replacement page is a hand-typed list labelled "Recently Released Inmates".
    {
      countySlug: "kendall",
      adapterKey: "kendall-county-tx-current-roster",
      sourceHost: "www.kendallcountysheriff.com"
    },
    {
      countySlug: "kleberg",
      adapterKey: "kleberg-county-tx-current-roster",
      sourceHost: "www.klebergcoso.org"
    }
  ],
  AR: [
    {
      countySlug: "jefferson",
      adapterKey: "jefferson-county-ar-current-roster",
      sourceHost: "www.jeffcoso.org"
    },
    {
      countySlug: "logan",
      adapterKey: "logan-county-ar-current-roster",
      sourceHost: "www.loganso.com"
    },
    {
      countySlug: "greene",
      adapterKey: "greene-county-ar-current-roster",
      sourceHost: "www.greenesoar.gov"
    },
    {
      countySlug: "cleburne",
      adapterKey: "cleburne-county-ar-current-roster",
      sourceHost: "www.cleburnearso.gov"
    },
    {
      countySlug: "faulkner",
      adapterKey: "faulkner-county-ar-current-roster",
      sourceHost: "www.fcso.ar.gov"
    },
    {
      countySlug: "hot-spring",
      adapterKey: "hot-spring-county-ar-current-roster",
      sourceHost: "www.hotspringcountysoar.gov"
    },
    {
      countySlug: "baxter",
      adapterKey: "baxter-county-ar-current-roster",
      sourceHost: "www.baxtercountysheriff.com"
    },
    {
      countySlug: "st-francis",
      adapterKey: "st-francis-county-ar-current-roster",
      sourceHost: "www.stfranciscountysheriff.org"
    },
    {
      countySlug: "mississippi",
      adapterKey: "mississippi-county-ar-current-roster",
      sourceHost: "www.mississippicountysheriffar.org"
    },
    {
      countySlug: "randolph",
      adapterKey: "randolph-county-ar-current-roster",
      sourceHost: "www.randolphcountysheriff.org"
    }
  ],
  OK: [
    {
      countySlug: "wagoner",
      adapterKey: "wagoner-county-ok-current-roster",
      sourceHost: "www.wagonercountyso.org"
    },
    {
      countySlug: "lincoln",
      adapterKey: "lincoln-county-ok-current-roster",
      sourceHost: "lincolncountysheriffok.gov"
    }
  ]
};

// Source sites sometimes change mid-read or publish a half-updated record; a short pause usually
// clears it, so a failed county gets one more attempt before the run is reported.
const COUNTY_RETRY_DELAY_MS = 3 * 60 * 1_000;

export interface LiveStateRetryOptions {
  readonly retryDelayMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface LiveStateExecution {
  readonly state: LiveState;
  readonly results: readonly CountyIngestResult<LiveJobExecution>[];
}

function countySucceeded(result: CountyIngestResult<LiveJobExecution>): boolean {
  return result.ok && result.value?.result.ok === true;
}

export function liveStateSucceeded(
  results: readonly CountyIngestResult<LiveJobExecution>[]
): boolean {
  return results.length > 0 && results.every(countySucceeded);
}

/**
 * Runs the approved adapter set for one state in declaration order. Each state remains explicit so
 * an unapproved county cannot be reached through a generic live-ingest path.
 */
export async function executeLiveState(
  config: WorkerConfig,
  state: LiveState,
  dependencies: LiveJobDependencies,
  retry: LiveStateRetryOptions = {}
): Promise<LiveStateExecution> {
  const sources = LIVE_STATE_SOURCES[state];
  if (sources.length === 0) {
    throw new Error(`No live source adapters are configured for state: ${state}`);
  }

  const task = (source: LiveStateSource) => ({
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
  });

  const firstPass = await runCountySequence(sources.map(task));
  const failedSources = sources.filter((_, index) => {
    const result = firstPass[index];
    return result === undefined || !countySucceeded(result);
  });
  if (failedSources.length === 0) return { state, results: firstPass };

  const sleep =
    retry.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  await sleep(retry.retryDelayMs ?? COUNTY_RETRY_DELAY_MS);
  const retried = await runCountySequence(failedSources.map(task));
  const retriedBySlug = new Map(retried.map((result) => [result.countySlug, result]));

  return {
    state,
    results: firstPass.map((result) => retriedBySlug.get(result.countySlug) ?? result)
  };
}
