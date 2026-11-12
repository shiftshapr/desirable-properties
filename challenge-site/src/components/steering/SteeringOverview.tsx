'use client';

import Link from 'next/link';
import SteeringIssues from '@/components/steering/SteeringIssues';
import StageLedger from '@/components/steering/StageLedger';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  normalizeOverview,
  normalizeOverviewMeta,
  normalizeStage,
  normalizeStages,
  STEERING_TABS,
  type SteeringOverviewRow,
  type SteeringStage,
  type SteeringTab,
} from '@/lib/dp-steering';

type OverviewMeta = ReturnType<typeof normalizeOverviewMeta>;
type OverviewResult =
  | { rows: SteeringOverviewRow[]; record: SteeringStage | null; runs: string[]; meta: OverviewMeta | null }
  | { error: { text: string; code?: string } };

/** The open stage's live overview, or a closed stage's saved record. */
async function fetchOverview(closedKey: string | null): Promise<OverviewResult> {
  try {
    const url = closedKey ? `/api/steering/stages/${encodeURIComponent(closedKey)}` : '/api/steering/overview';
    const res = await fetch(url, { cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string; runs?: unknown };
    if (!res.ok) return { error: { text: body.error || `Overview ${res.status}`, code: body.code } };
    const runs = Array.isArray(body.runs)
      ? body.runs.map((r) => {
          const o = (r || {}) as { label?: string; model?: string };
          return `${o.label || 'run'}${o.model ? ` (${o.model})` : ''}`;
        })
      : [];
    return {
      rows: normalizeOverview(body),
      record: closedKey ? normalizeStage(body) : null,
      runs,
      meta: closedKey ? null : normalizeOverviewMeta(body),
    };
  } catch (err) {
    return { error: { text: err instanceof Error ? err.message : 'Overview unavailable' } };
  }
}

const FALLBACK_STAGE: SteeringStage = {
  key: 'current', title: 'The sweep', position: 1, kind: 'proposals', status: 'open', nextTitle: null,
  description: null, openedAt: null, closedAt: null, closedByName: null, closeNote: null, totals: null,
};

async function fetchStages(): Promise<SteeringStage[]> {
  try {
    const res = await fetch('/api/steering/stages', { cache: 'no-store' });
    return res.ok ? normalizeStages(await res.json().catch(() => ({}))) : [];
  } catch {
    return [];
  }
}

function readStageParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('stage');
}

/**
 * The steering page: one tab per stage (Stage 1, Cross-DP, Style, Final). The open stage shows live
 * progress (anyone signed in; only steering members open a document); a closed stage shows its saved
 * record (anyone); stages still to come are listed but not selectable. Stage 2 can be opened alongside
 * Stage 1: both tabs then show the same live progress, and Stage 1 is the one that closes first.
 */
/** The tab after Final: every stage in one table. */
const LEDGER_KEY = 'ledger';

