'use client';

import { useMemo, useState } from 'react';
import {
  chapterEditStatusLabel,
  editSummaryText,
  isLegacyFullChapterEdit,
  patchModeLabel,
  type WorkgroupChapterEdit,
} from '@/lib/workgroup-chapter-edit-types';
import { reviewWorkgroupChapterEditClient } from '@/lib/workgroup-chapter-edit-api';
import { buildDiffOps, changeCounts, type DiffOp } from '@/lib/textDiff';

type Props = {
  workgroupId: string;
  dpKey: string;
  edits: WorkgroupChapterEdit[];
  effectiveMarkdown: string;
  canReview: boolean;
  onUpdate: () => void;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DiffOpsView({ ops }: { ops: DiffOp[] }) {
  return (
    <>
      {ops.map((op, idx) => {
        if (op.type === 'equal') return <span key={idx}>{op.text}</span>;
        if (op.type === 'del') {
          return (
            <del key={idx} className="dp-diff-del">
              {op.text}
            </del>
          );
        }
        return (
          <mark key={idx} className="dp-diff-ins">
            {op.text}
          </mark>
        );
      })}
    </>
  );
}

function PassageDiff({ original, proposed }: { original: string; proposed: string }) {
  const ops = useMemo(() => buildDiffOps(original, proposed), [original, proposed]);
  const counts = useMemo(() => changeCounts(original, proposed), [original, proposed]);

  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
        Passage diff · green = added · red strikeout = removed
        {counts.added > 0 || counts.removed > 0 ? (
          <>
            {' '}
            ·{' '}
            {counts.added > 0 ? (
              <span className="text-emerald-400">+{counts.added} chars</span>
            ) : null}
            {counts.added > 0 && counts.removed > 0 ? ' · ' : null}
            {counts.removed > 0 ? (
              <span className="text-rose-400">−{counts.removed} chars</span>
            ) : null}
          </>
        ) : null}
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-100">
        <DiffOpsView ops={ops} />
      </pre>
    </div>
  );
}

function editSummary(edit: WorkgroupChapterEdit, base: string): string {
  return editSummaryText(edit, base);
}

export default function WorkgroupPendingSuggestions({
  workgroupId,
  dpKey,
  edits,
  effectiveMarkdown,
  canReview,
  onUpdate,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      [...edits]
        .filter((edit) => edit.status === 'pending')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [edits],
  );

  if (!pending.length) return null;

  async function handleReview(editId: string, action: 'approve' | 'reject') {
    if (!canReview || busyId) return;
    setBusyId(editId);
    setNotice(null);
    try {
      await reviewWorkgroupChapterEditClient(workgroupId, editId, action, dpKey);
      setNotice(
        action === 'approve'
          ? 'Suggestion approved and applied to the chapter.'
          : 'Suggestion rejected.',
      );
      onUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update suggestion';
      setNotice(
        message === 'anchor_missing'
          ? 'Cannot approve: the anchor passage is no longer in the chapter. Ask the member to resubmit.'
          : message,
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      id="pending-suggestions"
      className="scroll-mt-24 rounded-xl border border-amber-900/50 bg-amber-950/15 p-4 sm:p-5"
    >
      <h3 className="text-base font-semibold text-amber-100">
        Pending suggestions
        <span className="ml-2 text-sm font-normal text-amber-200/70">({pending.length})</span>
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        Passage patches and inserts stay private until a coordinator approves them. Rejected
        suggestions do not change the live chapter.
      </p>

      <ul className="mt-4 space-y-3">
        {pending.map((edit) => {
          const base = edit.baseMarkdown || effectiveMarkdown;
          const summary = editSummary(edit, base);
          const expanded = expandedId === edit.id;
          const isPatch =
            !isLegacyFullChapterEdit(edit) &&
            Boolean(edit.originalText) &&
            Boolean(edit.proposedText);

          return (
            <li
              key={edit.id}
              className="rounded-lg border border-amber-900/40 bg-slate-950/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{edit.authorName}</p>
                    <span className="rounded-full border border-amber-800/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200/80">
                      {patchModeLabel(edit.patchMode)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatWhen(edit.createdAt)} · {chapterEditStatusLabel(edit.status)}
                  </p>
                  {edit.rationale ? (
                    <p className="mt-2 text-sm text-slate-300">{edit.rationale}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">{summary}</p>
                </div>
                {canReview ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : edit.id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
                    >
                      {expanded ? 'Hide diff' : 'Review diff'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === edit.id}
                      onClick={() => void handleReview(edit.id, 'reject')}
                      className="rounded-lg border border-rose-800/60 px-3 py-1.5 text-xs font-medium text-rose-200 hover:border-rose-600 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busyId === edit.id}
                      onClick={() => void handleReview(edit.id, 'approve')}
                      className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:border-emerald-600 disabled:opacity-50"
                    >
                      {busyId === edit.id ? 'Saving…' : 'Approve'}
                    </button>
                  </div>
                ) : null}
              </div>

              {expanded ? (
                <div className="mt-3 border-t border-slate-800 pt-3">
                  {isPatch ? (
                    <PassageDiff
                      original={
                        edit.patchMode === 'insert'
                          ? edit.originalText || ''
                          : edit.originalText || ''
                      }
                      proposed={
                        edit.patchMode === 'insert'
                          ? `${edit.proposedText || ''}\n${edit.originalText || ''}`
                          : edit.proposedText || ''
                      }
                    />
                  ) : (
                    <PassageDiff original={base} proposed={edit.markdown || base} />
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {notice ? <p className="mt-3 text-sm text-amber-100/90">{notice}</p> : null}
    </section>
  );
}
