'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { normalizeOverview, type SteeringOverviewRow } from '@/lib/dp-steering';

type OverviewResult = { rows: SteeringOverviewRow[] } | { error: { text: string; code?: string } };

async function fetchOverview(): Promise<OverviewResult> {
  try {
    const res = await fetch('/api/steering/overview', { cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) return { error: { text: body.error || `Overview ${res.status}`, code: body.code } };
    return { rows: normalizeOverview(body) };
  } catch (err) {
    return { error: { text: err instanceof Error ? err.message : 'Overview unavailable' } };
  }
}

/** Every document's steering progress, with a link to its sweep. */
export default function SteeringOverview() {
  const [rows, setRows] = useState<SteeringOverviewRow[] | null>(null);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((result: OverviewResult) => {
    if ('error' in result) setError(result.error);
    else {
      setRows(result.rows);
      setError(null);
    }
    setLoading(false);
  }, []);
  const load = useCallback(async () => apply(await fetchOverview()), [apply]);

  const { user, checked } = useAuth();
  useEffect(() => {
    let cancelled = false;
    void fetchOverview().then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, user?.id, checked]);

  const dps = (rows || []).filter((r) => !r.frontMatter);
  const front = (rows || []).filter((r) => r.frontMatter);
  const totals = (rows || []).reduce(
    (t, r) => ({
      open: t.open + r.open,
      analysed: t.analysed + r.analysed,
      stale: t.stale + r.stale,
      done: t.done + r.votes.done,
      waiting: t.waiting + r.votes.one + r.votes.split,
    }),
    { open: 0, analysed: 0, stale: 0, done: 0, waiting: 0 },
  );

  return (
    <div className="mt-8 space-y-8">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <a href="/api/steering/audit" download className="text-cyan-300 underline hover:text-cyan-200">
          Download the audit export (JSON)
        </a>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="text-slate-400 hover:text-slate-200">
          Refresh
        </button>
      </div>

      {loading && !rows ? <p className="text-sm text-slate-400">Loading the sweep…</p> : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {error.text}
          {error.code === 'sign_in_again' || error.code === 'sign_in' ? (
            <>
              {' '}
              <a href="/login?next=%2Fsteering" className="underline hover:text-rose-100">
                Sign in again
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {rows ? (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3" aria-label="Sweep totals">
            {[
              { label: 'Open', value: totals.open, tone: totals.open ? 'text-amber-200' : 'text-white' },
              { label: 'Analysed', value: totals.analysed, tone: 'text-white' },
              { label: 'Stale', value: totals.stale, tone: totals.stale ? 'text-amber-200' : 'text-white' },
              { label: 'Waiting on a vote', value: totals.waiting, tone: totals.waiting ? 'text-cyan-200' : 'text-white' },
              { label: 'Done', value: totals.done, tone: 'text-emerald-200' },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-2 sm:min-w-32">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{c.label}</dt>
                <dd className={`text-2xl font-semibold ${c.tone}`}>{c.value}</dd>
              </div>
            ))}
          </dl>
          <DocumentList heading="Front matter" rows={front} />
          <DocumentList heading="Desirable Properties" rows={dps} />
        </>
      ) : null}
    </div>
  );
}

function DocumentList({ heading, rows }: { heading: string; rows: SteeringOverviewRow[] }) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">{heading}</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.mlNumber}>
            <Link
              href={`/steering/${r.mlNumber}`}
              className="block rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-violet-700/70"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-semibold text-white">{r.title}</p>
                <span className="shrink-0 text-xs text-slate-500">{r.mlNumber}</span>
              </div>
              <Progress row={r} />
              <p className="mt-2 text-xs text-slate-400">
                {r.listed ? (
                  <>
                    {r.open} open · {r.analysed} analysed
                    {r.stale ? <span className="text-amber-200"> · {r.stale} stale</span> : null}
                    {r.votes.one ? <> · {r.votes.one} need a second</> : null}
                    {r.votes.split ? <span className="text-amber-200"> · {r.votes.split} split</span> : null}
                    {r.votes.ready ? <> · {r.votes.ready} ready</> : null}
                    {r.votes.done ? <span className="text-emerald-200"> · {r.votes.done} done</span> : null}
                  </>
                ) : (
                  'Not in the sweep yet'
                )}
              </p>
              {r.batches.length ? (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {r.batches.length} batch{r.batches.length === 1 ? '' : 'es'}:{' '}
                  {r.batches.map((b) => `${b.title} (${b.count})`).join(' · ')}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Done, waiting (one or split, or ready) and untouched, as one bar. */
function Progress({ row }: { row: SteeringOverviewRow }) {
  const v = row.votes;
  const total = v.none + v.one + v.split + v.ready + v.done || row.open;
  if (!total) return <div className="mt-3 h-1.5 rounded-full bg-slate-800" aria-hidden />;
  const pct = (n: number) => `${(100 * n) / total}%`;
  return (
    <div
      className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-800"
      role="img"
      aria-label={`${v.done} of ${total} done`}
    >
      <span className="bg-emerald-500" style={{ width: pct(v.done) }} />
      <span className="bg-cyan-500" style={{ width: pct(v.ready) }} />
      <span className="bg-violet-500" style={{ width: pct(v.one) }} />
      <span className="bg-amber-500" style={{ width: pct(v.split) }} />
    </div>
  );
}