export default function SteeringOverview({ signedIn, steering: steeringFromPage }: { signedIn: boolean; steering: boolean }) {
  const [stages, setStages] = useState<SteeringStage[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [byChapter, setByChapter] = useState(false);
  const [record, setRecord] = useState<SteeringStage | null>(null);
  const [runs, setRuns] = useState<string[]>([]);
  const [meta, setMeta] = useState<OverviewMeta | null>(null);
  // The page checks membership with the sign-in it was rendered with, which may have expired since; the
  // overview Gov Hub returns says it again for the sign-in that fetched it, so either one is enough.
  const steering = steeringFromPage || Boolean(meta?.viewerIsSteering);
  const [rows, setRows] = useState<SteeringOverviewRow[] | null>(null);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStages = useCallback(async () => {
    const list = await fetchStages();
    setStages(list);
    return list;
  }, []);

  const { user, checked } = useAuth();
  useEffect(() => {
    let cancelled = false;
    void fetchStages().then((list) => {
      if (cancelled) return;
      setStages(list);
      const wanted = readStageParam();
      const open = list.find((p) => p.status === 'open');
      const lastClosed = [...list].reverse().find((p) => p.status === 'closed');
      // Signed out, only closed stages can be read, so start on the latest one.
      setSelected(
        wanted === LEDGER_KEY
          ? LEDGER_KEY
          : list.find((p) => p.key === wanted)?.key || (signedIn ? open?.key : lastClosed?.key) || open?.key || null,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, user?.id, checked]);

  // A Gov Hub without stages yet: show the live overview, with no stage tabs and nothing to close.
  const noStages = stages !== null && !stages.length;
  const current = stages?.find((p) => p.key === selected) || (noStages ? FALLBACK_STAGE : null);
  const closedKey = current?.status === 'closed' ? current.key : null;
  const canRead = Boolean(current && (closedKey || signedIn));
  // Which view is on screen: rows show only once they belong to the selected stage.
  const viewKey = current && canRead ? `${current.key}:${closedKey ? 'closed' : 'open'}` : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const apply = useCallback((result: OverviewResult) => {
    if ('error' in result) setError(result.error);
    else {
      setRows(result.rows);
      setRecord(result.record);
      setRuns(result.runs);
      setMeta(result.meta);
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
    url.searchParams.set('stage', key);
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
  // With two stages open, the earlier one closes first and each counts its own open proposals.
  const liveMeta = shownRows && !closedKey ? meta : null;
  const alongside = (liveMeta?.openStages.length || 0) > 1;
  const closesNow = !liveMeta?.closingStageKey || liveMeta.closingStageKey === current?.key;
  const reviewOpen = liveMeta?.openStages.find((s) => s.kind === 'review') || (current?.status === 'open' && current.kind === 'review' ? current : null);
  const openHere = alongside && current ? (liveMeta?.openByStage[current.key] ?? totals.open) : totals.open;
  // The open cross-DP stage is worked by issue (fix bundles and decisions), not chapter by chapter.
  // A review stage is worked in bundles (its analysis's findings by kind of fix), not chapter by chapter:
  // open for steering members, read-only once closed for anyone signed in.
  const issuesTab = Boolean(
    current?.kind === 'review' && (current.status === 'open' ? steering : current.status === 'closed' && signedIn),
  );
  const refreshStages = async (key: string) => {
    const list = await loadStages();
    setLoadedKey(null);
    choose(list.find((p) => p.key === key)?.key || key);
  };
  const linkFor = (ml: string) => (closedKey ? `/steering/${ml}?stage=${closedKey}` : steering ? `/steering/${ml}` : null);

  return (
    <div className="mt-8 space-y-8">
      {stages?.length ? <StageTabs stages={stages} selected={selected} onSelect={choose} /> : null}
      {selected === LEDGER_KEY && stages ? <StageLedger stages={stages} /> : null}

      {current && !canRead ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          {current.title} is open.{' '}
          <Link href="/login?next=%2Fsteering" className="text-cyan-300 underline hover:text-cyan-200">
            Sign in
          </Link>{' '}
          to follow its progress. Closed stages are public.
        </p>
      ) : null}

      {shownRecord ? <StageRecordHeader stage={shownRecord} runs={runs} /> : null}
      {current?.status === 'open' && canRead && !steering ? (
        <p className="text-sm text-slate-400">
          You can follow the progress of {current.title}. Only steering committee members open a document&apos;s
          items while a stage is open; each stage&apos;s full record is public once it closes.
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
          {issuesTab ? null : (
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
          )}
          {alongside && liveMeta ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
              {liveMeta.openStages.map((s) => s.title).join(' and ')} are open together. What{' '}
              {liveMeta.openStages[0].title} accepts moves into {liveMeta.openStages[1].title} as it is accepted, and{' '}
              {liveMeta.openStages[0].title} closes first.
            </p>
          ) : null}
          {reviewOpen && !closedKey && !issuesTab ? (
            <p className="text-sm">
              <Link href="/steering/issues" className="text-cyan-300 underline hover:text-cyan-200">
                {reviewOpen.title} by issue
              </Link>
              <span className="text-slate-400">: the cross-DP findings in their groups, with the fixes to vote on.</span>
            </p>
          ) : null}
          {reviewOpen && !closedKey && !issuesTab ? <CarriedTotals rows={shownRows} stage={reviewOpen} /> : null}
          {current?.status === 'open' && current.kind === 'signoff' ? (
            <p className="text-sm text-slate-300">
              {shownRows.filter((r) => r.signoff?.signed).length} of {shownRows.filter((r) => r.listed).length} documents
              signed off by two steering members.
            </p>
          ) : null}
          {closedKey || issuesTab ? null : (
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
          {issuesTab ? (
            <>
              <SteeringIssues embedded stageKey={current?.key} />
              <p className="text-sm text-slate-400">
                {current?.status === 'open'
                  ? `Accepted changes carried into ${current.title} need no vote unless a bundle flags them: any not reviewed are kept when it closes. `
                  : `${current?.title} is closed; its full record by chapter is below the toggle. `}
                <button type="button" onClick={() => setByChapter((v) => !v)} className="text-cyan-300 underline hover:text-cyan-200">
                  {byChapter ? 'Hide the chapters' : 'Show carried items by chapter'}
                </button>
              </p>
            </>
          ) : null}
          {!issuesTab || byChapter ? (
            <>
              <DocumentList heading="Front matter" rows={front} linkFor={linkFor} closed={Boolean(closedKey)} stage={current} />
              <DocumentList heading="Desirable Properties" rows={dps} linkFor={linkFor} closed={Boolean(closedKey)} stage={current} />
            </>
          ) : null}
          {steering && liveMeta?.canOpenNext ? (
            <OpenNextStage next={liveMeta.canOpenNext} current={current} onOpened={refreshStages} />
          ) : null}
          {steering && current?.status === 'open' && !noStages && !closesNow ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
              {current.title} closes after {liveMeta?.openStages[0]?.title || 'the stage before it'}.
            </p>
          ) : null}
          {steering && current?.status === 'open' && !noStages && closesNow ? (
            <CloseStage
              stage={current}
              nextIsOpen={alongside}
              openProposals={openHere}
              openCarried={shownRows.reduce((n, r) => n + (r.carried?.open || 0), 0)}
              unsigned={current.kind === 'signoff' ? shownRows.filter((r) => r.listed && !r.signoff?.signed).length : 0}
              onClosed={async (next) => {
                const list = await loadStages();
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

function CarriedTotals({ rows, stage }: { rows: SteeringOverviewRow[]; stage: SteeringStage }) {
  const t = rows.reduce(
    (acc, r) => ({
      count: acc.count + (r.carried?.count || 0),
      open: acc.open + (r.carried?.open || 0),
      flagged: acc.flagged + (r.carried?.flagged || 0),
      unchecked: acc.unchecked + (r.carried?.unchecked || 0),
    }),
    { count: 0, open: 0, flagged: 0, unchecked: 0 },
  );
  return (
    <p className="text-sm text-slate-300">
      {t.count} accepted item{t.count === 1 ? '' : 's'} carried into {stage.title}: {t.open} still to review
      {t.flagged ? <span className="text-amber-200">, {t.flagged} flagged by the analysis</span> : null}
      {t.unchecked ? <span className="text-slate-400">, {t.unchecked} not checked yet</span> : null}.
    </p>
  );
}

function StageTabs({
  stages,
  selected,
  onSelect,
}: {
  stages: SteeringStage[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Steering stages" className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
      {stages.map((p) => {
        const active = p.key === selected;
        const upcoming = p.status === 'upcoming';
        return (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={upcoming}
            title={upcoming ? p.description || undefined : undefined}
            onClick={() => onSelect(p.key)}
            className={`rounded-lg border px-4 py-2 text-left text-sm ${
              active
                ? 'border-violet-500 bg-violet-950/40 text-white'
                : upcoming
                  ? 'cursor-default border-dashed border-slate-800 text-slate-500'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            <span className="block font-semibold">{p.title}</span>
            <span className={`block text-xs ${p.status === 'open' ? 'text-amber-200' : 'text-slate-500'}`}>
              {p.status === 'open'
                ? 'Open'
                : upcoming
                  ? 'Not started'
                  : `Closed${p.closedAt ? ` ${new Date(p.closedAt).toLocaleDateString()}` : ''}`}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        role="tab"
        aria-selected={selected === LEDGER_KEY}
        onClick={() => onSelect(LEDGER_KEY)}
        className={`rounded-lg border px-4 py-2 text-left text-sm ${
          selected === LEDGER_KEY
            ? 'border-violet-500 bg-violet-950/40 text-white'
            : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
        }`}
      >
        <span className="block font-semibold">Ledger</span>
        <span className="block text-xs text-slate-500">All stages</span>
      </button>
    </div>
  );
}

function StageRecordHeader({ stage, runs }: { stage: SteeringStage; runs: string[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
      <p>
        <strong className="text-white">{stage.title}</strong> closed
        {stage.closedAt ? ` ${new Date(stage.closedAt).toLocaleString()}` : ''}
        {stage.closedByName ? ` by ${stage.closedByName}` : ''}. This is its saved record: every item as it stood
        then, with its analysis, the votes and the outcome.
        {stage.kind !== 'signoff' && stage.nextTitle ? ` What it accepted moved on to ${stage.nextTitle}.` : ''}
      </p>
      {stage.description ? <p className="mt-2 whitespace-pre-line text-slate-400">{stage.description}</p> : null}
      {stage.closeNote ? <p className="mt-2 whitespace-pre-line text-slate-400">Closing note: {stage.closeNote}</p> : null}
      {runs.length ? <p className="mt-2 text-xs text-slate-500">Analysis runs: {runs.join(', ')}</p> : null}
    </div>
  );
}

function CloseStage({
  stage,
  openProposals,
  openCarried,
  unsigned,
  nextIsOpen = false,
  onClosed,
}: {
  stage: SteeringStage;
  /** The next stage is already open alongside this one. */
  nextIsOpen?: boolean;
  openProposals: number;
  openCarried: number;
  unsigned: number;
  onClosed: (nextKey: string) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deferRemaining, setDeferRemaining] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const final = stage.kind === 'signoff';
  const blocked = final ? unsigned > 0 : openProposals > 0 && !deferRemaining;
  const them = (n: number) => (n === 1 ? 'it' : 'them');

  async function close() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/steering/stages/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_key: stage.key, note: note.trim(), defer_remaining: deferRemaining }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; opened?: { key?: string } | null };
      if (!res.ok) throw new Error(body.error || `Closing failed (${res.status})`);
      setConfirming(false);
      await onClosed(String(body.opened?.key || stage.key));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Closing failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
      <h2 className="font-semibold text-white">Close {stage.title}</h2>
      <p className="mt-1 text-slate-400">
        Closing saves this stage&apos;s record (every item with its analysis, votes and outcome) and makes it public
        and read-only.
        {final
          ? ' Final closes once every document has two sign-offs on its current text. That ends the steering work.'
          : nextIsOpen
            ? ` ${stage.nextTitle || 'The next stage'} is already open and goes on reviewing what this stage accepted.`
            : ` Everything it accepted then opens in ${stage.nextTitle || 'the next stage'} to be reviewed again.`}
      </p>
      {final ? (
        <p className="mt-2 text-slate-300">
          {unsigned
            ? `${unsigned} document${unsigned === 1 ? ' still needs' : 's still need'} two sign-offs.`
            : 'Every document is signed off.'}
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
          <li>
            {openProposals
              ? `${openProposals} proposal${openProposals === 1 ? ' is' : 's are'} still open. A stage closes only when nothing is open: decide ${them(openProposals)}, or defer ${them(openProposals)} to 1.1 as part of closing.`
              : 'No proposals are open.'}
          </li>
          {stage.kind === 'review' ? (
            <li>
              {openCarried
                ? `${openCarried} carried item${openCarried === 1 ? ' has' : 's have'} not been reviewed. An earlier stage accepted ${them(openCarried)}, so ${openCarried === 1 ? 'it is' : 'they are'} kept.`
                : 'Every carried item has been reviewed.'}
            </li>
          ) : null}
        </ul>
      )}
      {confirming ? (
        <div className="mt-3 space-y-2">
          {!final && openProposals ? (
            <label className="flex items-start gap-2 text-slate-200">
              <input type="checkbox" checked={deferRemaining} onChange={(e) => setDeferRemaining(e.target.checked)} className="mt-1" />
              <span>
                Defer the remaining {openProposals} to 1.1. Their votes are kept, and the record says they were deferred
                when {stage.title} closed.
              </span>
            </label>
          ) : null}
          <label className="block text-xs text-slate-400">
            Closing note for {stage.title} (optional, public with the record)
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
              disabled={busy || blocked}
              onClick={() => void close()}
              className="rounded-lg bg-rose-700 px-4 py-2 font-medium text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {busy ? 'Closing…' : final ? 'Close Final' : nextIsOpen ? `Close ${stage.title}` : `Close ${stage.title} and open ${stage.nextTitle || 'the next stage'}`}
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
          Close {stage.title}…
        </button>
      )}
      {error ? <p role="alert" className="mt-2 text-rose-200">{error}</p> : null}
    </section>
  );
}

/** Steering only: open the next stage (Stage 2) while the open one (Stage 1) goes on. */
function OpenNextStage({
  next,
  current,
  onOpened,
}: {
  next: { key: string; title: string };
  current: SteeringStage | null;
  onOpened: (key: string) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/steering/stages/open-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_key: next.key }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `Opening failed (${res.status})`);
      setConfirming(false);
      await onOpened(next.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opening failed');
    } finally {
      setBusy(false);
    }
  }

  const now = current?.title || 'the open stage';
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
      <h2 className="font-semibold text-white">Open {next.title} now</h2>
      <p className="mt-1 text-slate-400">
        {next.title} can run alongside {now}. Everything {now} has accepted is reviewed there straight away, and
        each change it accepts from then on joins as it is accepted. {now} stays open and closes first. This cannot be
        undone.
      </p>
      {confirming ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void open()}
            className="rounded-lg bg-violet-700 px-4 py-2 font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {busy ? 'Opening…' : `Open ${next.title}`}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="px-3 py-2 text-slate-400 hover:text-slate-200">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-lg border border-slate-600 px-4 py-2 text-slate-200 hover:border-slate-400"
        >
          Open {next.title}…
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
  stage,
}: {
  heading: string;
  rows: SteeringOverviewRow[];
  linkFor: (ml: string) => string | null;
  closed: boolean;
  stage: SteeringStage | null;
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
              {!closed && r.carried?.count ? (
                <p className="mt-1 text-xs text-slate-400">
                  {r.carried.count} carried in · {r.carried.open} to review
                  {r.carried.flagged ? <span className="text-amber-200"> · {r.carried.flagged} flagged</span> : null}
                  {r.carried.unchecked ? <> · {r.carried.unchecked} not checked yet</> : null}
                </p>
              ) : null}
              {!closed && stage?.kind === 'signoff' && r.signoff ? (
                <p className={`mt-1 text-xs ${r.signoff.signed ? 'text-emerald-200' : 'text-slate-400'}`}>
                  {r.signoff.signed ? 'Signed off' : `${r.signoff.count} of 2 sign-offs`}
                </p>
              ) : null}
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
