/**
 * Morpheus analysis fetching with an on-disk cache, for precomputing the
 * passage's form→analyses map at import time.
 *
 * The morpheus-api container (`http://localhost:1315/latin/:word?opts=S`)
 * is a single-threaded service, so requests are batched politely: at most
 * `concurrency` (default 4) in flight, with a small pause between batches.
 *
 * The cache maps form → RAW response body (the Perseus-format text, empty
 * string for unknown words). It is committed at `texts/cache/analyses.json`
 * so re-runs need no network and the data stays reviewable. Parsed
 * analyses are produced on demand with `parseMorpheus` from @lego/shared.
 *
 * `fetchRaw` is injectable: the CLI supplies the HTTP implementation,
 * tests supply fixture maps.
 */

/** Fetch the raw morpheus response body for one form ("" = unknown). */
export type RawFetch = (form: string) => Promise<string>;

export interface AnalyzeOptions {
  fetchRaw: RawFetch;
  /** form → raw body; entries present here are not re-fetched */
  cache: Record<string, string>;
  /** max in-flight requests (default 4 — be nice to the service) */
  concurrency?: number;
  /** pause between batches in ms (default 50) */
  delayMs?: number;
  /** progress callback */
  onProgress?: (done: number, total: number) => void;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ensure every form in `forms` has an entry in the cache, fetching the
 * missing ones through `fetchRaw`. Returns the merged cache (the input
 * object is mutated and also returned, for incremental saves).
 */
export async function analyzeForms(
  forms: readonly string[],
  options: AnalyzeOptions,
): Promise<Record<string, string>> {
  const { fetchRaw, cache } = options;
  const concurrency = options.concurrency ?? 4;
  const delayMs = options.delayMs ?? 50;

  const missing = forms.filter((form) => !(form in cache));
  let done = 0;
  for (let i = 0; i < missing.length; i += concurrency) {
    const batch = missing.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (form) => {
        cache[form] = await fetchRaw(form);
        done += 1;
        options.onProgress?.(done, missing.length);
      }),
    );
    if (i + concurrency < missing.length) await sleep(delayMs);
  }
  return cache;
}

/** Live morpheus-api fetch implementation for the CLI. */
export function morpheusFetch(baseUrl: string): RawFetch {
  return async (form: string): Promise<string> => {
    const url = `${baseUrl.replace(/\/$/, '')}/latin/${encodeURIComponent(form)}?opts=S`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`morpheus ${response.status} for ${url}`);
    }
    return response.text();
  };
}
