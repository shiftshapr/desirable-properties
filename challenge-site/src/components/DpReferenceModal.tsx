'use client';

import { useEffect, useId, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { DpReferenceInfo } from '@/lib/dp-reference-info';
import { getDpReferenceInfo } from '@/lib/dp-reference-info';

type Props = {
  open: boolean;
  label: string | null;
  onClose: () => void;
};

function ReferenceBody({ info }: { info: DpReferenceInfo }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-300">{info.summary}</p>

      {info.details.length > 0 ? (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-400 marker:text-cyan-600">
          {info.details.map((line) => (
            <li key={line.slice(0, 64)}>{line}</li>
          ))}
        </ul>
      ) : null}

      {info.sections && info.sections.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">
            Referenced sections
          </p>
          {info.sections.map((section) => (
            <div
              key={section.number}
              className="rounded-lg border border-slate-700/80 bg-slate-950/50 p-3"
            >
              <p className="text-sm font-medium text-white">
                §{section.number}
                {section.title ? ` — ${section.title}` : ''}
              </p>
              {section.excerpt ? (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{section.excerpt}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {info.links && info.links.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
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
    </>
  );
}

export default function DpReferenceModal({ open, label, onClose }: Props) {
  const titleId = useId();
  const descId = useId();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const info = label ? getDpReferenceInfo(label) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
      className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-slate-950/90 p-5 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(85vh,560px)] w-full max-w-lg flex-col rounded-xl border border-cyan-700/50 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold text-white">
              {info.title}
            </h3>
            <p className="mt-1 truncate text-xs text-cyan-300/80" title={info.sourceLabel}>
              {info.sourceLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div
          id={descId}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4"
        >
          <ReferenceBody info={info} />
        </div>

        <div className="flex justify-end border-t border-slate-800 px-5 py-3">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
