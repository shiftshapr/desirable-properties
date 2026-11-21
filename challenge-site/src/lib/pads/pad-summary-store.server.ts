/**
 * Runtime store for proposal pad summaries (dp_pad_summary, DP Postgres), read in front of the bundled seed JSON.
 * The scheduled generator writes the table (scripts/generate-proposal-pad-summaries.mjs --db); the app only reads it,
 * and reads never run DDL. Rules are in pad-summary-core.ts.
 *
 * List pages render many pads, so the whole table (one row per proposal) is read once and memoised for
 * CACHE_TTL_MS; concurrent requests share one query, and a failed read falls back to the seed for FAILURE_TTL_MS.
 */
import 'server-only';
import seed from '@/data/proposal-pad-summaries.json';
import { getDpPool } from '@/lib/dp-db';
import { pickSummary, pickTitle, readSummaryRows, seedRows, type SummaryRow } from '@/lib/pads/pad-summary-core';

const CACHE_TTL_MS = 60_000;
const FAILURE_TTL_MS = 15_000;

const SEED = seedRows(seed as Parameters<typeof seedRows>[0]);

let cache: { at: number; ttl: number; value: Promise<Map<string, SummaryRow>> } | null = null;

/** Every row in dp_pad_summary (memoised); an empty map when there is no database or the read fails. */
export function dbSummaryRows(): Promise<Map<string, SummaryRow>> {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.value;
  const entry = { at: Date.now(), ttl: CACHE_TTL_MS, value: Promise.resolve(new Map<string, SummaryRow>()) };
  entry.value = (async () => {
    const pool = getDpPool();
    if (!pool) return new Map<string, SummaryRow>();
    try {
      return await readSummaryRows(pool);
    } catch {
      entry.ttl = FAILURE_TTL_MS;
      return new Map<string, SummaryRow>();
    }
  })();
  cache = entry;
  return entry.value;
}

export type SummaryLookup = {
  /** The summary for this text, or null when no source matches its hash. */
  current: (padId: string, hash: string) => SummaryRow | null;
  /** A short title for lists (table first, then seed); not hash-checked. */
  title: (padId: string) => string | null;
  /** The document a proposal was last summarised on, so a pad reads one Gov Hub list, not all of them. */
  mlNumber: (padId: string) => string | null;
  /** Every known pad id with its document (table and seed). */
  entries: () => Array<[string, string | null]>;
};

/** One lookup over the table and the seed, for a page render or a sweep. */
export async function summaryLookup(): Promise<SummaryLookup> {
  const db = await dbSummaryRows();
  return {
    current: (padId, hash) => pickSummary(hash, db.get(padId), SEED.get(padId)),
    title: (padId) => pickTitle(db.get(padId), SEED.get(padId)),
    mlNumber: (padId) => db.get(padId)?.mlNumber || SEED.get(padId)?.mlNumber || null,
    entries: () => {
      const out = new Map<string, string | null>();
      for (const [id, r] of SEED) out.set(id, r.mlNumber);
      for (const [id, r] of db) out.set(id, r.mlNumber || out.get(id) || null);
      return [...out];
    },
  };
}
