'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DP_COMMUNITY_AI } from '@/lib/dp-community-ai';

export type HermesTeachMode = 'content' | 'style';

interface HermesTeachModalProps {
  open: boolean;
  busy?: boolean;
  mode?: HermesTeachMode;
  userQuestion?: string;
  wrongReply?: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function HermesTeachModal({
  open,
  busy = false,
  mode = 'content',
  userQuestion,
  wrongReply,
  value,
  onChange,
  onCancel,
  onSave,
}: HermesTeachModalProps) {
  const isStyle = mode === 'style';

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hermes-teach-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="my-auto w-full max-w-lg max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <h2 id="hermes-teach-title" className="text-lg font-semibold text-white">
          {isStyle ? `Save learning for ${DP_COMMUNITY_AI.name}` : `Teach ${DP_COMMUNITY_AI.name}`}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {isStyle ? (
            <>
              Capture style, structure, or process guidance from this reply. We save your edited learning
              note, not the raw thread. A layer admin reviews it first; once approved, {DP_COMMUNITY_AI.name}{' '}
              applies it as tone and reasoning guidance on future turns.
            </>
          ) : (
            <>
              {DP_COMMUNITY_AI.name} missed something here. Write what it should know next time. We save your
              teaching, not the bad reply. A layer admin reviews it first; once approved, {DP_COMMUNITY_AI.name}{' '}
              uses it when answering about the same DPs.
            </>
          )}
        </p>

        {userQuestion ? (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Your question
            </p>
            <p className="mt-1 max-h-40 overflow-y-auto text-sm text-slate-300">{userQuestion}</p>
          </div>
        ) : null}

        {wrongReply ? (
          <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <summary className="cursor-pointer text-xs text-slate-500">
              {isStyle
                ? `Source reply from ${DP_COMMUNITY_AI.name} (reference only, not saved)`
                : `What ${DP_COMMUNITY_AI.name} said (wrong, not saved)`}
            </summary>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-slate-400">
              {wrongReply.slice(0, 4000)}
            </p>
          </details>
        ) : null}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-200">
            {isStyle
              ? 'Learning to keep (edit as needed)'
              : `What ${DP_COMMUNITY_AI.name} should say instead`}
          </span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={isStyle ? 8 : 5}
            autoFocus
            placeholder={
              isStyle
                ? 'e.g. When comparing to ChatGPT: lead with numbered structural lessons, name anti-patterns, keep DP citations in a separate evidence block.'
                : 'e.g. DP22 uses bridges to surface monument knowledge in context. See dp22.md §10 and Metaweb Ch. 11 for the definition.'
            }
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy || !value.trim()}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving…' : isStyle ? 'Save learning' : 'Submit'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
