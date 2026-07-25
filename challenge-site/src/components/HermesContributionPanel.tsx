'use client';

import { useState } from 'react';

export interface ContributionDraft {
  kind: 'comment' | 'patch';
  draftRef: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
}

interface HermesContributionPanelProps {
  draft: ContributionDraft | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function HermesContributionPanel({
  draft,
  busy = false,
  onConfirm,
  onCancel,
}: HermesContributionPanelProps) {
  const [open, setOpen] = useState(false);

  if (!draft) return null;

  const preview =
    draft.kind === 'comment'
      ? String(draft.payload.text || '')
      : `${String(draft.payload.original_text || '')}\n→ ${String(draft.payload.proposed_text || '')}`;

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Gov Hub {draft.kind === 'patch' ? 'patch' : 'comment'} draft
          </p>
          <p className="mt-1 text-sm font-medium text-white">{draft.title}</p>
          <p className="mt-1 text-xs text-slate-300">{draft.summary}</p>
          <p className="mt-1 text-[11px] text-slate-400">Draft: {draft.draftRef}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-cyan-300 hover:text-cyan-200"
        >
          {open ? 'Hide' : 'Preview'}
        </button>
      </div>

      {open ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-slate-950/80 p-3 text-xs text-slate-200 whitespace-pre-wrap">
          {preview}
        </pre>
      ) : null}

      <p className="mt-3 text-xs text-slate-400">
        Hermes will submit this on your behalf after you confirm. Accepted or considered contributions
        may qualify for DP contributor recognition on Gov Hub.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
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
