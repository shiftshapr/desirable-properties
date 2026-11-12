'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ActivityPatchPreview from '@/components/workgroup/ActivityPatchPreview';
import SteeringAskDeepi from '@/components/steering/SteeringAskDeepi';
import { useAuth } from '@/lib/auth-context';
import {
  agreesWith,
  CHECK_LABEL,
  DECISION_LABEL,
  REVIEW_LABEL,
  normalizeBatchApprove,
  normalizeSteeringDocument,
  STATE_LABEL,
  STEERING_TABS,
  steeringTab,
  steeringTabCounts,
  type BatchApproveResult,
  type SteeringAnalysis,
  type SteeringBatch,
  type SteeringCarriedItem,
  type SteeringCheck,
  type SteeringDecision,
  type SteeringDocument,
  type SteeringItem,
  type SteeringReviewDecision,
  type SteeringSignoff,
  type SteeringTab,
} from '@/lib/dp-steering';

type Flash = { ok: boolean; text: string };

const KIND_TONE: Record<string, string> = {
  accept: 'border-emerald-800/70 text-emerald-200',
  accept_revised: 'border-violet-700/70 text-violet-200',
  decline: 'border-rose-800/70 text-rose-200',
  reject: 'border-rose-800/70 text-rose-200',
  defer: 'border-sky-800/70 text-sky-200',
  needs_person: 'border-amber-700/70 text-amber-200',
};

const STATE_TONE: Record<string, string> = {
  none: 'border-slate-700 text-slate-300',
  one: 'border-violet-700/70 text-violet-200',
  split: 'border-amber-700/70 text-amber-200',
  ready: 'border-cyan-700/70 text-cyan-200',
  done: 'border-emerald-800/70 text-emerald-200',
};

const isTab = (v: string | null): v is SteeringTab => STEERING_TABS.some((t) => t.key === v);

/**
 * /steering/<ml>: status tabs (Open, Accepted, Deferred, Declined). Open shows the batches first, then
 * every other open item; the other tabs list what was carried out, each with the analysis and the votes.
 */
