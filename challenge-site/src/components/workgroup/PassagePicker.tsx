'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { plainBlock } from '@/lib/chapter-sections';

/** Find and pick one chapter block (Gov Hub's Markdown blocks); the block itself is what Gov Hub gets. */
export default function PassagePicker({
  passages,
  picked,
  onPick,
}: {
  passages: string[];
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return passages
      .map((block, index) => ({ block, index, text: plainBlock(block) }))
      .filter((p) => p.text && (!q || p.text.toLowerCase().includes(q)));
  }, [passages, filter]);

  // Bring the picked passage (e.g. a suggested one, picked before the list renders) into view.
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && el) list.scrollTop = el.offsetTop - list.clientHeight / 3;
  }, [picked, shown]);

  return (
    <>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Find a passage"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <ul
        ref={listRef}
        className="relative max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-1"
        role="listbox"
        aria-label="Chapter passages"
      >
        {shown.map((p) => (
          <li key={p.index}>
            <button
              type="button"
              role="option"
              aria-selected={picked === p.index}
              onClick={() => onPick(p.index)}
              className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                picked === p.index ? 'bg-violet-900/50 text-white' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <span className="line-clamp-2">{p.text}</span>
            </button>
          </li>
        ))}
        {!shown.length ? <li className="px-2 py-1.5 text-sm text-slate-500">No passage matches.</li> : null}
      </ul>
    </>
  );
}
