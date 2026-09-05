'use client';

import { useEffect, useId, useMemo } from 'react';
import type { AstraProposalDisposition } from '@/lib/astra-dispositions';
import {
  dispositionStatusLabel,
  groupDispositionsByChapter,
} from '@/lib/astra-dispositions';

type Props = {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  items: AstraProposalDisposition[];
  filterChapter?: string | null;
  onClose: () => void;
};

export default function AstraExcludedProposalsModal({
  open,
  loading = false,
  error = null,
  items,
  filterChapter = null,
  onClose,
}: Props) {
  const titleId = useId();
  const descId = useId();

  const filteredItems = useMemo(() => {
    if (!filterChapter) return items;
    const chapter = filterChapter.trim().toUpperCase();
    return items.filter(
      (entry) => String(entry.original_chapter || '').trim().toUpperCase() === chapter,
    );
  }, [filterChapter, items]);

  const grouped = useMemo(() => groupDispositionsByChapter(filteredItems), [filteredItems]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const title = filterChapter
    ? `${filterChapter} · proposals not included`
    : 'Proposals not included in this synthesis';

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-950/80 p-5"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              {title}
            </h2>
            <p id={descId} className="mt-1 text-sm text-slate-400">
              {filterChapter
                ? 'These source proposals were reviewed but not woven into the Astra chapter text.'
                : 'Source proposals reviewed but not integrated into the Astra synthesis, with editorial rationale.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? <p className="text-slate-400">Loading…</p> : null}
          {error ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-rose-200">
              {error}
            </p>
          ) : null}
          {!loading && !error && filteredItems.length === 0 ? (
            <p className="text-slate-400">No excluded proposals for this filter.</p>
          ) : null}
          {!loading && !error && grouped.length > 0 ? (
            <div className="space-y-6">
              {grouped.map(({ chapter, items: chapterItems }) => (
                <section key={chapter}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-300">
                    {chapter}
                  </h3>
                  <ul className="mt-3 space-y-4">
                    {chapterItems.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-200">
                            {dispositionStatusLabel(String(entry.status))}
                          </span>
                          {entry.kind ? (
                            <span className="text-xs uppercase tracking-wide text-slate-500">
                              {entry.kind}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 font-mono text-xs text-slate-500 break-all">{entry.id}</p>
                        {entry.rationale ? (
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{entry.rationale}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
