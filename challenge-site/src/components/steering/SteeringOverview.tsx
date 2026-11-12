'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  normalizeOverview,
  normalizePass,
  normalizePasses,
  STEERING_TABS,
  type SteeringOverviewRow,
  type SteeringPass,
  type SteeringTab,
} from '@/lib/dp-steering';

type OverviewResult =
  | { rows: SteeringOverviewRow[]; record: SteeringPass | null; runs: string[] }
  | { error: { text: string; code?: string } };

/** The open pass's live overview, or a closed pass's saved record. */
async function fetchOverview(closedKey: string | null): Promise<OverviewResult> {
  try {
    const url = closedKey ? `/api/steering/passes/${encodeURIComponent(closedKey)}` : '/api/steering/overview';
    const res = await fetch(url, { cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; runs?: unknown };
    if (!res.ok) return { error: { text: body.error || `Overview ${res.status}`, code: body.code } };
    const runs = Array.isArray(body.runs)
      ? body.runs.map((r) => {
          const o = (r || {}) as { label?: string; model?: string };
          return `${o.label || 'run'}${o.model ? ` (${o.model})` : ''}`;
        })
      : [];
    return { rows: normalizeOverview(body), record: closedKey ? normalizePass(body) : null, runs };
  } catch (err) {
    return { error: { text: err instanceof Error ? err.message : 'Overview unavailable' } };
  }
}

const FALLBACK_PASS: SteeringPass = {
  key: 'current', title: 'The sweep', position: 1, status: 'open', description: null,
  openedAt: null, closedAt: null, closedByName: null, closeNote: null, totals: null,
};

async function fetchPasses(): Promise<SteeringPass[]> {
  try {
    const res = await fetch('/api/steering/passes', { cache: 'no-store' });
    return res.ok ? normalizePasses(await res.json().catch(() => ({}))) : [];
  } catch {
    return [];
  }
}

function readPassParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('pass');
}

/**
 * The steering page: one tab per pass. The open pass shows live progress (anyone signed in; only
 * steering members open a document's sweep); a closed pass shows its saved record (anyone).
 */
