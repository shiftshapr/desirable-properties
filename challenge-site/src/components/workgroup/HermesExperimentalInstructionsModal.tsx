'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import HermesExperimentalBadge from '@/components/workgroup/HermesExperimentalBadge';
import { dismissHermesExperimentalInstructions } from '@/lib/hermes-experimental-instructions';
import { hermesExperimentalFeedbackHref } from '@/lib/support-feedback-link';

type Props = {
  open: boolean;
  workgroupSlug?: string;
  workgroupName?: string;
  onClose: () => void;
};

export default function HermesExperimentalInstructionsModal({
  open,
  workgroupSlug,
  workgroupName,
  onClose,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  const feedbackHref = hermesExperimentalFeedbackHref({ workgroupSlug, workgroupName });

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

  function handleClose() {
    if (doNotShowAgain) dismissHermesExperimentalInstructions();
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483645] flex items-center justify-center bg-slate-950/90 p-5 backdrop-blur-sm"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-violet-800/60 bg-slate-900 p-5 shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={titleId} className="text-base font-semibold text-white">
            Workgroup Hermes
          </h3>
          <HermesExperimentalBadge />
        </div>

        <div id={descId} className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            Hermes in workgroup chat is experimental. Replies stay private until you choose to share
            or adopt them as your own message.
          </p>

          <section>
            <p className="font-medium text-slate-200">Draft my message vs Ask Hermes</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-cyan-500">
              <li>
                <span className="font-medium text-slate-200">Draft my message</span> — AI helps you
                write text you send as yourself. Use Insert or Send when ready.
              </li>
              <li>
                <span className="font-medium text-slate-200">Ask Hermes</span> — Hermes replies in
                your private side panel. Nothing posts to the thread until you share or adopt.
              </li>
            </ul>
          </section>

          <section>
            <p className="font-medium text-slate-200">Side panel, share &amp; adopt</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-violet-500">
              <li>
                Open the <span className="font-medium text-slate-200">Hermes</span> panel for raised
                hands and Ask Hermes replies.
              </li>
              <li>
                <span className="font-medium text-slate-200">Share to thread</span> posts with clear
                Hermes attribution (✋ Hermes).
              </li>
              <li>
                <span className="font-medium text-slate-200">Adopt as my post</span> copies text into
                your composer so you can edit and send as yourself.
              </li>
            </ul>
          </section>

          <section>
            <p className="font-medium text-slate-200">Raised hands / ambient mode</p>
            <p className="mt-2 text-slate-400">
              When ambient mode is on, Hermes may raise a hand (✋) on thread messages with a short
              teaser. Open the hand for a full private reply. Hands never post automatically.
            </p>
          </section>

          <section>
            <p className="font-medium text-slate-200">What posts as you vs as Hermes</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-violet-500">
              <li>
                <span className="font-medium text-slate-200">You</span> — anything you send from the
                composer, including AI-drafted replies you choose to send.
              </li>
              <li>
                <span className="font-medium text-slate-200">Hermes</span> — only when you share a
                Hermes note to the thread (labeled ✋ Hermes).
              </li>
            </ul>
          </section>

          <p className="text-slate-400">
            Hermes may also raise its hand after messages when ambient mode is enabled for this
            workgroup. You always review before anything is shared.
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-400">
          Questions or feedback?{' '}
          <Link
            href={feedbackHref}
            className="font-medium text-cyan-300 hover:text-cyan-200"
            onClick={handleClose}
          >
            Send feedback via Support
          </Link>
        </p>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-400">
          <input
            type="checkbox"
            checked={doNotShowAgain}
            onChange={(e) => setDoNotShowAgain(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-violet-600"
          />
          Do not show again
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <Link
            href={feedbackHref}
            onClick={handleClose}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Send feedback
          </Link>
          <button
            type="button"
            autoFocus
            onClick={handleClose}
            className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
