'use client';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  warning?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function BroadcastConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  warning = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-5"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className={`w-full max-w-md rounded-xl border bg-slate-900 p-5 shadow-2xl ${
          warning ? 'border-amber-500/60' : 'border-slate-700'
        }`}
        role="alertdialog"
        aria-labelledby="broadcast-confirm-title"
        aria-describedby="broadcast-confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="broadcast-confirm-title" className="text-base font-semibold text-white">
          {title}
        </h3>
        <p id="broadcast-confirm-message" className="mt-2 text-sm leading-relaxed text-slate-300">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              warning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-cyan-700 hover:bg-cyan-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