export default function SteeringOverview({ signedIn, steering }: { signedIn: boolean; steering: boolean }) {
  const [passes, setPasses] = useState<SteeringPass[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [record, setRecord] = useState<SteeringPass | null>(null);
  const [runs, setRuns] = useState<string[]>([]);
  const [rows, setRows] = useState<SteeringOverviewRow[] | null>(null);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPasses = useCallback(async () => {
    const list = await fetchPasses();
    setPasses(list);
    return list;
  }, []);

  const { user, checked } = useAuth();
  useEffect(() => {
    let cancelled = false;
    void fetchPasses().then((list) => {
      if (cancelled) return;
      setPasses(list);
      const wanted = readPassParam();
      const open = list.find((p) => p.status === 'open');
      const lastClosed = [...list].reverse().find((p) => p.status === 'closed');
      // Signed out, only closed passes can be read, so start on the latest one.
      setSelected(
        list.find((p) => p.key === wanted)?.key || (signedIn ? open?.key : lastClosed?.key) || open?.key || null,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, user?.id, checked]);

  // A Gov Hub without passes yet: show the live overview, with no pass tabs and nothing to close.
  const noPasses = passes !== null && !passes.length;
  const current = passes?.find((p) => p.key === selected) || (noPasses ? FALLBACK_PASS : null);
  const closedKey = current?.status === 'closed' ? current.key : null;
  const canRead = Boolean(current && (closedKey || signedIn));
  // Which view is on screen: rows show only once they belong to the selected pass.
  const viewKey = current && canRead ? `${current.key}:${closedKey ? 'closed' : 'open'}` : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const apply = useCallback((result: OverviewResult) => {
    if ('error' in result) setError(result.error);
    else {
      setRows(result.rows);
      setRecord(result.record);
      setRuns(result.runs);
      setError(null);
    }
    setLoading(false);
  }, []);
  const load = useCallback(async () => apply(await fetchOverview(closedKey)), [apply, closedKey]);

  useEffect(() => {
    if (!viewKey) return;
    let cancelled = false;
    void fetchOverview(closedKey).then((result) => {
      if (cancelled) return;
      apply(result);
      setLoadedKey(viewKey);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, viewKey, closedKey]);
  const shownRows = viewKey && loadedKey === viewKey ? rows : null;
  const shownRecord = shownRows ? record : null;

  const choose = (key: string) => {
    setSelected(key);
    const url = new URL(window.location.href);
    url.searchParams.set('pass', key);
    window.history.replaceState(null, '', url);
  };

  const dps = (shownRows || []).filter((r) => !r.frontMatter);
  const front = (shownRows || []).filter((r) => r.frontMatter);
  const totals = (shownRows || []).reduce(
    (t, r) => ({
      open: t.open + r.open,
      analysed: t.analysed + r.analysed,
      stale: t.stale + r.stale,
      done: t.done + r.votes.done,
      waiting: t.waiting + r.votes.one + r.votes.split,
    }),
    { open: 0, analysed: 0, stale: 0, done: 0, waiting: 0 },
  );
  const tabTotals = (shownRows || []).reduce(
    (t, r) => {
      for (const k of STEERING_TABS) t[k.key] += r.tabs?.[k.key] || 0;
      return t;
    },
    { open: 0, accepted: 0, deferred: 0, declined: 0 } as Record<SteeringTab, number>,
  );
  const linkFor = (ml: string) => (closedKey ? `/steering/${ml}?pass=${closedKey}` : steering ? `/steering/${ml}` : null);

  return (
    <div className="mt-8 space-y-8">
      {passes?.length ? <PassTabs passes={passes} selected={selected} onSelect={choose} /> : null}

      {current && !canRead ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          {current.title} is open.{' '}
          <Link href="/login?next=%2Fsteering" className="text-cyan-300 underline hover:text-cyan-200">
            Sign in
          </Link>{' '}
          to follow its progress. Closed passes are public.
        </p>
      ) : null}

      {shownRecord ? <PassRecordHeader pass={shownRecord} runs={runs} /> : null}
      {current?.status === 'open' && canRead && !steering ? (
        <p className="text-sm text-slate-400">
          You can follow the progress of {current.title}. Only steering committee members open a document&apos;s
          proposals while a pass is open; each pass&apos;s full record is public once it closes.
        </p>
      ) : null}

      {canRead ? (
      <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {steering ? (
          <a href="/api/steering/audit" download className="text-cyan-300 underline hover:text-cyan-200">
            Download the audit export (JSON)
          </a>
        ) : null}
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

      {(loading || (viewKey && loadedKey !== viewKey)) && !shownRows ? <p className="text-sm text-slate-400">Loading the sweep…</p> : null}
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

      {shownRows ? (
        <>
          <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3" aria-label="Status totals">
            {STEERING_TABS.map((t) => (
              <div key={t.key} className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-2 sm:min-w-32">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{t.label}</dt>
                <dd className="mt-1">
                  <CountDot n={tabTotals[t.key]} dot={t.dot} label={t.label} large />
                </dd>
              </div>
            ))}
          </dl>
          {closedKey ? null : (
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
          )}
          <DocumentList heading="Front matter" rows={front} linkFor={linkFor} closed={Boolean(closedKey)} />
          <DocumentList heading="Desirable Properties" rows={dps} linkFor={linkFor} closed={Boolean(closedKey)} />
          {steering && current?.status === 'open' && !noPasses ? (
            <ClosePass
              pass={current}
              openCount={tabTotals.open}
              onClosed={async (next) => {
                const list = await loadPasses();
                choose(list.find((p) => p.key === next)?.key || next);
              }}
            />
          ) : null}
        </>
      ) : null}
      </>
      ) : null}
    </div>
  );
}

function CountDot({ n, dot, label, large = false }: { n: number; dot: string; label: string; large?: boolean }) {
  return (
    <span
      aria-label={`${n} ${label.toLowerCase()}`}
      className={`inline-flex items-center justify-center rounded-full font-semibold ${
        large ? 'h-9 min-w-9 px-2 text-base' : 'h-6 min-w-6 px-1.5 text-xs'
      } ${n ? dot : 'bg-slate-800 text-slate-400'}`}
    >
      {n}
    </span>
  );
}

function PassTabs({
  passes,
  selected,
  onSelect,
}: {
  passes: SteeringPass[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Steering passes" className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
      {passes.map((p) => {
        const active = p.key === selected;
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(p.key)}
            className={`rounded-lg border px-4 py-2 text-left text-sm ${
              active ? 'border-violet-500 bg-violet-950/40 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            <span className="block font-semibold">{p.title}</span>
            <span className={`block text-xs ${p.status === 'open' ? 'text-amber-200' : 'text-slate-400'}`}>
              {p.status === 'open' ? 'Open' : `Closed${p.closedAt ? ` ${new Date(p.closedAt).toLocaleDateString()}` : ''}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PassRecordHeader({ pass, runs }: { pass: SteeringPass; runs: string[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
      <p>
        <strong className="text-white">{pass.title}</strong> closed
        {pass.closedAt ? ` ${new Date(pass.closedAt).toLocaleString()}` : ''}
        {pass.closedByName ? ` by ${pass.closedByName}` : ''}. This is its saved record: every proposal as it stood
        then, with its analysis, the votes and the outcome. Items still open were carried into the next pass.
      </p>
      {pass.description ? <p className="mt-2 whitespace-pre-line text-slate-400">{pass.description}</p> : null}
      {pass.closeNote ? <p className="mt-2 whitespace-pre-line text-slate-400">Closing note: {pass.closeNote}</p> : null}
      {runs.length ? <p className="mt-2 text-xs text-slate-500">Analysis runs: {runs.join(', ')}</p> : null}
    </div>
  );
}

function ClosePass({
  pass,
  openCount,
  onClosed,
}: {
  pass: SteeringPass;
  openCount: number;
  onClosed: (nextKey: string) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [nextTitle, setNextTitle] = useState(`Pass ${pass.position + 1}`);
  const [nextDescription, setNextDescription] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/steering/passes/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass_key: pass.key, next_title: nextTitle.trim(), next_description: nextDescription.trim(), note: note.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; opened?: { key?: string } };
      if (!res.ok) throw new Error(body.error || `Closing failed (${res.status})`);
      setConfirming(false);
      await onClosed(String(body.opened?.key || ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Closing failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
      <h2 className="font-semibold text-white">Close {pass.title}</h2>
      <p className="mt-1 text-slate-400">
        Closing saves this pass&apos;s record (every proposal with its analysis, votes and outcome), makes that record
        public and read-only, and opens the next pass.
        {openCount
          ? ` ${openCount} item${openCount === 1 ? ' is' : 's are'} still open and will be carried into the next pass, keeping their votes.`
          : ' Nothing is left open.'}
      </p>
      {confirming ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-slate-400">
            Name of the next pass
            <input
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            What the next pass covers (optional)
            <textarea
              value={nextDescription}
              onChange={(e) => setNextDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="e.g. The Fable run over the accepted text: cross-DP analysis, style, one bundle per DP"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Closing note for {pass.title} (optional, public with the record)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !nextTitle.trim()}
              onClick={() => void close()}
              className="rounded-lg bg-rose-700 px-4 py-2 font-medium text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {busy ? 'Closing…' : `Close ${pass.title} and open ${nextTitle.trim() || 'the next pass'}`}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="px-3 py-2 text-slate-400 hover:text-slate-200">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:border-slate-400"
        >
          Close {pass.title}…
        </button>
      )}
      {error ? <p role="alert" className="mt-2 text-rose-200">{error}</p> : null}
    </section>
  );
}

function DocumentList({
  heading,
  rows,
  linkFor,
  closed,
}: {
  heading: string;
  rows: SteeringOverviewRow[];
  linkFor: (ml: string) => string | null;
  closed: boolean;
}) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">{heading}</h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {rows.map((r) => {
          const href = r.listed ? linkFor(r.mlNumber) : null;
          const body = (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-semibold text-white">{r.title}</p>
                <span className="shrink-0 text-xs text-slate-500">{r.mlNumber}</span>
              </div>
              {r.tabs ? (
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Status counts">
                  {STEERING_TABS.map((t) => (
                    <span key={t.key} className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <CountDot n={r.tabs?.[t.key] || 0} dot={t.dot} label={t.label} />
                      {t.label}
                    </span>
                  ))}
                </div>
              ) : null}
              {closed ? null : <Progress row={r} />}
              {closed ? null : (
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
              )}
              {r.batches.length ? (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {r.batches.length} batch{r.batches.length === 1 ? '' : 'es'}:{' '}
                  {r.batches.map((b) => `${b.title} (${b.count})`).join(' · ')}
                </p>
              ) : null}
            </>
          );
          return (
            <li key={r.mlNumber}>
              {href ? (
                <Link
                  href={href}
                  className="block rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-violet-700/70"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">{body}</div>
              )}
            </li>
          );
        })}
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
