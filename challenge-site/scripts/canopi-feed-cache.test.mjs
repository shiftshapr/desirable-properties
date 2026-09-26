// canopi#32: DP must not flood Canopi with parallel chapter-feed reads.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFeedCache } from '../src/lib/canopi-feed-cache.ts';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('caps concurrency, dedupes identical reads, caches only successes', async () => {
  const cache = createFeedCache({ ttlMs: 60_000, maxConcurrent: 4 });
  let active = 0; let max = 0; let calls = 0;
  const fetcher = (ok = true) => async () => {
    calls += 1; active += 1; max = Math.max(max, active);
    await sleep(5);
    active -= 1;
    return ok ? { ok: true, items: [] } : { ok: false, items: [], error: 'x' };
  };
  // 23 chapters × 3 simultaneous page renders
  await Promise.all(Array.from({ length: 69 }, (_, i) => cache.get(`dp${i % 23}`, fetcher())));
  assert.equal(calls, 23, 'identical concurrent reads must share one request');
  assert.ok(max <= 4, `max in flight ${max}`);
  await Promise.all(Array.from({ length: 23 }, (_, i) => cache.get(`dp${i}`, fetcher())));
  assert.equal(calls, 23, 'fresh results must come from cache');
  await cache.get('bad', fetcher(false));
  await cache.get('bad', fetcher(false));
  assert.equal(calls, 25, 'failures must not be cached');
});

test('expires after ttl', async () => {
  const cache = createFeedCache({ ttlMs: 10, maxConcurrent: 2 });
  let calls = 0;
  const f = async () => { calls += 1; return { ok: true, items: [] }; };
  await cache.get('k', f); await cache.get('k', f);
  assert.equal(calls, 1);
  await sleep(15);
  await cache.get('k', f);
  assert.equal(calls, 2);
});
