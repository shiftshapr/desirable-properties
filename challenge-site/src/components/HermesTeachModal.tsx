'use client';

interface HermesTeachModalProps {
  open: boolean;
  busy?: boolean;
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
  userQuestion,
  wrongReply,
  value,
  onChange,
  onCancel,
  onSave,
}: HermesTeachModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hermes-teach-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <h2 id="hermes-teach-title" className="text-lg font-semibold text-white">
          Teach Hermes
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Hermes missed something here. Write what it should know next time – we save your
          teaching, not the bad reply. A layer admin reviews it first; once approved, Hermes
          uses it when answering about the same DPs.
        </p>

        {userQuestion ? (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Your question
            </p>
            <p className="mt-1 text-sm text-slate-300">{userQuestion}</p>
          </div>
        ) : null}

        {wrongReply ? (
          <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <summary className="cursor-pointer text-xs text-slate-500">
              What Hermes said (wrong – not saved)
            </summary>
            <p className="mt-2 max-h-32 overflow-y-auto text-sm text-slate-400">
              {wrongReply.slice(0, 1200)}
            </p>
          </details>
        ) : null}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-200">
            What Hermes should say instead
          </span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            autoFocus
            placeholder="e.g. DP22 uses bridges to surface monument knowledge in context. See dp22.md §10 and Metaweb Ch. 11 for the definition."
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
            {busy ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
