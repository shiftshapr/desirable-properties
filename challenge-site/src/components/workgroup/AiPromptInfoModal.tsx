'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AiPromptInfo } from '@/lib/ai-prompt-info';

type Props = {
  open: boolean;
  info: AiPromptInfo | null;
  onContinue: () => void;
  onCancel: () => void;
};

export default function AiPromptInfoModal({ open, info, onContinue, onCancel }: Props) {
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted || !info) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/90 p-5 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="max-h-[min(85vh,520px)] w-full max-w-md overflow-auto rounded-xl border border-cyan-700/50 bg-slate-900 p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-base font-semibold text-white">
          {info.title}
        </h3>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-300">
          {info.summary}
        </p>

        {info.details && info.details.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-400 marker:text-cyan-600">
            {info.details.map((line) => (
              <li key={line.slice(0, 48)}>{line}</li>
            ))}
          </ul>
        ) : null}

        {info.links && info.links.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {info.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="rounded-full border border-slate-600 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:border-cyan-600 hover:bg-cyan-950/40"
              >
                {link.label} →
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onContinue}
            className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
