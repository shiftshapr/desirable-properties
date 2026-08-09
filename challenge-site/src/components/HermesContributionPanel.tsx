'use client';

import type { ContributionDraft } from '@/lib/hermesContribution';

interface HermesContributionPanelProps {
  draft: ContributionDraft | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDraftChange?: (draft: ContributionDraft) => void;
}

export default function HermesContributionPanel({
  draft,
  busy = false,
  onConfirm,
  onCancel,
  onDraftChange,
}: HermesContributionPanelProps) {
  if (!draft) return null;

  const scopeLabel =
    draft.scope === 'thread' ? 'from full thread' : 'from latest message';

  const previewText =
    draft.kind === 'comment'
      ? String(draft.payload.text || '')
      : `${String(draft.payload.original_text || '')}\n→ ${String(draft.payload.proposed_text || '')}`;

  const updatePreview = (value: string) => {
    if (!onDraftChange) return;
    if (draft.kind === 'comment') {
      onDraftChange({ ...draft, payload: { ...draft.payload, text: value } });
      return;
    }
    const arrowIdx = value.indexOf('\n→ ');
    if (arrowIdx >= 0) {
      onDraftChange({
        ...draft,
        payload: {
          ...draft.payload,
          original_text: value.slice(0, arrowIdx),
          proposed_text: value.slice(arrowIdx + 3),
        },
      });
    } else {
      onDraftChange({
        ...draft,
        payload: { ...draft.payload, proposed_text: value },
      });
    }
  };

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Gov Hub {draft.kind === 'patch' ? 'patch' : 'comment'} draft ({scopeLabel})
        </p>
        <p className="mt-1 text-sm font-medium text-white">{draft.title}</p>
        <p className="mt-1 text-xs text-slate-300">{draft.summary}</p>
        <p className="mt-1 text-[11px] text-slate-400">Target: {draft.draftRef}</p>
      </div>

      <p className="mt-3 text-xs text-amber-100/90">
        This will be posted publicly on Gov Hub ({draft.draftRef}) under your account.
        Review the text below before submitting.
      </p>

      <label className="mt-3 block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Preview – edit before submit
        </span>
        <textarea
          value={previewText}
          onChange={(e) => updatePreview(e.target.value)}
          rows={8}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !previewText.trim()}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Confirm & submit to Gov Hub'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
