'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { dismissDiscussPatchHelp } from '@/lib/discuss-patch-help';

type Props = {
  open: boolean;
  discussHref: string;
  onClose: () => void;
};

export default function DiscussPatchHelpModal({ open, discussHref, onClose }: Props) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setDoNotShowAgain(false);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  function openDiscuss() {
    if (doNotShowAgain) dismissDiscussPatchHelp();
    window.open(discussHref, '_blank', 'noopener,noreferrer');
    onClose();
  }

  return createPortal(
    <div
      className="dp-discuss-patch-modal-overlay fixed inset-0 z-[2147483646] flex items-center justify-center bg-slate-950/95 p-5 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-base font-semibold text-white">
          Discuss &amp; patch on the book
        </h3>
        <div id={descId} className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            To discuss or patch, open Canopi by clicking the{' '}
            <span className="font-medium text-slate-200">Go Meta…</span> button on the book viewer
            (corner tab, bottom-right).
          </p>
          <p>
            A patch is an append-only revision with provenance associated with a passage (one or
            more sentences). In addition to the standard patch which replaces the selected passage
            with the patch text, &quot;insert patches&quot; insert the patch text above the selected
            passage.
          </p>
          <p>
            Open a chapter. To patch, select text or an existing anchor, and click{' '}
            <span className="font-medium text-slate-200">Discuss</span> on the modal. How you write
            your reply determines what happens:
          </p>
          <ul className="list-disc space-y-2 pl-5 marker:text-cyan-500">
            <li>
              <span className="font-medium text-slate-200">Comment</span> – a normal anchored reply
              adds discussion without changing the text.
            </li>
            <li>
              <span className="font-medium text-slate-200">Patch</span> – start with{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-cyan-300">PATCH:</code>{' '}
              (case-insensitive) to propose replacing the selection.
            </li>
            <li>
              <span className="font-medium text-slate-200">Insert</span> – start with{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-cyan-300">INSERT:</code> to
              propose new text above the selection.
            </li>
          </ul>
          <p className="text-slate-400">
            The command must be on the first line of your reply. Everything after it is your
            proposed text.
          </p>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={doNotShowAgain}
            onChange={(e) => setDoNotShowAgain(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-600"
          />
          Do not show again
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={openDiscuss}
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
          >
            Open the book
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
