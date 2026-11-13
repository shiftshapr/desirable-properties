'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import DpStewardDrawer from '@/components/improve/DpStewardDrawer';
import LazyProposalList from '@/components/improve/LazyProposalList';
import {
  indexProposal,
  matchesWords,
  searchWords,
  SOURCE_LABEL,
  statusLabel,
  type ImproveDp,
  type ImproveProposal,
  type IndexedProposal,
} from '@/components/improve/improve-shared';

export type { ImproveDp, SeatSummary } from '@/components/improve/improve-shared';

type View = 'both' | 'dps' | 'proposals';
type Props = { dps: ImproveDp[]; initialDp: string | null };

const VIEWS: Array<[View, string]> = [
  ['both', 'Both'],
  ['dps', 'DPs'],
  ['proposals', 'Proposals'],
];
const FIELD = 'rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100';

function setDpParam(dpId: string | null) {
  try {
    const url = new URL(window.location.href);
    if (dpId) url.searchParams.set('dp', dpId.toLowerCase());
    else url.searchParams.delete('dp');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    /* URL sync is a convenience only */
  }
}

/** Search-as-you-type explorer over the 24 DPs and every Version 1.0 proposal, with a stewardship drawer per DP. */
export default function ImproveExplorer({ dps, initialDp }: Props) {
  const [proposals, setProposals] = useState<IndexedProposal[] | null>(null);
  const [docs, setDocs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState<View>('both');
  const [doc, setDoc] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [openSeatsOnly, setOpenSeatsOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(initialDp && dps.some((d) => d.id === initialDp) ? initialDp : null);
  const query = useDeferredValue(q);

  useEffect(() => {
    let live = true;
    fetch('/api/steering/proposals', { cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { proposals?: ImproveProposal[]; docs?: Array<{ key: string }>; error?: string };
        if (!res.ok || !body.proposals) throw new Error(body.error || `Proposals are unavailable right now (${res.status}).`);
        if (!live) return;
        setProposals(body.proposals.map(indexProposal));
        setDocs((body.docs || []).map((d) => d.key));
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Proposals are unavailable right now.'));
    return () => {
      live = false;
    };
  }, []);

  const openDp = useCallback((id: string) => {
    setSelected(id);
    setDpParam(id);
  }, []);
  const closeDp = useCallback(() => {
    setSelected(null);
    setDpParam(null);
  }, []);

  const words = useMemo(() => searchWords(query), [query]);
  const docOptions = docs.length ? docs : dps.map((d) => d.id);

  const statusOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of proposals || []) if (!m.has(p.status)) m.set(p.status, statusLabel(p));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [proposals]);
  const sourceOptions = useMemo(() => {
    const present = new Set((proposals || []).map((p) => p.source));
    return (Object.keys(SOURCE_LABEL) as Array<ImproveProposal['source']>).filter((s) => present.has(s) || s !== 'agent');
  }, [proposals]);

  /** Per-DP counts: all proposals, open ones, and those matching the current proposal filters. */
  const counts = useMemo(() => {
    const m = new Map<string, { total: number; open: number; match: number }>();
    for (const p of proposals || []) {
      const c = m.get(p.docKey) || { total: 0, open: 0, match: 0 };
      c.total += 1;
      if (p.status === 'pending') c.open += 1;
      if ((!status || p.status === status) && (!source || p.source === source) && matchesWords(p.hay, words)) c.match += 1;
      m.set(p.docKey, c);
    }
    return m;
  }, [proposals, status, source, words]);
  const proposalFilterActive = Boolean(words.length || status || source);

  const shownDps = useMemo(
    () =>
      dps.filter((d) => {
        if (doc && d.id !== doc) return false;
        if (openSeatsOnly && !(d.seats && d.seats.open > 0)) return false;
        if (!words.length) return true;
        return matchesWords(`${d.id} ${d.title} ${d.summary} ${d.keywords}`.toLowerCase(), words);
      }),
    [dps, doc, openSeatsOnly, words],
  );

  const shownProposals = useMemo(
    () =>
      (proposals || []).filter(
        (p) => (!doc || p.docKey === doc) && (!status || p.status === status) && (!source || p.source === source) && matchesWords(p.hay, words),
      ),
    [proposals, doc, status, source, words],
  );

  const anyFilter = Boolean(q || doc || status || source || openSeatsOnly);
  const seatsKnown = dps.some((d) => d.seats);
  const openSeatTotal = dps.reduce((n, d) => n + (d.seats?.open ?? 0), 0);
  const selectedDp = selected ? dps.find((d) => d.id === selected) || null : null;
  const showDps = view !== 'proposals';
  const showProposals = view !== 'dps';

  return (
    <div className="mt-8">
      <div className="z-30 -mx-4 border-y border-slate-800 lg:sticky lg:top-16 bg-slate-950/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-400" htmlFor="improve-search">
            Search DPs and proposals
            <span className="relative">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                id="improve-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Try “consent”, “DP7”, “identity” or a contributor’s name"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-base text-slate-100 placeholder:text-slate-500 sm:text-sm"
              />
            </span>
          </label>
          <div role="group" aria-label="Show" className="flex shrink-0 rounded-lg border border-slate-700 p-0.5">
            {VIEWS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium lg:flex-none ${view === v ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-400">
            DP / document
            <select value={doc} onChange={(e) => setDoc(e.target.value)} className={FIELD}>
              <option value="">All</option>
              {docOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-400">
            Proposal status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
              <option value="">All</option>
              {statusOptions.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-400">
            Source
            <select value={source} onChange={(e) => setSource(e.target.value)} className={FIELD}>
              <option value="">All</option>
              {sourceOptions.map((s) => (
                <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </label>
          <label className={`flex min-w-0 items-center gap-2 self-end rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 ${seatsKnown ? '' : 'opacity-50'}`}>
            <input
              type="checkbox"
              checked={openSeatsOnly}
              disabled={!seatsKnown}
              onChange={(e) => setOpenSeatsOnly(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            Open co-editor seat
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span role="status">
            {showDps ? `${shownDps.length} DP${shownDps.length === 1 ? '' : 's'}` : ''}
            {showDps && showProposals ? ' · ' : ''}
            {showProposals ? (proposals ? `${shownProposals.length} of ${proposals.length} proposals` : error ? 'proposals unavailable' : 'loading proposals…') : ''}
          </span>
          {seatsKnown && openSeatTotal > 0 ? (
            <span className="text-amber-200">{openSeatTotal} co-editor seat{openSeatTotal === 1 ? '' : 's'} open across the DPs</span>
          ) : null}
          {anyFilter ? (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setDoc('');
                setStatus('');
                setSource('');
                setOpenSeatsOnly(false);
              }}
              className="ml-auto text-cyan-300 underline hover:text-cyan-200"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      {showDps ? (
        <section aria-label="Desirable Properties" className="mt-8">
          {view === 'both' ? <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">DPs</h3> : null}
          {shownDps.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shownDps.map((d) => {
                const c = counts.get(d.id);
                const seatOpen = Boolean(d.seats && d.seats.open > 0);
                return (
                  <li key={d.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openDp(d.id)}
                      aria-haspopup="dialog"
                      className="group flex h-full w-full min-w-0 flex-col rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-900/30 p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-400/60 focus-visible:border-amber-400"
                    >
                      <span className="flex items-center gap-2">
                        <span className="rounded-md border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-sm font-bold text-amber-300">{d.id}</span>
                        {seatOpen ? (
                          <span className="rounded-full border border-amber-400/60 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">Seat open</span>
                        ) : null}
                      </span>
                      <span className="mt-3 block font-semibold leading-snug text-white group-hover:text-amber-100">{d.title}</span>
                      <span className="mt-1.5 line-clamp-2 block flex-1 text-sm text-slate-400">{d.summary}</span>
                      <span className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 pt-3 text-xs text-slate-400">
                        {d.seats ? (
                          <span className="flex items-center gap-1.5" title={`${d.seats.filled} of ${d.seats.total} co-editor seats filled`}>
                            <span aria-hidden="true" className="flex gap-0.5">
                              {Array.from({ length: d.seats.total }, (_, i) => (
                                <span key={i} className={`h-2 w-2 rounded-full ${i < d.seats!.filled ? 'bg-emerald-400' : 'border border-amber-300'}`} />
                              ))}
                            </span>
                            {d.seats.filled}/{d.seats.total} co-editors
                          </span>
                        ) : null}
                        <span>
                          {c ? `${c.total} proposal${c.total === 1 ? '' : 's'}` : proposals ? 'No proposals yet' : '…'}
                          {c && c.open ? <span className="text-amber-200"> · {c.open} open</span> : null}
                          {c && proposalFilterActive ? <span className="text-cyan-300"> · {c.match} match</span> : null}
                        </span>
                        <span aria-hidden="true" className="ml-auto text-cyan-300 opacity-0 transition group-hover:opacity-100">Open →</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              {doc && !dps.some((d) => d.id === doc) ? `${doc} is front matter, not a DP; its proposals are listed below.` : 'No DPs match. Try fewer words.'}
            </p>
          )}
        </section>
      ) : null}

      {showProposals ? (
        <section aria-label="Proposals" className="mt-10">
          {view === 'both' ? <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Proposals</h3> : null}
          <p className="mb-3 max-w-3xl text-sm text-slate-400">
            355 proposals were made in the open review before the November 9 freeze (237 of them from 57 community
            contributors), and the steering committee made 1,280 editorial repairs after it. Each row opens its
            document’s steering page.
          </p>
          {error ? <p className="text-sm text-rose-200">{error}</p> : null}
          {proposals && !shownProposals.length ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No proposals match.</p>
          ) : null}
          {!proposals && !error ? (
            <ul aria-hidden="true" className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="h-[4.25rem] animate-pulse rounded-lg border border-slate-800 bg-slate-900/40" />
              ))}
            </ul>
          ) : null}
          <LazyProposalList items={shownProposals} resetKey={`${doc}|${status}|${source}|${query}`} />
        </section>
      ) : null}

      {selectedDp ? <DpStewardDrawer key={selectedDp.id} dp={selectedDp} proposals={proposals} proposalsError={error} onClose={closeDp} /> : null}
    </div>
  );
}
