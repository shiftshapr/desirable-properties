'use client';

import { useEffect, useState } from 'react';

type Ask = { id: string; createdAt: string; question: string; answer: string | null; error: string | null };

/**
 * Ask Deepi (Claude Opus 5.5) about one proposal. Each person's thread is private to them; Deepi
 * sees the proposal, the chapter and the style guide. Members and co-editors only, with a daily limit.
 */
export default function ReviewAskDeepi({ workgroupId, itemKey }: { workgroupId: string; itemKey: string }) {
  const [open, setOpen] = useState(false);
  const [asks, setAsks] = useState<Ask[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/workgroups/${encodeURIComponent(workgroupId)}/review/ask`;

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
        className="mt-3 text-sm text-cyan-300 hover:text-cyan-200"
      >
        Ask Deepi about this proposal
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-cyan-900/60 bg-cyan-950/10 p-3">
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
