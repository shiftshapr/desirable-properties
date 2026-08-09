'use client';

import { useMemo, useState } from 'react';
import SiteAuthNav from '@/components/SiteAuthNav';

export interface HermesThreadSummary {
  id: string;
  title: string;
  surface?: string;
  updatedAt?: string | null;
}

interface HermesThreadSidebarProps {
  threads: HermesThreadSummary[];
  activeThreadId: string | null;
  loading?: boolean;
  signedIn: boolean;
  onSelect: (threadId: string) => void;
  onCreate: () => void;
  onSignIn?: () => void;
  onClose?: () => void;
}

function formatThreadDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HermesThreadSidebar({
  threads,
  activeThreadId,
  loading = false,
  signedIn,
  onSelect,
  onCreate,
  onSignIn,
  onClose,
}: HermesThreadSidebarProps) {
  const [query, setQuery] = useState('');

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) =>
      (thread.title || 'Conversation').toLowerCase().includes(q),
    );
  }, [query, threads]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-800 bg-slate-900/95">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Hermes</p>
          <p className="text-[11px] text-slate-500">DP Community AI</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SiteAuthNav />
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 border-b border-slate-800 p-3">
        <button
          type="button"
          onClick={signedIn ? onCreate : onSignIn}
          disabled={!signedIn && !onSignIn}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-base leading-none" aria-hidden>
            +
          </span>
          New chat
        </button>

        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={signedIn ? 'Search conversations…' : 'Sign in to search…'}
            disabled={!signedIn}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!signedIn ? (
          <div className="px-2 py-4">
            <p className="text-sm text-slate-400">
              {onSignIn ? (
                <>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="text-cyan-300 hover:text-cyan-200"
                  >
                    Sign in
                  </button>
                  {' to save and search conversations.'}
                </>
              ) : (
                'Sign in to save and search conversations.'
              )}
            </p>
          </div>
        ) : loading ? (
          <p className="px-2 py-3 text-xs text-slate-500">Loading conversations…</p>
        ) : filteredThreads.length === 0 ? (
          <p className="px-2 py-3 text-xs text-slate-500">
            {query.trim() ? 'No conversations match your search.' : 'No conversations yet.'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filteredThreads.map((thread) => {
              const active = thread.id === activeThreadId;
              const dateLabel = formatThreadDate(thread.updatedAt);
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(thread.id);
                      onClose?.();
                    }}
                    className={`group w-full rounded-lg px-3 py-2.5 text-left transition ${
                      active
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="line-clamp-2 text-sm leading-snug">
                      {thread.title || 'New conversation'}
                    </span>
                    {dateLabel ? (
                      <span className="mt-1 block text-[11px] text-slate-500 group-hover:text-slate-400">
                        {dateLabel}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
