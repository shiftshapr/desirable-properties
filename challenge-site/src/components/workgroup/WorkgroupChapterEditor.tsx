'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AstraMarkdown from '@/components/astra/AstraMarkdown';
import {
  summarizeMarkdownEdit,
  type WorkgroupChapterEdit,
  type WorkgroupChapterEditList,
} from '@/lib/workgroup-chapter-edit-types';
import {
  setWorkgroupChapterEditStatusClient,
  submitWorkgroupChapterEditClient,
} from '@/lib/workgroup-chapter-edit-api';
import { sanitizeAstraMarkdown } from '@/lib/astra-display';

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
  const [draftMarkdown, setDraftMarkdown] = useState(editState.effectiveMarkdown);
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setDraftMarkdown(editState.effectiveMarkdown);
  }, [editState.effectiveMarkdown]);

  const dirty = draftMarkdown !== editState.effectiveMarkdown;
  const editSummary = useMemo(
    () => summarizeMarkdownEdit(editState.effectiveMarkdown, draftMarkdown),
    [editState.effectiveMarkdown, draftMarkdown],
  );

  async function handleSubmit() {
    if (!signedIn || !isMember || busy || !dirty) return;
    setBusy(true);
    setNotice(null);
    try {
      const next = await submitWorkgroupChapterEditClient(workgroupId, {
        dpKey,
        astraReleaseId,
        markdown: draftMarkdown,
        rationale: rationale.trim() || undefined,
      });
      onUpdate(next);
      setDraftMarkdown(next.effectiveMarkdown);
      setRationale('');
      setNotice('Chapter edit saved. Scroll up to see track-changes view.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save edit');
    } finally {
      setBusy(false);
    }
  }

  async function toggleEditStatus(edit: WorkgroupChapterEdit, restore: boolean) {
    if (!canEdit || statusBusy) return;
    setStatusBusy(edit.id);
    setNotice(null);
    try {
      const next = await setWorkgroupChapterEditStatusClient(
        workgroupId,
        edit.id,
        restore ? 'restore' : 'revoke',
        dpKey,
      );
      onUpdate(next);
      setDraftMarkdown(next.effectiveMarkdown);
      setNotice(restore ? 'Member edit restored.' : 'Member edit revoked.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update edit');
    } finally {
      setStatusBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-white">Propose a chapter edit</h3>
        <p className="mt-2 text-sm text-slate-400">
          Members can edit the effective chapter markdown below. Sign in and join this workgroup to
          submit. Coordinators can revoke member edits or Astra patches separately.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Starts from the current effective chapter (Astra minus revoked patches, plus prior member
          edits). Saves apply immediately for the workgroup view.
        </p>

        {!signedIn ? (
          <p className="mt-3 text-sm text-slate-400">
            <Link href="/login" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
              Sign in
            </Link>
            {' '}to propose edits.
          </p>
        ) : !isMember ? (
          <p className="mt-3 text-sm text-slate-400">Join this workgroup to propose edits.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
              >
                {showPreview ? 'Hide preview' : 'Preview markdown'}
              </button>
              {dirty ? (
                <button
                  type="button"
                  onClick={() => setDraftMarkdown(editState.effectiveMarkdown)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
                >
                  Reset draft
                </button>
              ) : null}
            </div>

            {dirty ? (
              <p className="mt-2 text-xs text-cyan-300/90">Pending change: {editSummary}</p>
            ) : null}

            <textarea
              value={draftMarkdown}
              onChange={(event) => setDraftMarkdown(event.target.value)}
              rows={16}
              spellCheck
              className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100"
            />

            {showPreview ? (
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                <AstraMarkdown markdown={sanitizeAstraMarkdown(draftMarkdown)} />
              </div>
            ) : null}

            <label className="mt-3 block text-sm text-slate-300">
              Rationale (optional)
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
              disabled={busy || !dirty}
              onClick={() => void handleSubmit()}
              className="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save chapter edit'}
            </button>
          </>
        )}
      </section>

      {editState.edits.length > 0 ? (
        <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Member edit history</h3>
          <ul className="mt-3 space-y-2">
            {[...editState.edits].reverse().map((edit) => (
              <li
                key={edit.id}
                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-200">{edit.authorName}</p>
                    <p className="text-xs text-slate-500">{formatWhen(edit.createdAt)}</p>
                    {edit.rationale ? (
                      <p className="mt-1 text-xs text-slate-400">{edit.rationale}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {edit.status === 'active' ? 'Active' : 'Revoked'}
                      {edit.status === 'revoked' && edit.revokedAt
                        ? ` · ${formatWhen(edit.revokedAt)}`
                        : ''}
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      disabled={statusBusy === edit.id}
                      onClick={() =>
                        void toggleEditStatus(edit, edit.status === 'revoked')
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
                          ? 'Restore edit'
                          : 'Revoke edit'}
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
