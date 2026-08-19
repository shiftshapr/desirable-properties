'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SiteAuthNav from '@/components/SiteAuthNav';

export interface HermesThreadSummary {
  id: string;
  title: string;
  surface?: string;
  pinned?: boolean;
  updatedAt?: string | null;
  shared?: boolean;
  shareRole?: string | null;
  ownerName?: string | null;
  controllerName?: string | null;
  activeShareCount?: number;
}

interface HermesThreadSidebarProps {
  threads: HermesThreadSummary[];
  sharedThreads?: HermesThreadSummary[];
  activeThreadId: string | null;
  loading?: boolean;
  signedIn: boolean;
  onSelect: (threadId: string) => void;
  onCreate: () => void;
  onRename?: (threadId: string, title: string) => Promise<void> | void;
  onPin?: (threadId: string, pinned: boolean) => Promise<void> | void;
  onDelete?: (threadId: string) => Promise<void> | void;
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

function sortThreads(threads: HermesThreadSummary[]): HermesThreadSummary[] {
  return [...threads].sort((a, b) => {
    const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDiff !== 0) return pinDiff;
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export default function HermesThreadSidebar({
  threads,
  sharedThreads = [],
  activeThreadId,
  loading = false,
  signedIn,
  onSelect,
  onCreate,
  onRename,
  onPin,
  onDelete,
  onSignIn,
  onClose,
}: HermesThreadSidebarProps) {
  const [query, setQuery] = useState('');
  const [menuThreadId, setMenuThreadId] = useState<string | null>(null);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? threads.filter((thread) =>
        (thread.title || 'Conversation').toLowerCase().includes(q),
      )
      : threads;
    return sortThreads(base);
  }, [query, threads]);

  useEffect(() => {
    if (renamingThreadId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingThreadId]);

  useEffect(() => {
    if (!menuThreadId) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuThreadId(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuThreadId]);

  const startRename = (thread: HermesThreadSummary) => {
    setMenuThreadId(null);
    setRenamingThreadId(thread.id);
    setRenameValue(thread.title || 'New conversation');
  };

  const commitRename = async () => {
    if (!renamingThreadId || !onRename) {
      setRenamingThreadId(null);
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingThreadId(null);
      return;
    }
    setActionBusy(true);
    try {
      await onRename(renamingThreadId, trimmed);
    } finally {
      setActionBusy(false);
      setRenamingThreadId(null);
    }
  };

  const togglePin = async (thread: HermesThreadSummary) => {
    if (!onPin) return;
    setMenuThreadId(null);
    setActionBusy(true);
    try {
      await onPin(thread.id, !thread.pinned);
    } finally {
      setActionBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId || !onDelete) return;
    setActionBusy(true);
    try {
      await onDelete(deleteConfirmId);
    } finally {
      setActionBusy(false);
      setDeleteConfirmId(null);
      setMenuThreadId(null);
    }
  };

  const threadActionsEnabled = signedIn && (onRename || onPin || onDelete);

  const filteredShared = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? sharedThreads.filter((thread) =>
        (thread.title || 'Conversation').toLowerCase().includes(q)
        || (thread.ownerName || '').toLowerCase().includes(q),
      )
      : sharedThreads;
    return sortThreads(base);
  }, [query, sharedThreads]);

  const renderThreadRow = (thread: HermesThreadSummary, opts?: { shared?: boolean }) => {
    const active = thread.id === activeThreadId;
    const dateLabel = formatThreadDate(thread.updatedAt);
    const menuOpen = menuThreadId === thread.id;
    const shared = opts?.shared;

    if (renamingThreadId === thread.id) {
      return (
        <li key={thread.id} className="px-1 py-0.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void commitRename();
            }}
          >
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setRenamingThreadId(null);
                }
              }}
              onBlur={() => {
                void commitRename();
              }}
              disabled={actionBusy}
              maxLength={120}
              className="w-full rounded-lg border border-cyan-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-600"
              aria-label="Conversation title"
            />
          </form>
        </li>
      );
    }

    return (
      <li
        key={thread.id}
        className={`group relative ${menuOpen ? 'z-[100]' : 'z-0'}`}
      >
        <button
          type="button"
          onClick={() => {
            onSelect(thread.id);
            onClose?.();
          }}
          className={`w-full rounded-lg py-2.5 pl-3 pr-9 text-left transition ${
            active
              ? 'bg-slate-800 text-white'
              : thread.pinned
                ? 'bg-slate-800/40 text-slate-200 hover:bg-slate-800/70'
                : 'text-slate-300 hover:bg-slate-800/70'
          }`}
        >
          <span className="flex items-start gap-1.5">
            {thread.pinned ? (
              <span className="mt-0.5 shrink-0 text-[10px] text-cyan-400" aria-hidden title="Pinned">
                📌
              </span>
            ) : null}
            {shared ? (
              <span className="mt-0.5 shrink-0 text-[10px]" aria-hidden title={thread.shareRole || 'shared'}>
                {thread.shareRole === 'controller' ? '✎' : thread.shareRole === 'control_invited' ? '⏳' : '👁'}
              </span>
            ) : thread.activeShareCount && thread.activeShareCount > 0 ? (
              <span className="mt-0.5 shrink-0 text-[10px] text-cyan-400/80" aria-hidden title="Shared with others">
                ↗
              </span>
            ) : null}
            <span className="line-clamp-2 text-sm leading-snug">
              {thread.title || 'New conversation'}
            </span>
          </span>
          {shared && thread.ownerName ? (
            <span className="mt-0.5 block text-[10px] text-slate-500">from {thread.ownerName}</span>
          ) : null}
          {shared && thread.controllerName && thread.shareRole !== 'controller' ? (
            <span className="mt-0.5 block text-[10px] text-amber-400/80">
              {thread.controllerName} has control
            </span>
          ) : null}
          {dateLabel ? (
            <span className="mt-1 block text-[11px] text-slate-500 group-hover:text-slate-400">
              {dateLabel}
            </span>
          ) : null}
        </button>

        {!shared && threadActionsEnabled ? (
          <div className="absolute right-1 top-1/2 z-[110] -translate-y-1/2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuThreadId(menuOpen ? null : thread.id);
              }}
              className={`rounded-md p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-200 ${
                menuOpen ? 'bg-slate-700 text-slate-200' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
              }`}
              aria-label="Conversation actions"
              aria-expanded={menuOpen}
            >
              ⋯
            </button>

            {menuOpen ? (
              <div
                ref={menuRef}
                className="absolute right-0 z-[120] mt-1 w-36 overflow-hidden rounded-lg border border-slate-600 bg-slate-950 py-1 shadow-2xl ring-1 ring-black/40"
                role="menu"
              >
                {onPin ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full bg-slate-950 px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => void togglePin(thread)}
                  >
                    {thread.pinned ? 'Unpin' : 'Pin'}
                  </button>
                ) : null}
                {onRename ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full bg-slate-950 px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => startRename(thread)}
                  >
                    Rename
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full bg-slate-950 px-3 py-1.5 text-left text-xs text-rose-300 hover:bg-rose-950/50"
                    onClick={() => {
                      setMenuThreadId(null);
                      setDeleteConfirmId(thread.id);
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <aside className="relative z-40 flex h-full min-h-0 w-full flex-col border-r border-slate-800 bg-slate-900">
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
        ) : (
          <div className="space-y-4">
            {filteredShared.length > 0 ? (
              <div>
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Shared with me
                </p>
                <ul className="space-y-0.5">
                  {filteredShared.map((thread) => renderThreadRow(thread, { shared: true }))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                My conversations
              </p>
              {filteredThreads.length === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-500">
                  {query.trim() ? 'No conversations match your search.' : 'No conversations yet.'}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {filteredThreads.map((thread) => renderThreadRow(thread))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {deleteConfirmId ? (
        <div className="relative z-[130] border-t border-slate-800 bg-slate-900 p-3">
          <p className="text-xs text-slate-300">Delete this conversation? This cannot be undone.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void confirmDelete()}
              className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {actionBusy ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