export default function SteeringSweep({ ml, stageKey = null }: { ml: string; stageKey?: string | null }) {
  const readOnly = Boolean(stageKey);
  const [doc, setDoc] = useState<SteeringDocument | null>(null);
  const [tab, setTabState] = useState<SteeringTab>('open');
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, Flash>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = stageKey
        ? `/api/steering/stages/${encodeURIComponent(stageKey)}/${encodeURIComponent(ml)}`
        : `/api/steering/${encodeURIComponent(ml)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        setError({ text: body.error || `Steering ${res.status}`, code: body.code });
        return;
      }
      setDoc(normalizeSteeringDocument(ml, body));
      setError(null);
    } catch (err) {
      setError({ text: err instanceof Error ? err.message : 'Steering data unavailable' });
    } finally {
      setLoading(false);
    }
  }, [ml, stageKey]);

  const { user, checked } = useAuth();
  useEffect(() => {
    void load();
  }, [load, user?.id, checked]);

  // The tab lives in ?tab= so a reload or a shared link opens the same one.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (isTab(t)) setTabState(t);
  }, []);
  const setTab = (t: SteeringTab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    if (t === 'open') url.searchParams.delete('tab');
    else url.searchParams.set('tab', t);
    window.history.replaceState(null, '', url);
  };

  const tabCounts = useMemo(() => {
    const c = steeringTabCounts(doc?.items || []);
    for (const i of doc?.carried || []) c[i.tab] += 1;
    return c;
  }, [doc]);
  const shown = useMemo(() => (doc?.items || []).filter((i) => steeringTab(i) === tab), [doc, tab]);
  const shownCarried = useMemo(() => (doc?.carried || []).filter((i) => i.tab === tab), [doc, tab]);
  const byId = useMemo(() => new Map(shown.map((i) => [i.proposalId, i])), [shown]);
  const inBatch = useMemo(() => new Set((doc?.batches || []).flatMap((b) => b.proposalIds)), [doc]);
  // Batches are for deciding, so only the Open tab groups by them; a batch shows its open items only.
  const openBatches = tab === 'open' && !readOnly
    ? (doc?.batches || [])
        .map((batch) => ({ batch, items: batch.proposalIds.map((id) => byId.get(id)).filter((i): i is SteeringItem => Boolean(i)) }))
        .filter((b) => b.items.length)
    : [];
  const loose = tab === 'open' ? shown.filter((i) => !inBatch.has(i.proposalId)) : shown;

  async function vote(item: SteeringItem, decision: SteeringDecision, opts: { revisedText?: string; note?: string; agrees?: boolean | null }) {
    setBusy(`item:${item.proposalId}`);
    setFlash((f) => ({ ...f, [item.proposalId]: { ok: true, text: '' } }));
    try {
      const res = await fetch(`/api/steering/${encodeURIComponent(ml)}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: item.proposalId,
          decision,
          revised_text: decision === 'accept_revised' ? opts.revisedText : undefined,
          agrees_with_analysis: opts.agrees ?? agreesWith(item.analysis, decision, opts.revisedText),
          note: opts.note || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; state?: string; outcome?: { error?: string | null } | null };
      if (!res.ok) throw new Error(body.error || `Vote failed (${res.status})`);
      const state = String(body.state || '');
      const text = body.outcome?.error
        ? `Vote recorded. Two members agree, but carrying it out failed: ${body.outcome.error}`
        : state === 'done' || (body.outcome && !body.outcome.error)
          ? `Vote recorded. Two members agree: ${DECISION_LABEL[decision]} is carried out.`
          : state === 'split'
            ? 'Vote recorded. The votes differ, so another member’s vote settles it.'
            : 'Vote recorded. It needs a second steering member to agree.';
      setFlash((f) => ({ ...f, [item.proposalId]: { ok: !body.outcome?.error, text } }));
      await load();
    } catch (err) {
      setFlash((f) => ({ ...f, [item.proposalId]: { ok: false, text: err instanceof Error ? err.message : 'Vote failed' } }));
    } finally {
      setBusy(null);
    }
  }

  async function withdrawVote(item: SteeringItem) {
    setBusy(`item:${item.proposalId}`);
    try {
      const res = await fetch(
        `/api/steering/${encodeURIComponent(ml)}/votes/${encodeURIComponent(item.proposalId)}`,
        { method: 'DELETE' },
      );
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `Withdraw failed (${res.status})`);
      setFlash((f) => ({ ...f, [item.proposalId]: { ok: true, text: 'Your vote is withdrawn.' } }));
      await load();
    } catch (err) {
      setFlash((f) => ({ ...f, [item.proposalId]: { ok: false, text: err instanceof Error ? err.message : 'Withdraw failed' } }));
    } finally {
      setBusy(null);
    }
  }

  async function approveBatch(batch: SteeringBatch, excludeIds: string[], note: string): Promise<BatchApproveResult | null> {
    setBusy(`batch:${batch.id}`);
    try {
      const res = await fetch(`/api/steering/batches/${encodeURIComponent(batch.id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude_ids: excludeIds, note: note || undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `Batch approval failed (${res.status})`);
      const result = normalizeBatchApprove(body);
      await load();
      return result;
    } catch (err) {
      setFlash((f) => ({ ...f, [`batch:${batch.id}`]: { ok: false, text: err instanceof Error ? err.message : 'Batch approval failed' } }));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function stageAction(key: string, url: string, init: RequestInit, done: (body: Record<string, unknown>) => string) {
    setBusy(key);
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(body.error || `Failed (${res.status})`));
      setFlash((f) => ({ ...f, [key.replace(/^carried:/, '')]: { ok: true, text: done(body) } }));
      await load();
    } catch (err) {
      setFlash((f) => ({ ...f, [key.replace(/^carried:/, '')]: { ok: false, text: err instanceof Error ? err.message : 'Failed' } }));
    } finally {
      setBusy(null);
    }
  }

  const stageKeyNow = doc?.stage?.key;
  const review = (item: SteeringCarriedItem, decision: SteeringReviewDecision, note: string) =>
    void stageAction(
      `carried:${item.proposalId}`,
      `/api/steering/stages/current/carried/${encodeURIComponent(item.proposalId)}`,
      { method: 'POST', body: JSON.stringify({ decision, note: note || undefined, stage_key: stageKeyNow }) },
      (body) => {
        const it = (body.item || {}) as { decision?: string | null; state?: string };
        return it.decision
          ? `Review recorded. Two members agree: ${REVIEW_LABEL[it.decision as SteeringReviewDecision] || it.decision}.`
          : it.state === 'split'
            ? 'Review recorded. The reviews differ, so another member settles it.'
            : 'Review recorded. It needs a second steering member to agree.';
      },
    );
  const withdrawReview = (item: SteeringCarriedItem) =>
    void stageAction(
      `carried:${item.proposalId}`,
      `/api/steering/stages/current/carried/${encodeURIComponent(item.proposalId)}`,
      { method: 'DELETE' },
      () => 'Your review is withdrawn.',
    );
  const keepAll = () =>
    void stageAction(
      'keep-all',
      `/api/steering/stages/current/${encodeURIComponent(ml)}/keep-all`,
      { method: 'POST', body: JSON.stringify({ stage_key: stageKeyNow }) },
      (body) => {
        const n = Array.isArray(body.kept) ? body.kept.length : 0;
        return `You kept ${n} item${n === 1 ? '' : 's'}. Each is settled once a second member keeps it too.`;
      },
    );
  const signOff = (withdraw: boolean, note: string) =>
    void stageAction(
      'signoff',
      `/api/steering/stages/current/${encodeURIComponent(ml)}/signoff`,
      withdraw ? { method: 'DELETE' } : { method: 'POST', body: JSON.stringify({ note: note || undefined }) },
      (body) =>
        withdraw
          ? 'Your sign-off is withdrawn.'
          : (body.signoff as { signed?: boolean } | undefined)?.signed
            ? 'Signed off. Two members have now approved this text.'
            : 'Signed off. It needs a second steering member.',
    );

  const counts = (doc?.items || []).reduce(
    (c, i) => ({ ...c, [i.state]: (c[i.state] || 0) + 1, stale: c.stale + (i.stale ? 1 : 0) }),
    { none: 0, one: 0, split: 0, ready: 0, done: 0, stale: 0 } as Record<string, number>,
  );

  return (
    <div className="mt-6 space-y-6">
      <header className="space-y-3 border-b border-slate-800 pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
          Steering{doc?.stage ? ` · ${doc.stage.title}${doc.stage.status === 'closed' ? ' (closed)' : ''}` : ''} · {ml}
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{doc?.title || ml}</h1>
        {readOnly ? (
          <p className="max-w-3xl text-sm text-slate-300">
            The saved record of {doc?.stage?.title || 'this stage'}: each item as it stood when the stage closed
            {doc?.stage?.closedAt ? ` on ${new Date(doc.stage.closedAt).toLocaleString()}` : ''}, with its analysis,
            the votes and the outcome. What it accepted moved on to the next stage.
          </p>
        ) : (
          <p className="max-w-3xl text-sm text-slate-300">
            Two steering members must agree before an outcome is carried out: the same decision and, to
            accept a revision, the same text. Your vote counts on your own proposals too. You can change or withdraw it
            until it is carried out.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {readOnly ? null : (
            <a href="/api/steering/audit" download className="text-cyan-300 underline hover:text-cyan-200">
              Audit export (JSON)
            </a>
          )}
          <button type="button" onClick={() => void load()} className="text-slate-400 hover:text-slate-200">
            Refresh
          </button>
          {doc?.runs.length ? (
            <span className="text-xs text-slate-500">
              Analysis {doc.runs.map((r) => `${r.label}${r.model ? ` (${r.model})` : ''}`).join(', ')}
            </span>
          ) : null}
        </div>
        {doc ? (
          <p className="text-xs text-slate-400">
            {doc.items.length} item{doc.items.length === 1 ? '' : 's'} · {counts.none} without votes · {counts.one} need a
            second · {counts.split} split · {counts.done} done
            {counts.stale ? <span className="text-amber-200"> · {counts.stale} stale analyses</span> : null}
          </p>
        ) : null}
      </header>

      {loading && !doc ? <p className="text-sm text-slate-400">Loading…</p> : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {error.text}
          {error.code === 'sign_in_again' || error.code === 'sign_in' ? (
            <>
              {' '}
              <a href={`/login?next=${encodeURIComponent(`/steering/${ml}`)}`} className="underline hover:text-rose-100">
                Sign in again
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {doc?.signoff ? (
        <SignoffPanel signoff={doc.signoff} readOnly={readOnly} busy={busy === 'signoff'} flash={flash.signoff} onSign={signOff} />
      ) : null}

      {doc ? <StatusTabs tab={tab} counts={tabCounts} onSelect={setTab} /> : null}

      {shownCarried.length ? (
        <CarriedSection
          ml={ml}
          items={shownCarried}
          stageTitle={doc?.stage?.title || 'this stage'}
          readOnly={readOnly || tab !== 'open'}
          busy={busy}
          flash={flash}
          onReview={review}
          onWithdraw={withdrawReview}
          onKeepAll={keepAll}
        />
      ) : null}

      {doc && !doc.items.length && !doc.carried.length ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-300">
          No open proposals on this document.
        </p>
      ) : doc && !shown.length && !shownCarried.length ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-300">
          {tab === 'open' ? (readOnly ? 'Nothing was left open on this document.' : 'Nothing left to decide on this document.') : `Nothing ${STEERING_TABS.find((t) => t.key === tab)?.label.toLowerCase()} on this document yet.`}
        </p>
      ) : null}

      {openBatches.map(({ batch, items }) => (
        <BatchSection
          key={batch.id}
          ml={ml}
          batch={batch}
          items={items}
          busy={busy}
          flash={flash}
          onApprove={approveBatch}
          onVote={vote}
          onWithdraw={withdrawVote}
        />
      ))}

      {loose.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
            {tab !== 'open' ? STEERING_TABS.find((t) => t.key === tab)?.label : openBatches.length ? 'Not in a batch' : 'Items'}
          </h2>
          <ul className="space-y-4">
            {loose.map((item) => (
              <ItemCard
                key={item.proposalId}
                ml={ml}
                item={item}
                busy={busy}
                flash={flash[item.proposalId]}
                onVote={vote}
                onWithdraw={withdrawVote}
                readOnly={readOnly}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function StatusTabs({
  tab,
  counts,
  onSelect,
}: {
  tab: SteeringTab;
  counts: Record<SteeringTab, number>;
  onSelect: (t: SteeringTab) => void;
}) {
  return (
    <div role="tablist" aria-label="Proposal status" className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
      {STEERING_TABS.map((t) => {
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
              active ? 'border-violet-500 bg-violet-950/40 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            {t.label}
            <span
              aria-label={`${counts[t.key]} ${t.label.toLowerCase()}`}
              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                counts[t.key] ? t.dot : 'bg-slate-800 text-slate-400'
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BatchSection({
  ml,
  batch,
  items,
  busy,
  flash,
  onApprove,
  onVote,
  onWithdraw,
}: {
  ml: string;
  batch: SteeringBatch;
  items: SteeringItem[];
  busy: string | null;
  flash: Record<string, Flash>;
  onApprove: (batch: SteeringBatch, excludeIds: string[], note: string) => Promise<BatchApproveResult | null>;
  onVote: VoteFn;
  onWithdraw: (item: SteeringItem) => void;
}) {
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [note, setNote] = useState('');
  const [result, setResult] = useState<BatchApproveResult | null>(null);
  const open = items.filter((i) => i.state !== 'done');
  // Items you have already voted on as this batch proposes need nothing more from you here.
  const votedByMe = (i: SteeringItem) => i.votes.some((v) => v.mine && v.decision === batch.kind);
  const pending = open.filter((i) => !votedByMe(i));
  const alreadyVoted = open.length - pending.length;
  const included = pending.filter((i) => !excluded.has(i.proposalId));
  const canApprove = batch.kind !== 'needs_person' && included.length > 0 && !busy;
  const done = items.length - open.length;
  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="rounded-2xl border border-violet-900/60 bg-violet-950/10 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
        <span className={`rounded border px-1.5 py-0.5 ${KIND_TONE[batch.kind] || KIND_TONE.needs_person}`}>
          {DECISION_LABEL[batch.kind] || batch.kind}
        </span>
        <span className="text-slate-500">
          {items.length} item{items.length === 1 ? '' : 's'}
          {done ? ` · ${done} done` : ''}
        </span>
      </div>
      <h2 className="mt-2 text-lg font-semibold text-white">{batch.title}</h2>
      {batch.summary ? <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{batch.summary}</p> : null}
      <div className="mt-2">
        <SteeringAskDeepi
          ml={ml}
          target={`batch:${batch.id}`}
          label="Ask Deepi about this batch"
          placeholder="e.g. Is there anything in this batch I should leave out and vote on separately?"
        />
      </div>

      {batch.kind === 'needs_person' ? (
        <p className="mt-3 text-sm text-amber-200">
          The analysis left these for a person to decide. Vote on each item below.
        </p>
      ) : open.length && !pending.length ? (
        <p className="mt-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-3 text-sm text-emerald-100">
          You approved this batch. {open.length} item{open.length === 1 ? ' is' : 's are'} waiting for a second steering
          member{done ? `; ${done} already carried out` : ''}. To change your vote on one, use &ldquo;Change vote&rdquo; on
          its card.
        </p>
      ) : open.length ? (
        <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          {alreadyVoted ? (
            <p className="text-xs text-emerald-200">
              You have already voted {DECISION_LABEL[batch.kind]} on {alreadyVoted} of these; approving covers the other{' '}
              {pending.length}.
            </p>
          ) : null}
          <p className="text-xs text-slate-400">
            {batch.bookWide ? (
              <strong className="block pb-1 text-amber-200">
                This batch spans the whole book: approving it votes on all {batch.proposalIds.length} items, in every
                chapter, not only the one shown here.
              </strong>
            ) : null}
            Approving votes <strong className="text-slate-200">{DECISION_LABEL[batch.kind]}</strong> on each ticked item
            {batch.kind === 'accept_revised' ? ', with the analysis’s revised text' : ''}. Untick an item to leave it out
            and vote on it separately.
          </p>
          <label className="block text-xs text-slate-400">
            Note on every vote (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder={batch.kind === 'decline' ? 'The authors read this with the decision' : 'Why this batch'}
            />
          </label>
          <button
            type="button"
            disabled={!canApprove}
            onClick={async () => {
              const r = await onApprove(
                batch,
                items.filter((i) => excluded.has(i.proposalId)).map((i) => i.proposalId),
                note.trim(),
              );
              if (r) {
                setResult(r);
                setNote('');
              }
            }}
            className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50 sm:w-auto"
          >
            {busy === `batch:${batch.id}`
              ? 'Approving…'
              : batch.bookWide
                ? `Approve book-wide batch (${batch.proposalIds.length} items)`
                : `Approve batch (${included.length} of ${pending.length})`}
          </button>
          {flash[`batch:${batch.id}`]?.text ? (
            <p role="status" className="text-sm text-rose-200">{flash[`batch:${batch.id}`].text}</p>
          ) : null}
          {result ? <BatchResult result={result} /> : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-emerald-200">Every item in this batch is done.</p>
      )}

      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <ItemCard
            key={item.proposalId}
            ml={ml}
            item={item}
            busy={busy}
            flash={flash[item.proposalId]}
            onVote={onVote}
            onWithdraw={onWithdraw}
            include={
              batch.kind !== 'needs_person' && item.state !== 'done'
                ? { checked: !excluded.has(item.proposalId), onToggle: () => toggle(item.proposalId) }
                : undefined
            }
          />
        ))}
      </ul>
    </section>
  );
}

function BatchResult({ result }: { result: BatchApproveResult }) {
  return (
    <div role="status" className="space-y-1 text-sm">
      <p className="text-emerald-200">
        {result.voted} vote{result.voted === 1 ? '' : 's'} recorded · {result.executed.length} carried out ·{' '}
        {result.pendingSecond.length} waiting for a second member
      </p>
      {result.failed.length ? (
        <ul className="space-y-0.5 text-rose-200">
          {result.failed.map((f) => (
            <li key={f.proposalId}>
              Not carried out, {shortId(f.proposalId)}: {f.error}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type VoteFn = (
  item: SteeringItem,
  decision: SteeringDecision,
  opts: { revisedText?: string; note?: string; agrees?: boolean | null },
) => void | Promise<void>;

function ItemCard({
  ml,
  item,
  busy,
  flash,
  onVote,
  onWithdraw,
  include,
  readOnly = false,
}: {
  ml: string;
  item: SteeringItem;
  busy: string | null;
  flash?: Flash;
  onVote: VoteFn;
  onWithdraw: (item: SteeringItem) => void;
  include?: { checked: boolean; onToggle: () => void };
  /** A closed stage's saved item: no voting, no Ask Deepi. */
  readOnly?: boolean;
}) {
  const p = item.proposal;
  const a = item.analysis;
  const [note, setNote] = useState('');
  const [revising, setRevising] = useState(false);
  const [revised, setRevised] = useState(a?.revisedText || p.proposed_text || '');
  const mine = item.votes.find((v) => v.mine) || null;
  // Once you have voted, the card shows your vote; the buttons return only to change it.
  const mineKey = mine ? `${mine.decision}:${mine.revisedText || ''}` : '';
  const [changingFor, setChangingFor] = useState<string | null>(null);
  const changing = Boolean(mine) && changingFor === mineKey; // a new vote changes mineKey and closes the controls
  const showControls = !mine || changing;
  const disabled = Boolean(busy);
  const isDone = readOnly || item.state === 'done' || Boolean(item.outcome?.executedAt);
  const rec = a?.recommendation || null;
  const canAgree = Boolean(rec && rec !== 'needs_person' && (rec !== 'accept_revised' || a?.revisedText));
  const mode = String(p.patch_mode || '').toLowerCase();
  const isBundle = mode === 'editorial_bundle' || mode === 'dedup_bundle' || Boolean(p.edits?.length);
  const insertPosition = mode === 'insert_after' ? 'below' : mode === 'insert' ? 'above' : null;

  return (
    <li className={`rounded-xl border bg-slate-950/40 p-3 sm:p-4 ${include && !include.checked ? 'border-slate-800 opacity-80' : 'border-slate-800'}`}>
      <div className="flex items-start gap-3">
        {include ? (
          <input
            type="checkbox"
            checked={include.checked}
            onChange={include.onToggle}
            aria-label={include.checked ? 'Included in the batch: untick to leave out' : 'Left out of the batch'}
            className="mt-1 h-4 w-4 shrink-0 accent-violet-500"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
            {rec ? (
              <span className={`rounded border px-1.5 py-0.5 ${KIND_TONE[rec] || KIND_TONE.needs_person}`}>
                Recommends {DECISION_LABEL[rec] || rec}
                {a?.confidence ? ` · ${a.confidence}` : ''}
              </span>
            ) : (
              <span className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-400">No analysis</span>
            )}
            {a?.verified ? (
              <span className="rounded border border-emerald-900/70 px-1.5 py-0.5 text-emerald-300" title={a.verifierNote || undefined}>
                Verified
              </span>
            ) : null}
            {item.stale ? (
              <span
                className="rounded border border-amber-600 bg-amber-950/40 px-1.5 py-0.5 text-amber-200"
                title="The chapter changed after this analysis was written. Read the current text before voting."
              >
                Stale
              </span>
            ) : null}
            <span className={`rounded border px-1.5 py-0.5 ${STATE_TONE[item.state]}`}>{STATE_LABEL[item.state]}</span>
            {p.title_change ? <span className="rounded border border-amber-800/60 px-1.5 py-0.5 text-amber-200">Title</span> : null}
            <span className="text-slate-500">{shortId(item.proposalId)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-200">
            {p.author_name || 'Unknown author'}
            {p.revised_by_name ? <span className="text-violet-200"> · revised by {p.revised_by_name}</span> : null}
            <span className="text-slate-500"> · {String(p.status_label || p.status)}</span>
          </p>
        </div>
      </div>

      {isBundle ? (
        <BundleEdits item={item} />
      ) : (
        <ActivityPatchPreview
          removed={p.original_text || null}
          added={p.proposed_text || null}
          mode={insertPosition ? 'insert' : 'patch'}
          insertPosition={insertPosition}
        />
      )}
      {rec === 'accept_revised' && a?.revisedText ? (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wide text-violet-300">Revised text the analysis proposes</p>
          <ActivityPatchPreview
            removed={insertPosition ? p.original_text || null : p.original_text || p.proposed_text || null}
            added={a.revisedText}
            mode={insertPosition ? 'insert' : 'patch'}
            insertPosition={insertPosition}
          />
        </div>
      ) : null}
      {p.rationale ? (
        <p className="mt-2 whitespace-pre-line text-sm text-slate-400">
          <span className="text-slate-500">Rationale: </span>
          {p.rationale}
        </p>
      ) : null}

      {a ? <AnalysisBlock analysis={a} /> : null}
      {readOnly ? null : (
        <div className="mt-2">
          <SteeringAskDeepi
            ml={ml}
            target={`item:${item.proposalId}`}
            label="Ask Deepi about this proposal"
            placeholder="e.g. Does the recommendation hold up against the chapter text?"
          />
        </div>
      )}

      <Votes item={item} />

      {item.outcome ? (
        <p className={`mt-3 text-sm ${item.outcome.error ? 'text-rose-200' : 'text-emerald-200'}`}>
          {item.outcome.error
            ? `Two members agree on ${DECISION_LABEL[item.outcome.decision] || item.outcome.decision}, but carrying it out failed: ${item.outcome.error}`
            : `${DECISION_LABEL[item.outcome.decision] || item.outcome.decision}, carried out${item.outcome.executedAt ? ` ${new Date(item.outcome.executedAt).toLocaleString()}` : ''}${item.outcome.resultProposalId ? ` (revised copy ${shortId(item.outcome.resultProposalId)})` : ''}.`}
        </p>
      ) : null}

      {!isDone && mine ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 pt-3 text-sm">
          <span className="text-slate-200">
            Your vote: <strong>{DECISION_LABEL[mine.decision] || mine.decision}</strong>
            {mine.batchId ? <span className="text-slate-400"> (via batch)</span> : null}
            <span className="text-slate-400">
              {item.state === 'split' ? ' · the votes differ, so another member settles it' : ' · waiting for a second member'}
            </span>
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setChangingFor(changing ? null : mineKey)}
            className="text-violet-300 underline hover:text-violet-200 disabled:opacity-50"
          >
            {changing ? 'Keep my vote' : 'Change vote'}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onWithdraw(item)}
            className="text-slate-400 underline hover:text-slate-200 disabled:opacity-50"
          >
            Withdraw
          </button>
        </div>
      ) : null}
      {!isDone && showControls ? (
        <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
          <label className="block text-xs text-slate-400">
            Note (optional; the author reads it with a rejection)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Why this decision?"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              disabled={disabled || !canAgree}
              title={canAgree ? undefined : 'The analysis has no recommendation to agree with'}
              onClick={() =>
                rec && rec !== 'needs_person'
                  ? void onVote(item, rec, { revisedText: a?.revisedText || undefined, note: note.trim(), agrees: true })
                  : undefined
              }
              className="col-span-2 rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50 sm:col-span-1"
            >
              {canAgree && rec
                ? `Agree: ${DECISION_LABEL[rec] || rec}${rec === 'accept_revised' ? ' (as written above)' : ''}`
                : 'Agree with recommendation'}
            </button>
            {/* The Agree button already casts the recommended vote, so its plain twin is hidden. */}
            {rec !== 'accept' ? (
              <VoteButton label="Accept" active={mine?.decision === 'accept'} disabled={disabled} tone="emerald" onClick={() => void onVote(item, 'accept', { note: note.trim() })} />
            ) : null}
            <VoteButton
              label="Accept revised…"
              active={mine?.decision === 'accept_revised' || revising}
              disabled={disabled}
              tone="violet"
              onClick={() => setRevising((r) => !r)}
            />
            {rec !== 'decline' ? (
              <VoteButton label="Reject" active={mine?.decision === 'decline'} disabled={disabled} tone="rose" onClick={() => void onVote(item, 'decline', { note: note.trim() })} />
            ) : null}
            {rec !== 'defer' ? (
              <VoteButton label="Defer to 1.1" active={mine?.decision === 'defer'} disabled={disabled} tone="sky" onClick={() => void onVote(item, 'defer', { note: note.trim() })} />
            ) : null}
          </div>
          {revising ? (
            <div className="space-y-2 rounded-lg border border-violet-900/60 bg-violet-950/20 p-3">
              <label className="block text-xs text-slate-400">
                Revised text (votes agree only when the text matches, ignoring spacing)
                <textarea
                  value={revised}
                  onChange={(e) => setRevised(e.target.value)}
                  rows={Math.min(14, Math.max(4, revised.split('\n').length + 1))}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled || !revised.trim()}
                  onClick={async () => {
                    await onVote(item, 'accept_revised', { revisedText: revised.trim(), note: note.trim() });
                    setRevising(false);
                  }}
                  className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  Vote accept revised
                </button>
                <button type="button" onClick={() => setRevising(false)} className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {busy === `item:${item.proposalId}` ? <p className="text-xs text-slate-400">Saving…</p> : null}
        </div>
      ) : null}
      {flash?.text ? (
        <p role="status" className={`mt-2 text-sm ${flash.ok ? 'text-emerald-200' : 'text-rose-200'}`}>
          {flash.text}
        </p>
      ) : null}
    </li>
  );
}

const TONES = {
  emerald: { on: 'border-emerald-600 bg-emerald-950/40 text-emerald-100', hover: 'hover:border-emerald-700' },
  violet: { on: 'border-violet-500 bg-violet-950/40 text-violet-100', hover: 'hover:border-violet-600' },
  rose: { on: 'border-rose-600 bg-rose-950/40 text-rose-100', hover: 'hover:border-rose-700' },
  sky: { on: 'border-sky-600 bg-sky-950/40 text-sky-100', hover: 'hover:border-sky-700' },
};

function VoteButton({
  label,
  active,
  disabled,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  tone: keyof typeof TONES;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 ${
        active ? TONES[tone].on : `border-slate-700 text-slate-200 ${TONES[tone].hover}`
      }`}
    >
      {label}
    </button>
  );
}

