/**
 * In-memory limits. The DP site runs as one pm2 process (fork mode, one instance), so a process-local
 * window is the whole picture. If it ever runs as several processes, move these counts to Postgres.
 */
type Window = { hits: number[] };
const windows = new Map<string, Window>();

/** True when one more hit fits: at most `max` hits in the last `windowMs`. Records the hit when allowed. */
export function allowHit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const w = windows.get(key) ?? { hits: [] };
  w.hits = w.hits.filter((t) => now - t < windowMs);
  if (w.hits.length >= max) {
    windows.set(key, w);
    return false;
  }
  w.hits.push(now);
  windows.set(key, w);
  if (windows.size > 20000) {
    for (const [k, v] of windows) if (!v.hits.some((t) => now - t < 3600_000)) windows.delete(k);
  }
  return true;
}

export const CONTRIBUTION_LIMITS = { perMinute: 6, perHour: 60, openQuestionsPerAccount: 5, openQuestionsPerMeeting: 300 };
export const FACILITATOR_LIMITS = { perMinute: 60 };
export const STREAM_LIMITS = { perKey: 4, total: 300 };

/* ---------- open stream slots (Canopi routes/events.js holdSlot pattern) ---------- */
const openByKey = new Map<string, number>();
let openTotal = 0;

export function holdStreamSlot(key: string): (() => void) | null {
  const n = openByKey.get(key) ?? 0;
  if (n >= STREAM_LIMITS.perKey || openTotal >= STREAM_LIMITS.total) return null;
  openByKey.set(key, n + 1);
  openTotal += 1;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    openTotal = Math.max(0, openTotal - 1);
    const left = (openByKey.get(key) ?? 1) - 1;
    if (left > 0) openByKey.set(key, left);
    else openByKey.delete(key);
  };
}
