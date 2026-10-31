'use client';

import { useEffect, useState } from 'react';
import ReviewReviseForm from '@/components/workgroup/ReviewReviseForm';
import ReviewSplitForm, { type SplitDraft } from '@/components/workgroup/ReviewSplitForm';
import type { ReviewQueueItem } from '@/lib/workgroup-review-types';

type Ask = {
  id: string;
  createdAt: string;
  question: string;
  answer: string | null;
  error: string | null;
  offersSplit?: boolean;
  offersRevise?: boolean;
};

/**
 * Ask Deepi (Claude Opus 5.5) about one proposal. Each person's thread is private to them; Deepi
 * sees the proposal, the chapter and the style guide. Members and co-editors only, with a daily limit.
 *
 * When Deepi recommends splitting the proposal, a co-editor is offered Deepi's draft of the split
 * proposals (each with its own anchor) to check and post: the only way to split one proposal. When
 * Deepi suggests a different place or wording instead, a co-editor is offered that revised proposal
 * in the Revise form.
 */
export default function ReviewAskDeepi({
  workgroupId,
  item,
  canSplit,
  onSplit,
}: {
  workgroupId: string;
  item: ReviewQueueItem;
  /** Viewer is a co-editor and the item is a pending Gov Hub patch or insert. */
  canSplit: boolean;
  /** After a split or revision is filed. */
  onSplit: (message: string) => void;
}) {
  const itemKey = item.key;
  const [open, setOpen] = useState(false);
  const [asks, setAsks] = useState<Ask[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<(SplitDraft & { kind: 'split' | 'revise' }) | null>(null);
  const [drafting, setDrafting] = useState(false);
  const base = `/api/workgroups/${encodeURIComponent(workgroupId)}/review/ask`;

  async function draftSplit(kind: 'split' | 'revise') {
    if (drafting) return;
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch(`${base}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemKey, kind }),
      });
      const body = (await res.json().catch(() => ({}))) as { draft?: SplitDraft; remainingToday?: number; error?: string };
      if (typeof body.remainingToday === 'number') setRemaining(body.remainingToday);
      if (!res.ok || !body.draft) throw new Error(body.error || `Draft failed (${res.status})`);
      setDraft({ ...body.draft, kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed');
    } finally {
      setDrafting(false);
    }
  }

  useEffect(() => {
    if (!open || asks) return;
    let cancelled = false;
    fetch(`${base}?itemKey=${encodeURIComponent(itemKey)}`, { cache: 'no-store', credentials: 'include' })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { asks?: Ask[]; remainingToday?: number; error?: string };
        if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
        if (cancelled) return;
        setAsks(body.asks || []);
        setRemaining(body.remainingToday ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load');
      });
    return () => {
      cancelled = true;
    };
  }, [open, asks, base, itemKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemKey, question: q }),
      });
      const body = (await res.json().catch(() => ({}))) as { ask?: Ask; remainingToday?: number; error?: string };
      if (typeof body.remainingToday === 'number') setRemaining(body.remainingToday);
      if (body.ask) setAsks((a) => [...(a || []), body.ask!]);
      if (!res.ok) throw new Error(body.ask?.error || body.error || `Ask failed (${res.status})`);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ask failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-cyan-300 hover:text-cyan-200"
      >
        Ask Deepi about this proposal
      </button>
    );
  }

  return (
    <div className="w-full basis-full space-y-3 rounded-lg border border-cyan-900/60 bg-cyan-950/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-slate-400">
          Ask Deepi (Claude Opus 5.5) about this proposal. Deepi has read the chapter and the style guide. Only you
          see your questions.
        </p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-300">
          Close
        </button>
      </div>
      {asks?.map((a) => (
        <div key={a.id} className="space-y-1 text-sm">
          <p className="text-slate-200">
            <span className="text-slate-500">You: </span>
            {a.question}
          </p>
          {a.answer ? (
            <p className="whitespace-pre-line text-slate-300">
              <span className="text-cyan-300">Deepi: </span>
              {a.answer}
            </p>
          ) : (
            <p className="text-xs text-rose-200">{a.error || 'No answer.'}</p>
          )}
        </div>
      ))}
      {!asks && !error ? <p className="text-sm text-slate-400">Loading…</p> : null}
      {/* Offered only when one of Deepi's answers recommends separate proposals. */}
      {canSplit && !draft && asks?.some((a) => a.offersSplit) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-800/60 bg-violet-950/20 p-3 text-sm">
          <span className="text-violet-100">
            Deepi recommends splitting this into separate proposals. Create them from its advice, check each one, then
            post.
          </span>
          <button
            type="button"
            disabled={drafting || remaining === 0}
            onClick={() => void draftSplit('split')}
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {drafting ? 'Deepi is drafting…' : 'Create the proposals Deepi recommends'}
          </button>
        </div>
      ) : canSplit && !draft && asks?.some((a) => a.offersRevise) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-800/60 bg-violet-950/20 p-3 text-sm">
          <span className="text-violet-100">
            Deepi suggests a different place or wording for this proposal. Have it draft the revision, check it, then
            save.
          </span>
          <button
            type="button"
            disabled={drafting || remaining === 0}
            onClick={() => void draftSplit('revise')}
            className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {drafting ? 'Deepi is drafting…' : "Apply Deepi's suggestion"}
          </button>
        </div>
      ) : null}
      {draft?.kind === 'revise' && draft.parts[0] ? (
        <ReviewReviseForm
          workgroupId={workgroupId}
          item={item}
          deepi={{ ...draft.parts[0], note: draft.note }}
          onCancel={() => setDraft(null)}
          onDone={(message) => {
            setDraft(null);
            onSplit(message);
          }}
        />
      ) : draft ? (
        <ReviewSplitForm
          workgroupId={workgroupId}
          item={item}
          draft={draft}
          onCancel={() => setDraft(null)}
          onDone={(message) => {
            setDraft(null);
            onSplit(message);
          }}
        />
      ) : null}
      <form onSubmit={(e) => void submit(e)} className="space-y-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="e.g. Does this repeat anything already in the chapter?"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || !question.trim() || remaining === 0}
            className="rounded-lg border border-cyan-700 px-3 py-1.5 text-sm text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
          >
            {busy ? 'Deepi is reading…' : 'Ask'}
          </button>
          {remaining !== null ? (
            <span className="text-xs text-slate-500">{remaining} question{remaining === 1 ? '' : 's'} left today</span>
          ) : null}
        </div>
      </form>
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
    </div>
  );
}
