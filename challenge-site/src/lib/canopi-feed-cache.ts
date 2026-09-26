/**
 * Short-lived cache + concurrency cap for Canopi feed reads (canopi#32, 2026-09-25).
 *
 * searchCanopiPosts() fetches every chapter feed (~23) per call. On 2026-09-25 21:48–21:51
 * that became ~2,600 GET /api/messages to Canopi in 4 minutes and sidebar readers waited up
 * to 22 s. Identical reads within `ttlMs` share one result, concurrent identical reads share
 * one request, and at most `maxConcurrent` requests run at once. Failed reads are not cached.
 * No path-alias imports, so node --test can load this file directly.
 */
export type FeedCacheOptions = { ttlMs: number; maxConcurrent: number; maxEntries?: number };

export function createFeedCache<T extends { ok: boolean }>(opts: FeedCacheOptions) {
  const maxEntries = opts.maxEntries ?? 500;
  const cache = new Map<string, { at: number; value: T }>();
  const inflight = new Map<string, Promise<T>>();
  let active = 0;
  const waiting: Array<() => void> = [];

  async function withSlot<R>(fn: () => Promise<R>): Promise<R> {
    if (active >= opts.maxConcurrent) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await fn();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  }

  function get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < opts.ttlMs) return Promise.resolve(hit.value);
    const pending = inflight.get(key);
    if (pending) return pending;
    const p = withSlot(fetcher)
      .then((value) => {
        if (value.ok) {
          if (cache.size >= maxEntries) cache.delete(cache.keys().next().value as string);
          cache.set(key, { at: Date.now(), value });
        }
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  return { get, clear: () => cache.clear(), get size() { return cache.size; } };
}
