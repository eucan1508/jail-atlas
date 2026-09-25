export interface CountyIngestTask<T> {
  readonly countySlug: string;
  readonly run: () => Promise<T>;
}

export interface CountyIngestResult<T> {
  readonly countySlug: string;
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: unknown;
}

/**
 * Runs county sources in declaration order. A single blocked or failed county
 * is recorded and does not prevent the remaining approved counties from being
 * refreshed in the same state slot.
 */
export async function runCountySequence<T>(
  tasks: readonly CountyIngestTask<T>[]
): Promise<readonly CountyIngestResult<T>[]> {
  const results: CountyIngestResult<T>[] = [];
  for (const task of tasks) {
    try {
      results.push({ countySlug: task.countySlug, ok: true, value: await task.run() });
    } catch (error) {
      results.push({ countySlug: task.countySlug, ok: false, error });
    }
  }
  return Object.freeze(results);
}
