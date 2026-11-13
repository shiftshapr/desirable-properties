'use client';

import { useEffect, useRef, useState } from 'react';
import ProposalRow from '@/components/improve/ProposalRow';
import type { IndexedProposal } from '@/components/improve/improve-shared';

type Props = {
  items: IndexedProposal[];
  /** Changes whenever the filters change, so the list starts again from the top. */
  resetKey: string;
  step?: number;
  showDoc?: boolean;
  /** Scroll container for the auto-load sentinel (defaults to the viewport). */
  rootRef?: React.RefObject<HTMLElement | null>;
};

/** Renders proposals a page at a time: more load as the end scrolls into view, or with the button. */
export default function LazyProposalList({ items, resetKey, step = 40, showDoc = true, rootRef }: Props) {
  const [limit, setLimit] = useState(step);
  const [prevKey, setPrevKey] = useState(resetKey);
  const sentinel = useRef<HTMLDivElement>(null);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setLimit(step);
  }
  const hasMore = items.length > limit;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((n) => n + step);
      },
      { root: rootRef?.current ?? null, rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, step, rootRef, limit]);

  return (
    <>
      <ul className="space-y-2">
        {items.slice(0, limit).map((p) => (
          <ProposalRow key={p.id} p={p} showDoc={showDoc} />
        ))}
      </ul>
      {hasMore ? (
        <div ref={sentinel} className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + step)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Show more ({items.length - limit} left)
          </button>
        </div>
      ) : null}
    </>
  );
}