function Votes({ item }: { item: SteeringItem }) {
  if (!item.votes.length) return <p className="mt-3 text-xs text-slate-500">No steering votes yet.</p>;
  return (
    <ul className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
      {item.votes.map((v, i) => (
        <li key={v.id || `${v.userId}-${i}`} className="text-slate-300">
          <span className="text-slate-100">
            {v.voterName}
            {v.mine ? ' (you)' : ''}
          </span>
          : {DECISION_LABEL[v.decision] || v.decision}
          {v.agreesWithAnalysis === true ? <span className="text-slate-500"> · agrees with the analysis</span> : null}
          {v.agreesWithAnalysis === false ? <span className="text-amber-200/80"> · differs from the analysis</span> : null}
          {v.batchId ? <span className="text-slate-500"> · via batch</span> : null}
          {v.note ? <span className="block text-slate-400">“{v.note}”</span> : null}
          {v.decision === 'accept_revised' && v.revisedText ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500">Their revised text</summary>
              <p className="mt-1 whitespace-pre-wrap rounded bg-emerald-950/30 px-2 py-1 text-emerald-100">{v.revisedText}</p>
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AnalysisBlock({ analysis: a }: { analysis: SteeringAnalysis }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Analysis{a.runLabel ? ` · ${a.runLabel}` : ''} · advisory
      </p>
      {a.summary ? <p className="mt-1 text-slate-200">{a.summary}</p> : null}
      {a.reasons.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
          {a.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      ) : null}
      {a.conflicts.length ? (
        <div className="mt-2">
          <p className="text-xs uppercase tracking-wide text-amber-300">Conflicts</p>
          <ul className="mt-1 space-y-1 text-slate-300">
            {a.conflicts.map((c, i) => (
              <li key={i}>
                {[c.mlNumber, c.section, c.proposalId ? shortId(c.proposalId) : null].filter(Boolean).join(' · ')}
                {c.mlNumber || c.section || c.proposalId ? ': ' : ''}
                {c.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {a.dependsOn.length ? (
        <p className="mt-2 text-xs text-amber-200">
          Carried out together with {a.dependsOn.map(shortId).join(', ')}.
        </p>
      ) : null}
      {a.evidence.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400">Evidence ({a.evidence.length})</summary>
          <ul className="mt-1 space-y-1.5 text-xs text-slate-400">
            {a.evidence.map((e, i) => (
              <li key={i} className="break-words">
                <span className="mr-1 rounded border border-slate-700 px-1 uppercase">{e.type}</span>
                <span className="text-slate-300">{e.ref}</span>
                {e.quote ? <span className="mt-0.5 block border-l-2 border-slate-700 pl-2 italic">{e.quote}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {a.verifierNote ? <p className="mt-2 text-xs text-slate-500">Second pass: {a.verifierNote}</p> : null}
    </div>
  );
}

function BundleEdits({ item }: { item: SteeringItem }) {
  const edits = item.proposal.edits || [];
  return (
    <div className="mt-3 space-y-2 text-sm">
      <p className="text-slate-300">{item.proposal.original_text || 'A bundle of edits approved together.'}</p>
      <details className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
        <summary className="cursor-pointer text-slate-200">
          Show all {edits.length} edit{edits.length === 1 ? '' : 's'}
        </summary>
        <ol className="mt-3 space-y-3">
          {edits.map((edit, i) => (
            <li key={i} className="space-y-1">
              {edit.note ? <p className="text-slate-300">{edit.note}</p> : null}
              <p className="whitespace-pre-wrap rounded bg-rose-950/30 px-2 py-1 text-rose-100">
                <span className="mr-1 text-rose-300">−</span>
                {edit.original_text}
              </p>
              {edit.proposed_text.trim() ? (
                <p className="whitespace-pre-wrap rounded bg-emerald-950/30 px-2 py-1 text-emerald-100">
                  <span className="mr-1 text-emerald-300">+</span>
                  {edit.proposed_text}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function shortId(id: string): string {
  return id.length > 10 ? `#${id.slice(0, 8)}` : `#${id}`;
}

const CHECK_TONE: Record<SteeringCheck, string> = {
  clean: 'border-emerald-700 text-emerald-200',
  flagged: 'border-amber-600 bg-amber-950/40 text-amber-200',
  unchecked: 'border-slate-700 text-slate-400',
};

function CarriedSection({
  ml,
  items,
  stageTitle,
  readOnly,
  busy,
  flash,
  onReview,
  onWithdraw,
  onKeepAll,
}: {
  ml: string;
  items: SteeringCarriedItem[];
  stageTitle: string;
  readOnly: boolean;
  busy: string | null;
  flash: Record<string, Flash>;
  onReview: (item: SteeringCarriedItem, decision: SteeringReviewDecision, note: string) => void;
  onWithdraw: (item: SteeringCarriedItem) => void;
  onKeepAll: () => void;
}) {
  // What "Keep all" would cover for the viewer: checked, no issue, not yet settled, not yet reviewed by them.
  const keepable = items.filter((i) => i.check === 'clean' && !i.decision && !i.reviews.some((r) => r.mine));
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
            Carried into {stageTitle} ({items.length})
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Accepted in an earlier stage and reviewed again here against this stage&apos;s analysis. Keep it, keep it
            with a follow-up edit, or defer it to 1.1. Nothing is reverted: a follow-up edit or an undo is filed as a
            new proposal. Two members settle each item; items nobody reviews are kept when the stage closes.
          </p>
        </div>
        {readOnly ? null : (
          <button
            type="button"
            disabled={!keepable.length || busy === 'keep-all'}
            onClick={onKeepAll}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {busy === 'keep-all' ? 'Keeping…' : `Keep all with no issue found (${keepable.length})`}
          </button>
        )}
      </div>
      {flash['keep-all']?.text ? (
        <p className={`text-sm ${flash['keep-all'].ok ? 'text-emerald-200' : 'text-rose-200'}`}>{flash['keep-all'].text}</p>
      ) : null}
      <ul className="space-y-4">
        {items.map((item) => (
          <CarriedCard
            key={item.proposalId}
            ml={ml}
            item={item}
            readOnly={readOnly}
            busy={busy === `carried:${item.proposalId}`}
            flash={flash[item.proposalId]}
            onReview={onReview}
            onWithdraw={onWithdraw}
          />
        ))}
      </ul>
    </section>
  );
}

function CarriedCard({
  ml,
  item,
  readOnly,
  busy,
  flash,
  onReview,
  onWithdraw,
}: {
  ml: string;
  item: SteeringCarriedItem;
  readOnly: boolean;
  busy: boolean;
  flash?: Flash;
  onReview: (item: SteeringCarriedItem, decision: SteeringReviewDecision, note: string) => void;
  onWithdraw: (item: SteeringCarriedItem) => void;
}) {
  const mine = item.reviews.find((r) => r.mine) || null;
  const [pending, setPending] = useState<SteeringReviewDecision | null>(null);
  const [note, setNote] = useState('');
  // The text that went in: the revised copy when the earlier decision changed the wording.
  const p = item.resultProposal || item.proposal;
  const earlierVoters = item.earlier.votes.map((v) => v.voterName).join(', ');
  const settled = Boolean(item.decision) || readOnly;
  return (
    <li className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={`rounded border px-1.5 py-0.5 ${CHECK_TONE[item.check]}`}>{CHECK_LABEL[item.check]}</span>
        {item.decision ? (
          <span className="rounded border border-emerald-700 px-1.5 py-0.5 text-emerald-200">{REVIEW_LABEL[item.decision]}</span>
        ) : item.keptByDefault ? (
          <span className="rounded border border-slate-600 px-1.5 py-0.5 text-slate-300">Kept (not reviewed)</span>
        ) : (
          <span className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-400">
            {item.state === 'one' ? 'Needs a second' : item.state === 'split' ? 'Split' : 'Not reviewed'}
          </span>
        )}
        <span className="text-slate-500">{shortId(item.proposalId)}</span>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        {item.earlier.stage || item.carriedFrom || 'Earlier'}:{' '}
        {item.earlier.outcome ? DECISION_LABEL[item.earlier.outcome.decision] || item.earlier.outcome.decision : 'Accepted'}
        {earlierVoters ? <span className="text-slate-500"> by {earlierVoters}</span> : null}
        {item.proposal.author_name ? <span className="text-slate-500"> · proposed by {item.proposal.author_name}</span> : null}
      </p>
      {item.previousReview ? (
        <p className="text-sm text-slate-400">
          {item.previousReview.stage}:{' '}
          {item.previousReview.keptByDefault
            ? 'kept (not reviewed)'
            : item.previousReview.decision
              ? REVIEW_LABEL[item.previousReview.decision as SteeringReviewDecision] || item.previousReview.decision
              : 'kept'}
          {item.previousReview.reviews.filter((r) => r.note).map((r) => (
            <span key={r.id} className="block text-slate-500">
              {r.voterName}: “{r.note}”
            </span>
          ))}
        </p>
      ) : null}
      <ActivityPatchPreview removed={p.original_text || null} added={p.proposed_text || null} mode="patch" />
      {item.analysis ? <AnalysisBlock analysis={item.analysis} /> : null}
      {readOnly ? null : (
        <div className="mt-2">
          <SteeringAskDeepi ml={ml} target={`item:${item.proposalId}`} label="Ask Deepi about this change" placeholder="e.g. Does this still fit with what DP12 says now?" />
        </div>
      )}
      {item.reviews.length ? (
        <ul className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
          {item.reviews.map((r) => (
            <li key={r.id} className="text-slate-300">
              <span className="text-slate-100">
                {r.voterName}
                {r.mine ? ' (you)' : ''}
              </span>
              : {REVIEW_LABEL[r.decision]}
              {r.bulk ? <span className="text-slate-500"> · via keep all</span> : null}
              {r.note ? <span className="block text-slate-400">“{r.note}”</span> : null}
            </li>
          ))}
        </ul>
      ) : readOnly ? null : (
        <p className="mt-3 text-xs text-slate-500">No reviews yet.</p>
      )}
      {settled ? null : (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <VoteButton label="Keep" tone="emerald" active={mine?.decision === 'keep'} disabled={busy}
              onClick={() => onReview(item, 'keep', '')} />
            <VoteButton label="Keep, with a follow-up edit" tone="violet" active={mine?.decision === 'follow_up' || pending === 'follow_up'}
              disabled={busy} onClick={() => setPending('follow_up')} />
            <VoteButton label="Defer to 1.1" tone="sky" active={mine?.decision === 'defer' || pending === 'defer'}
              disabled={busy} onClick={() => setPending('defer')} />
            {mine ? (
              <button type="button" disabled={busy} onClick={() => onWithdraw(item)} className="px-2 text-sm text-slate-400 hover:text-slate-200">
                Withdraw my review
              </button>
            ) : null}
          </div>
          {pending ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={pending === 'follow_up' ? 'What the follow-up edit should do' : 'Why it should wait for 1.1'}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !note.trim()}
                  onClick={() => {
                    onReview(item, pending, note.trim());
                    setPending(null);
                    setNote('');
                  }}
                  className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm text-white hover:bg-violet-600 disabled:opacity-50"
                >
                  Record: {REVIEW_LABEL[pending]}
                </button>
                <button type="button" onClick={() => setPending(null)} className="px-2 text-sm text-slate-400 hover:text-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
      {flash?.text ? <p className={`mt-2 text-sm ${flash.ok ? 'text-emerald-200' : 'text-rose-200'}`}>{flash.text}</p> : null}
    </li>
  );
}

function SignoffPanel({
  signoff,
  readOnly,
  busy,
  flash,
  onSign,
}: {
  signoff: SteeringSignoff;
  readOnly: boolean;
  busy: boolean;
  flash?: Flash;
  onSign: (withdraw: boolean, note: string) => void;
}) {
  const [note, setNote] = useState('');
  const mine = signoff.signoffs.find((s) => s.mine && s.current) || null;
  const current = signoff.signoffs.filter((s) => s.current);
  return (
    <section className="rounded-2xl border border-violet-800/60 bg-violet-950/20 p-4 text-sm">
      <h2 className="font-semibold text-white">Final sign-off</h2>
      <p className="mt-1 text-slate-300">
        {signoff.signed
          ? 'Signed off: two steering members approved this document’s finished text.'
          : `Two steering members sign off this document’s finished text. ${current.length} of ${signoff.needed} so far.`}{' '}
        A sign-off is tied to the text as it was when given; any later change voids it.
      </p>
      {signoff.signoffs.length ? (
        <ul className="mt-2 space-y-1 text-slate-300">
          {signoff.signoffs.map((s) => (
            <li key={s.id}>
              {s.voterName}
              {s.mine ? ' (you)' : ''}
              {s.createdAt ? <span className="text-slate-500"> · {new Date(s.createdAt).toLocaleString()}</span> : null}
              {s.current ? null : <span className="text-amber-200"> · the text changed since; sign again</span>}
              {s.note ? <span className="block text-slate-400">“{s.note}”</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {readOnly ? null : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {mine ? (
            <button type="button" disabled={busy} onClick={() => onSign(true, '')}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-200 hover:border-slate-400 disabled:opacity-50">
              Withdraw my sign-off
            </button>
          ) : (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
              />
              <button type="button" disabled={busy} onClick={() => onSign(false, note.trim())}
                className="rounded-lg bg-violet-700 px-4 py-1.5 font-medium text-white hover:bg-violet-600 disabled:opacity-50">
                {busy ? 'Signing…' : 'Sign off this text'}
              </button>
            </>
          )}
        </div>
      )}
      {flash?.text ? <p className={`mt-2 ${flash.ok ? 'text-emerald-200' : 'text-rose-200'}`}>{flash.text}</p> : null}
    </section>
  );
}
