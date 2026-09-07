'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  applyPatchToMarkdown,
  passageExistsInMarkdown,
  summarizePatch,
  type ChapterPatchMode,
} from '@/lib/workgroup-chapter-patch';
import {
  chapterEditStatusLabel,
  isLegacyFullChapterEdit,
  patchModeLabel,
  type WorkgroupChapterEdit,
  type WorkgroupChapterEditList,
} from '@/lib/workgroup-chapter-edit-types';
import {
  reviewWorkgroupChapterEditClient,
  submitWorkgroupChapterSuggestionClient,
} from '@/lib/workgroup-chapter-edit-api';

type Props = {
  workgroupId: string;
  dpKey: string;
  astraReleaseId: string;
  editState: WorkgroupChapterEditList;
  canEdit: boolean;
  isMember: boolean;
  signedIn: boolean;
  onUpdate: (next: WorkgroupChapterEditList) => void;
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

function statusBadgeClass(status: WorkgroupChapterEdit['status']): string {
  switch (status) {
    case 'pending':
      return 'border-amber-800/60 text-amber-200';
    case 'active':
      return 'border-emerald-800/60 text-emerald-200';
    case 'rejected':
      return 'border-rose-800/60 text-rose-200';
    case 'revoked':
      return 'border-slate-600 text-slate-400';
    default:
      return 'border-slate-700 text-slate-300';
  }
}

function editSummaryLine(edit: WorkgroupChapterEdit): string {
  if (isLegacyFullChapterEdit(edit)) return 'Legacy full-chapter snapshot';
  if (edit.patchMode && edit.originalText && edit.proposedText) {
    return summarizePatch({
      patchMode: edit.patchMode,
      originalText: edit.originalText,
      proposedText: edit.proposedText,
    });
  }
  return 'Passage edit';
}

export default function WorkgroupChapterEditor({
  workgroupId,
  dpKey,
  astraReleaseId,
  editState,
  canEdit,
  isMember,
  signedIn,
  onUpdate,
}: Props) {
  const [patchMode, setPatchMode] = useState<ChapterPatchMode>('replace');
  const [originalText, setOriginalText] = useState('');
  const [proposedText, setProposedText] = useState('');
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const anchorOk = useMemo(
    () => !originalText.trim() || passageExistsInMarkdown(editState.effectiveMarkdown, originalText),
    [editState.effectiveMarkdown, originalText],
  );

  const previewResult = useMemo(() => {
    if (!originalText.trim() || !proposedText.trim() || !anchorOk) return null;
    return applyPatchToMarkdown(editState.effectiveMarkdown, {
      patchMode,
      originalText,
      proposedText,
    });
  }, [editState.effectiveMarkdown, originalText, proposedText, patchMode, anchorOk]);

  const canSubmit =
    Boolean(originalText.trim()) && Boolean(proposedText.trim()) && anchorOk && !busy;

  async function handleSubmit() {
    if (!signedIn || !isMember || !canSubmit) return;
    setBusy(true);
    setNotice(null);
    try {
      const next = await submitWorkgroupChapterSuggestionClient(workgroupId, {
        dpKey,
        astraReleaseId,
        patchMode,
        originalText: originalText.trim(),
        proposedText: proposedText.trim(),
        rationale: rationale.trim() || undefined,
      });
      onUpdate(next);
      setOriginalText('');
      setProposedText('');
      setRationale('');
      setNotice(
        'Suggestion submitted. A coordinator must approve it before it appears in the live chapter.',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not submit suggestion');
    } finally {
      setBusy(false);
    }
  }

  async function handleCoordinatorAction(
    edit: WorkgroupChapterEdit,
    action: 'revoke' | 'restore',
  ) {
    if (!canEdit || statusBusy) return;
    setStatusBusy(edit.id);
    setNotice(null);
    try {
      const next = await reviewWorkgroupChapterEditClient(workgroupId, edit.id, action, dpKey);
      onUpdate(next);
      setNotice(action === 'restore' ? 'Approved edit restored.' : 'Approved edit revoked.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update edit');
    } finally {
      setStatusBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section
        id="propose-edit"
        className="scroll-mt-24 rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-4 sm:p-5"
      >
        <h3 className="text-base font-semibold text-white">Suggest a passage change</h3>
        <p className="mt-2 text-sm text-slate-400">
          Propose a patch or insert on a specific passage. Copy the exact anchor text from the
          chapter reader below. Coordinators review pending suggestions before anything goes live.
        </p>
        {editState.pendingCount > 0 ? (
          <p className="mt-2 text-xs text-amber-200/90">
            {editState.pendingCount} suggestion{editState.pendingCount === 1 ? '' : 's'} awaiting
            coordinator approval.
            {canEdit ? (
              <>
                {' '}
                <a href="#pending-suggestions" className="underline underline-offset-2 hover:text-amber-100">
                  Review pending
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        {!signedIn ? (
          <p className="mt-3 text-sm text-slate-400">
            <Link href="/login" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
              Sign in
            </Link>
            {' '}to suggest edits.
          </p>
        ) : !isMember ? (
          <p className="mt-3 text-sm text-slate-400">Join this workgroup to suggest edits.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-wide text-slate-500">Mode</span>
                <select
                  value={patchMode}
                  onChange={(event) => setPatchMode(event.target.value as ChapterPatchMode)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                >
                  <option value="replace">Replace passage</option>
                  <option value="insert">Insert above passage</option>
                </select>
              </label>
            </div>

            <label className="mt-3 block text-sm text-slate-300">
              Anchor passage (exact text from chapter)
              <textarea
                value={originalText}
                onChange={(event) => setOriginalText(event.target.value)}
                rows={4}
                spellCheck
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100"
                placeholder="Paste the passage you want to change or insert above"
              />
            </label>
            {originalText.trim() && !anchorOk ? (
              <p className="mt-1 text-xs text-rose-300">
                Anchor not found in the current chapter. Copy the exact text from the reader tab.
              </p>
            ) : null}

            <label className="mt-3 block text-sm text-slate-300">
              {patchMode === 'insert' ? 'Text to insert above anchor' : 'Replacement text'}
              <textarea
                value={proposedText}
                onChange={(event) => setProposedText(event.target.value)}
                rows={4}
                spellCheck
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100"
                placeholder={patchMode === 'insert' ? 'New paragraph or sentence to add' : 'Revised passage'}
              />
            </label>

            {previewResult !== null ? (
              <p className="mt-2 text-xs text-cyan-300/90">
                Preview: {summarizePatch({ patchMode, originalText, proposedText })}
              </p>
            ) : null}

            <label className="mt-3 block text-sm text-slate-300">
              Rationale (recommended)
              <textarea
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Why this change helps the chapter"
              />
            </label>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Submit suggestion for approval'}
            </button>
          </>
        )}
      </section>

      {editState.edits.length > 0 ? (
        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Suggestion history</h3>
          <ul className="mt-3 space-y-2">
            {[...editState.edits].reverse().map((edit) => (
              <li
                key={edit.id}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-200">{edit.authorName}</p>
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {patchModeLabel(edit.patchMode)}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadgeClass(edit.status)}`}
                      >
                        {chapterEditStatusLabel(edit.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{formatWhen(edit.createdAt)}</p>
                    <p className="mt-1 text-xs text-slate-400">{editSummaryLine(edit)}</p>
                    {edit.rationale ? (
                      <p className="mt-1 text-xs text-slate-400">{edit.rationale}</p>
                    ) : null}
                    {edit.reviewedAt && edit.status !== 'pending' ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Reviewed {formatWhen(edit.reviewedAt)}
                      </p>
                    ) : null}
                  </div>
                  {canEdit && (edit.status === 'active' || edit.status === 'revoked') ? (
                    <button
                      type="button"
                      disabled={statusBusy === edit.id}
                      onClick={() =>
                        void handleCoordinatorAction(
                          edit,
                          edit.status === 'revoked' ? 'restore' : 'revoke',
                        )
                      }
                      className={`rounded-lg border px-3 py-1 text-xs font-medium ${
                        edit.status === 'revoked'
                          ? 'border-emerald-800/60 text-emerald-200 hover:border-emerald-600'
                          : 'border-rose-800/60 text-rose-200 hover:border-rose-600'
                      } disabled:opacity-50`}
                    >
                      {statusBusy === edit.id
                        ? 'Saving…'
                        : edit.status === 'revoked'
                          ? 'Restore approved edit'
                          : 'Revoke approved edit'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {notice ? <p className="text-sm text-cyan-200/90">{notice}</p> : null}
    </div>
  );
}
