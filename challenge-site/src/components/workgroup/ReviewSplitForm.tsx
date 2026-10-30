'use client';

import { useEffect, useState } from 'react';
import PassagePicker from '@/components/workgroup/PassagePicker';
import SectionLabel from '@/components/workgroup/SectionLabel';
import { plainBlock, sectionTrail } from '@/lib/chapter-sections';
import type { ReviewQueueItem } from '@/lib/workgroup-review-types';

type Mode = 'replace' | 'insert' | 'insert_after';
type Part = { passageIndex: number | null; patchMode: Mode; text: string; why: string };

/** Deepi's draft, as returned by /review/ask/split. */
export type SplitDraft = {
  parts: Array<{ passageIndex: number; passage: string; patchMode: Mode; text: string; why: string }>;
  note: string;
};

const MODE_LABEL: Record<Mode, string> = {
  insert: 'Insert above it',
  insert_after: 'Insert below it',
  replace: 'Replace it',
};
const MAX_PARTS = 6;

/**
 * A co-editor checks Deepi's split of one proposal into several, each with its own anchor, and posts
 * them. Gov Hub files every part under the author's name with this co-editor's approval and closes the
 * original with the note.
 */
export default function ReviewSplitForm({
  workgroupId,
  item,
  draft,
  onDone,
  onCancel,
}: {
  workgroupId: string;
  item: ReviewQueueItem;
  draft: SplitDraft;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [passages, setPassages] = useState<string[] | null>(null);
  const [parts, setParts] = useState<Part[]>(() =>
    draft.parts.map((p) => ({ passageIndex: p.passageIndex, patchMode: p.patchMode, text: p.text, why: p.why })),
  );
  const [picking, setPicking] = useState<number | null>(null);
  const [note, setNote] = useState(draft.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/passages`, { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { passages?: string[]; error?: string };
        if (!res.ok) throw new Error(data.error || `Could not load the chapter (${res.status})`);
        if (cancelled) return;
        const list = data.passages || [];
        setPassages(list);
        // The chapter may have moved on since Deepi read it: find each passage again, or ask for a pick.
        setParts((prev) =>
          prev.map((part, i) => {
            const wanted = draft.parts[i]?.passage;
            if (part.passageIndex !== null && list[part.passageIndex] === wanted) return part;
            const at = wanted ? list.indexOf(wanted) : -1;
            return { ...part, passageIndex: at >= 0 ? at : null };
          }),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the chapter');
      });
    return () => {
      cancelled = true;
    };
  }, [workgroupId, draft]);

  const update = (i: number, change: Partial<Part>) =>
    setParts((prev) => prev.map((p, j) => (j === i ? { ...p, ...change } : p)));

  const ready = parts.every((p) => p.passageIndex !== null && p.text.trim());
  const canSubmit = !busy && Boolean(passages) && parts.length >= 2 && ready && Boolean(note.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !passages) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          govhubProposalId: item.govhubProposalId,
          note: note.trim(),
          parts: parts.map((p) => ({
            originalText: passages[p.passageIndex!],
            proposedText: p.text.trim(),
            patchMode: p.patchMode,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Split failed (${res.status})`);
      onDone(data.message || `Split into ${parts.length} proposals.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-4 rounded-lg border border-violet-800/50 bg-violet-950/15 p-4"
    >
      <div>
        <h4 className="text-sm font-semibold text-white">Split into {parts.length} proposals</h4>
        <p className="mt-1 text-xs text-slate-400">
          Deepi drafted these from its advice. Check each place and text, then post. Each part is filed under{' '}
          {item.authorName}&apos;s name with your approval, and the original closes with your note. Each part goes in
          when the other co-editors approve it.
        </p>
      </div>

      {parts.map((part, i) => (
        <fieldset key={i} aria-label={`Part ${i + 1}`} className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-200">Part {i + 1}</p>
            {parts.length > 2 ? (
              <button
                type="button"
                onClick={() => setParts((prev) => prev.filter((_, j) => j !== i))}
                className="text-xs text-slate-500 hover:text-rose-200"
              >
                Remove part
              </button>
            ) : null}
          </div>
          {passages && part.passageIndex !== null ? (
            <>
              <SectionLabel section={sectionTrail(passages, part.passageIndex).join(' › ') || null} className="" />
              <p className="line-clamp-3 rounded border border-slate-800 px-2 py-1.5 text-sm text-slate-400">
                {plainBlock(passages[part.passageIndex])}
              </p>
            </>
          ) : passages ? (
            <p className="text-sm text-amber-200">That passage has changed since Deepi read the chapter. Pick the place.</p>
          ) : (
            <p className="text-sm text-slate-400">Loading the chapter…</p>
          )}
          {passages ? (
            picking === i ? (
              <div className="space-y-2">
                <PassagePicker
                  passages={passages}
                  picked={part.passageIndex}
                  onPick={(index) => {
                    update(i, { passageIndex: index });
                    setPicking(null);
                  }}
                />
                <button type="button" onClick={() => setPicking(null)} className="text-xs text-slate-400 hover:text-slate-200">
                  Keep this place
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setPicking(i)} className="text-xs text-violet-200 hover:text-violet-100">
                Choose another passage
              </button>
            )
          ) : null}
          <div className="flex flex-wrap gap-4 text-sm text-slate-300" role="radiogroup" aria-label={`How part ${i + 1} goes in`}>
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`split-${item.key}-${i}`}
                  checked={part.patchMode === m}
                  onChange={() => update(i, { patchMode: m })}
                />
                {MODE_LABEL[m]}
              </label>
            ))}
          </div>
          <textarea
            value={part.text}
            onChange={(e) => update(i, { text: e.target.value })}
            rows={Math.min(10, Math.max(3, Math.ceil(part.text.length / 90)))}
            aria-label={`Part ${i + 1} text`}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          {part.why ? <p className="text-xs text-slate-500">Deepi: {part.why}</p> : null}
        </fieldset>
      ))}

      {parts.length < MAX_PARTS ? (
        <button
          type="button"
          onClick={() => setParts((prev) => [...prev, { passageIndex: null, patchMode: 'insert_after', text: '', why: '' }])}
          className="text-sm text-violet-200 hover:text-violet-100"
        >
          Add a part
        </button>
      ) : null}

      <label className="block text-sm text-slate-300">
        Note to the author <span className="text-slate-500">(required: how and why you split it)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          {busy ? 'Posting…' : `Post ${parts.length} proposals and approve`}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">
          Cancel
        </button>
      </div>
      {!ready && passages ? <p className="text-xs text-slate-500">Every part needs a place and text.</p> : null}
    </form>
  );
}
