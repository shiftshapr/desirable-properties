'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { padHref } from '@/lib/hermes-onboard/tabs';
import type { RosterPadEntry } from '@/lib/hermes-onboard/types';

type Props = {
  entries: Pick<RosterPadEntry, 'slug' | 'name' | 'domain'>[];
  pageSize?: number;
};

export default function CohortRosterList({ entries, pageSize = 24 }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.slug.includes(q) ||
        entry.domain.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const sliceStart = safePage * pageSize;
  const pageEntries = filtered.slice(sliceStart, sliceStart + pageSize);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(0);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300" htmlFor="cohort-roster-filter">
        Filter roster ({entries.length} members)
      </label>
      <input
        id="cohort-roster-filter"
        type="search"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        placeholder="Name, domain, or slug (e.g. consumerreports)"
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none"
      />
      <p className="mt-2 text-xs text-slate-500">
        {filtered.length === entries.length
          ? `Showing all ${entries.length} roster pads.`
          : `${filtered.length} match${filtered.length === 1 ? '' : 'es'} for "${query.trim()}".`}
      </p>

      <ul className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/30">
        {pageEntries.map((entry) => (
          <li key={entry.slug} className="px-4 py-3">
            <Link
              href={padHref(entry.slug)}
              className="font-medium text-cyan-300 hover:text-cyan-200"
            >
              {entry.name}
            </Link>
            <p className="mt-0.5 font-mono text-xs text-slate-500">
              {entry.domain} · /pad/{entry.slug}
            </p>
          </li>
        ))}
        {pageEntries.length === 0 ? (
          <li className="px-4 py-6 text-sm text-slate-500">No roster members match this filter.</li>
        ) : null}
      </ul>

      {totalPages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 enabled:hover:border-slate-500 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 enabled:hover:border-slate-500 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
