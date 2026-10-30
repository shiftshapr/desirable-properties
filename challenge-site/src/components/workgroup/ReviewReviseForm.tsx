'use client';

import { useEffect, useState } from 'react';
import PassagePicker from '@/components/workgroup/PassagePicker';
import SectionLabel from '@/components/workgroup/SectionLabel';
import { sectionTrail } from '@/lib/chapter-sections';
import type { ReviewAnchorEval, ReviewQueueItem } from '@/lib/workgroup-review-types';

type Placement = 'same' | 'elsewhere';
type Mode = 'replace' | 'insert' | 'insert_after';

type Props = {
  workgroupId: string;
  item: ReviewQueueItem;
  /** Claude's suggested anchor: the form starts on it, with a note the co-editor can edit. */
  suggestion?: ReviewAnchorEval | null;
  /** Deepi's revised proposal from Ask Deepi: the form starts on its place, text and note. */
  /** Deepi's draft; passageIndex -1 means it keeps the proposal where it is. */
  deepi?: { passageIndex: number; passage: string; patchMode: Mode; text: string; note: string } | null;
  onDone: (message: string) => void;
  onCancel: () => void;
};

const MODE_LABEL: Record<Mode, string> = {
  replace: 'Replace this passage',
  insert: 'Insert above it',
  insert_after: 'Insert below it',
};

/**
 * A co-editor's revision of a pending proposal: edit the text, move it to another passage, or both.
 * Gov Hub files the result as a new version credited to the author, with this co-editor's approval,
 * and closes the original as considered with the note.
 */
export default function ReviewReviseForm({ workgroupId, item, suggestion, deepi, onDone, onCancel }: Props) {
  const [text, setText] = useState(deepi?.text ?? item.proposedText);
  const deepiMoves = Boolean(deepi && deepi.passageIndex >= 0 && deepi.passage.trim() !== item.originalText.trim());
  const [placement, setPlacement] = useState<Placement>(suggestion || deepiMoves ? 'elsewhere' : 'same');
  const [passages, setPassages] = useState<string[] | null>(null);
  const [passageError, setPassageError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(deepi?.patchMode ?? suggestion?.suggestedMode ?? 'insert_after');
  const [note, setNote] = useState(
    deepi?.note ?? (suggestion ? `Same text, moved to a better place in the chapter. ${suggestion.reason}` : ''),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (placement !== 'elsewhere' || passages) return;
    let cancelled = false;
    fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/passages`, { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { passages?: string[]; error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || `Could not load the chapter (${res.status})`);
        const list = data.passages || [];
        setPassages(list);
        const wanted = (deepiMoves ? deepi?.passage : null) ?? suggestion?.suggestedPassage;
        if (wanted) {
          const at = list.indexOf(wanted);
          if (at >= 0) setPicked(at);
          else setPassageError('The suggested passage has changed since it was read. Pick the place yourself.');
        }
      })
      .catch((err) => {
        if (!cancelled) setPassageError(err instanceof Error ? err.message : 'Could not load the chapter');
      });
    return () => {
      cancelled = true;
    };
  }, [placement, passages, workgroupId, suggestion, deepi, deepiMoves]);

  const textChanged = text.trim() !== item.proposedText.trim();
  const moved = placement === 'elsewhere' && picked !== null;
  const canSubmit =
    !busy && Boolean(text.trim()) && Boolean(note.trim()) && (textChanged || moved) &&
    (placement === 'same' || picked !== null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          govhubProposalId: item.govhubProposalId,
          proposedText: text.trim(),
          note: note.trim(),
          ...(moved && passages ? { originalText: passages[picked!], patchMode: mode } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Revise failed (${res.status})`);
      onDone(data.message || 'Revised and approved by you.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revise failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-3 space-y-4 rounded-lg border border-violet-800/50 bg-violet-950/15 p-4"
    >
      <div>
        <h4 className="text-sm font-semibold text-white">Revise this proposal</h4>
        <p className="mt-1 text-xs text-slate-400">
          Your version is filed under {item.authorName}&apos;s name, with your approval. The original closes with your
          note, so the author sees what changed. It goes in when the other co-editors approve your version.
        </p>
      </div>

      <label className="block text-sm text-slate-300">
        Text
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(12, Math.max(4, Math.ceil(text.length / 90)))}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </label>

      <fieldset className="space-y-2 text-sm text-slate-300">
        <legend className="mb-1">Placement</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name={`placement-${item.key}`} checked={placement === 'same'} onChange={() => setPlacement('same')} />
          Keep where it is
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`placement-${item.key}`}
            checked={placement === 'elsewhere'}
            onChange={() => setPlacement('elsewhere')}
          />
          Put it somewhere else in the chapter
        </label>
      </fieldset>

      {placement === 'elsewhere' ? (
        <div className="space-y-2">
          {passageError ? <p className="text-sm text-rose-200">{passageError}</p> : null}
          {!passages && !passageError ? <p className="text-sm text-slate-400">Loading the chapter…</p> : null}
          {passages ? (
            <>
              <PassagePicker passages={passages} picked={picked} onPick={setPicked} />
              {picked !== null ? (
                <SectionLabel section={sectionTrail(passages, picked).join(' › ') || null} className="" />
              ) : null}
              {picked !== null ? (
                <div className="flex flex-wrap gap-4 text-sm text-slate-300" role="radiogroup" aria-label="How it goes in">
                  {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
                    <label key={m} className="flex items-center gap-2">
                      <input type="radio" name={`mode-${item.key}`} checked={mode === m} onChange={() => setMode(m)} />
                      {MODE_LABEL[m]}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Pick the passage it should replace or sit next to.</p>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      <label className="block text-sm text-slate-300">
        Note to the author <span className="text-slate-500">(required: what you changed and why)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="e.g. Same text, moved next to the section on consent, where it fits better."
        />
      </label>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save revision and approve'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">
          Cancel
        </button>
      </div>
      {!textChanged && !moved ? (
        <p className="text-xs text-slate-500">Change the text or choose another place to save a revision.</p>
      ) : null}
    </form>
  );
}
