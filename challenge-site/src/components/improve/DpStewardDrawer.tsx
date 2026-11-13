'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import LazyProposalList from '@/components/improve/LazyProposalList';
import {
  matchesWords,
  searchWords,
  statusLabel,
  type ImproveDp,
  type IndexedProposal,
  type SeatSummary,
} from '@/components/improve/improve-shared';
import { STEERING_INTEREST } from '@/data/improve-priorities';
import { fetchCoEditorSeats, type CoEditorSeatsResponse } from '@/lib/workgroup-collab-api';

type Props = {
  dp: ImproveDp;
  /** All proposals (null while loading); the drawer keeps this DP's. */
  proposals: IndexedProposal[] | null;
  proposalsError: string;
  onClose: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CARD = 'flex min-w-0 flex-col rounded-xl border p-5';
const PRIMARY = 'inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500';
const SECONDARY = 'inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:border-slate-400';

type LiveSeats = CoEditorSeatsResponse & { editorial_freeze?: boolean };

function seatsFrom(live: LiveSeats | null, fallback: SeatSummary | null): SeatSummary | null {
  if (live && live.enabled !== false && typeof live.seats_total === 'number') {
    const filled = Array.isArray(live.seats) ? live.seats.length : live.seats_total - (live.open_seats ?? 0);
    return { total: live.seats_total, filled, open: live.open_seats ?? Math.max(0, live.seats_total - filled), freeze: Boolean(live.editorial_freeze) };
  }
  return fallback;
}

/** Stewardship options for one DP, in a keyboard-operable side drawer (Esc closes; focus stays inside). */
export default function DpStewardDrawer({ dp, proposals, proposalsError, onClose }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [live, setLive] = useState<LiveSeats | null>(null);
  const [liveFailed, setLiveFailed] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  // Focus the drawer on open, lock page scroll, and give focus back on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  // Seats with the viewer's own actions (signed in or not), through the site's public proxy.
  useEffect(() => {
    if (!dp.workgroupId) return;
    let alive = true;
    fetchCoEditorSeats(dp.workgroupId)
      .then((d) => alive && setLive(d as LiveSeats))
      .catch(() => alive && setLiveFailed(true));
    return () => {
      alive = false;
    };
  }, [dp.workgroupId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const mine = useMemo(() => (proposals || []).filter((p) => p.docKey === dp.id), [proposals, dp.id]);
  const statuses = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of mine) if (!m.has(p.status)) m.set(p.status, statusLabel(p));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [mine]);
  const shown = useMemo(() => {
    const words = searchWords(q);
    return mine.filter((p) => (!status || p.status === status) && matchesWords(p.hay, words));
  }, [mine, q, status]);
  const openCount = mine.filter((p) => p.status === 'pending').length;

  const seats = seatsFrom(live, dp.seats);
  const seatOpen = Boolean(seats && seats.open > 0);
  const viewerIsCoEditor = Boolean(live?.viewer_is_co_editor);
  const blockReason = live?.claim_block_reason || null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-800 bg-[#0b1120] shadow-2xl shadow-black/70"
      >
        <div className="flex items-start gap-3 border-b border-slate-800 px-4 py-4 sm:px-6">
          <span className="mt-1 shrink-0 rounded-md border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-sm font-bold text-amber-300">{dp.id}</span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-bold leading-snug text-white">
              {dp.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{dp.summary}</p>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-slate-500 hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={dp.bookHref} className="text-cyan-300 hover:text-cyan-200">Read the chapter →</a>
            <Link href={dp.dpPageHref} className="text-cyan-300 hover:text-cyan-200">DP page</Link>
            {dp.workgroupHref ? (
              <a href={dp.workgroupHref} className="text-cyan-300 hover:text-cyan-200">Workgroup</a>
            ) : null}
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Ways to help with {dp.id}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <section aria-label="Contribute a proposal" className={`${CARD} border-slate-800 bg-slate-900/50`}>
              <p className="font-semibold text-white">Contribute a proposal</p>
              <p className="mt-1 flex-1 text-sm text-slate-300">
                Select a passage in the chapter and use Patch or Insert to propose new wording. Sign in first so your name
                goes with it; the co-editors decide, with a reason you can read.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <DiscussPatchLink href={dp.discussHref} className={PRIMARY}>
                  Propose on the book
                </DiscussPatchLink>
                <a href={dp.patchHref} className={SECONDARY}>
                  Patch on Gov Hub
                </a>
              </div>
            </section>

            <section
              aria-label="Co-edit"
              className={`${CARD} ${seatOpen ? 'border-amber-400/50 bg-amber-400/[0.06]' : 'border-slate-800 bg-slate-900/30'}`}
            >
              <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                Co-edit {dp.id}
                {seats ? (
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${seatOpen ? 'border-amber-400/60 text-amber-200' : 'border-emerald-700/70 text-emerald-200'}`}>
                    {seatOpen ? `${seats.open} of ${seats.total} seat${seats.total === 1 ? '' : 's'} open` : `All ${seats.total} seats filled`}
                  </span>
                ) : null}
              </p>
              {viewerIsCoEditor ? (
                <p className="mt-1 flex-1 text-sm text-slate-300">You are a co-editor of {dp.id}. Open proposals wait for you on the workgroup’s Review tab.</p>
              ) : seatOpen ? (
                <p className="mt-1 flex-1 text-sm text-slate-300">
                  Co-editors read every proposal for this chapter and approve, revise or decline it. Claim the open seat
                  yourself, or nominate someone who should hold it.
                  {blockReason ? <span className="mt-2 block text-amber-200">{blockReason}</span> : null}
                  {!blockReason && seats?.freeze ? (
                    <span className="mt-2 block text-slate-400">Gov Hub still reports the Version 1.0 editorial freeze, so claiming may be paused; nominations and the workgroup page show what you can do now.</span>
                  ) : null}
                </p>
              ) : seats ? (
                <p className="mt-1 flex-1 text-sm text-slate-400">
                  Every seat is taken for now. You can still propose changes and review, and nominate someone for when a seat opens.
                </p>
              ) : (
                <p className="mt-1 flex-1 text-sm text-slate-400">
                  {liveFailed || !dp.workgroupId ? 'Seat information is unavailable right now. ' : 'Checking seats… '}
                  The workgroup page shows the current co-editors and any open seat.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {viewerIsCoEditor && dp.workgroupHref ? (
                  <a href={dp.workgroupHref} className={PRIMARY}>Open the workgroup</a>
                ) : seatOpen && dp.coEditorsHref ? (
                  <a href={dp.coEditorsHref} className={PRIMARY}>Become a co-editor</a>
                ) : dp.coEditorsHref ? (
                  <a href={dp.coEditorsHref} className={SECONDARY}>See the co-editors</a>
                ) : null}
                {!viewerIsCoEditor && dp.nominateHref ? (
                  <a href={dp.nominateHref} className={SECONDARY}>Nominate someone</a>
                ) : null}
              </div>
              <Link href="/co-editors" className="mt-3 text-xs text-cyan-300 hover:text-cyan-200">What co-editors do →</Link>
            </section>

            <section aria-label="Steer Version 1.1" className={`${CARD} border-slate-800 bg-slate-900/50 sm:col-span-2`}>
              <p className="font-semibold text-white">Steer Version 1.1</p>
              <p className="mt-1 text-sm text-slate-300">
                The steering committee reads across all 24 chapters, settles what co-editors cannot, and signs off each
                document on its exact text. See how Version 1.0 was steered, then volunteer for 1.1. {STEERING_INTEREST.hint}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={STEERING_INTEREST.href} className={PRIMARY}>{STEERING_INTEREST.label}</Link>
                <Link href="/steering" className={SECONDARY}>How steering works</Link>
              </div>
            </section>
          </div>

          <section aria-labelledby={`${titleId}-review`} className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`${titleId}-review`} className="text-lg font-semibold text-white">Review its proposals</h3>
              <span role="status" className="text-sm text-slate-400">
                {proposals ? `${shown.length !== mine.length ? `${shown.length} shown · ` : ''}${mine.length} total · ${openCount} open` : proposalsError ? '' : 'Loading…'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">Each opens the document’s steering page, with who decided it and why.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_12rem]">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Search {dp.id} proposals
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Words, section or names"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
                >
                  <option value="">All</option>
                  {statuses.map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
            {proposalsError ? <p className="mt-3 text-sm text-rose-200">{proposalsError}</p> : null}
            {proposals && !shown.length ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                {mine.length ? 'No proposals match.' : `No proposals on ${dp.id} yet. Be the first.`}
              </p>
            ) : null}
            <div className="mt-3">
              <LazyProposalList items={shown} resetKey={`${dp.id}|${q}|${status}`} step={25} showDoc={false} rootRef={scroller} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
