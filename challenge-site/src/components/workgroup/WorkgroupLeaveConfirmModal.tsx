'use client';

import { useEffect, useId } from 'react';

type Props = {
  open: boolean;
  workgroupName?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function WorkgroupLeaveConfirmModal({
  open,
  workgroupName,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const title = workgroupName ? `Leave "${workgroupName}"?` : 'Leave this workgroup?';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-5"
      onClick={busy ? undefined : onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-base font-semibold text-white">
          {title}
        </h3>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-300">
          You can join again later.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onConfirm}
            className="rounded-md border border-rose-800/80 bg-rose-950/60 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-900/50 disabled:opacity-50"
          >
            {busy ? 'Leaving…' : 'Leave workgroup'}
          </button>
        </div>
      </div>
    </div>
  );
}
