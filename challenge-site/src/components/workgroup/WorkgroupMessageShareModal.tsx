'use client';

import { useEffect, useState } from 'react';

type WorkgroupMessageShareModalProps = {
  open: boolean;
  workgroupName: string;
  messagePreview: string;
  onClose: () => void;
};

/**
 * MVP workgroup message share UI.
 * TODO(workgroup-share): Restrict recipients to workgroup members only; wire delivery API
 * (distinct from Hermes agent thread shares). Discuss whether guests / invitees get read-only links.
 */
export default function WorkgroupMessageShareModal({
  open,
  workgroupName,
  messagePreview,
  onClose,
}: WorkgroupMessageShareModalProps) {
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setRecipient('');
    setNote('');
  }, [open]);

  if (!open) return null;

  const preview = messagePreview.split('\n')[0].trim();
  const anchorLabel = preview.length > 80 ? `${preview.slice(0, 77)}…` : preview || 'This message';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-xl"
        role="dialog"
        aria-labelledby="wg-share-title"
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 id="wg-share-title" className="text-lg font-semibold text-white">
            Share message
          </h2>
          <p className="mt-1 text-sm text-slate-400">{workgroupName}</p>
          <p className="mt-2 rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-xs text-violet-100">
            From: {anchorLabel}
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-xs text-slate-500">
            Workgroup share MVP: intended for members of this workgroup. Delivery and permission rules are lighter than Hermes agent thread shares until the workgroup share API ships.
          </p>

          <label className="block text-sm text-slate-300">
            Share with
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Member email or username"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              autoComplete="off"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Optional note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              placeholder="Why you are sharing this point in the thread"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!recipient.trim()}
            onClick={onClose}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            title="TODO: POST workgroup message share when API is available"
          >
            Share (coming soon)
          </button>
        </div>
      </div>
    </div>
  );
}
