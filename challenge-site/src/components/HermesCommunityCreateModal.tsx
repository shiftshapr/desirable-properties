'use client';

import { useEffect, useRef, useState } from 'react';

type HermesCommunityCreateModalProps = {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (groupTitle: string) => void;
};

export default function HermesCommunityCreateModal({
  open,
  busy = false,
  error = null,
  onClose,
  onSubmit,
}: HermesCommunityCreateModalProps) {
  const [groupTitle, setGroupTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setGroupTitle('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const trimmed = groupTitle.trim();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-xl"
        role="dialog"
        aria-labelledby="community-create-title"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="community-create-title" className="text-lg font-semibold text-white">
            New Community Chat
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Invite people by email or link. Everyone you invite can prompt Deepi.
          </p>
        </div>

        <form
          className="space-y-4 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!trimmed || busy) return;
            onSubmit(trimmed);
          }}
        >
          {error ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <label className="block text-sm text-slate-300">
            Group name
            <input
              ref={inputRef}
              type="text"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="e.g. DP discovery brainstorm"
              maxLength={120}
              disabled={busy}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !trimmed}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create and invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
