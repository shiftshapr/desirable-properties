'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import SiteAuthNav from '@/components/SiteAuthNav';

export interface HermesThreadSummary {
  id: string;
  title: string;
  surface?: string;
  threadKind?: 'private' | 'group' | string;
  groupTitle?: string | null;
  pinned?: boolean;
  archived?: boolean;
  updatedAt?: string | null;
  shared?: boolean;
  shareRole?: string | null;
  ownerName?: string | null;
  controllerName?: string | null;
  activeShareCount?: number;
}

interface HermesThreadSidebarProps {
  threads: HermesThreadSummary[];
  sharedWithMeThreads?: HermesThreadSummary[];
  sharedByMeThreads?: HermesThreadSummary[];
  activeThreadId: string | null;
  loading?: boolean;
  signedIn: boolean;
  archiveView?: boolean;
  onSelect: (threadId: string) => void;
  onCreatePersonal: () => void;
  onCreateCommunity: () => void;
  onRename?: (threadId: string, title: string) => Promise<void> | void;
  onPin?: (threadId: string, pinned: boolean) => Promise<void> | void;
  onArchive?: (threadId: string, archived: boolean) => Promise<void> | void;
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

function filterByQuery(
  threads: HermesThreadSummary[],
  query: string,
  extraFields: Array<(thread: HermesThreadSummary) => string> = [],
): HermesThreadSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return threads;
  return threads.filter((thread) => {
    const haystack = [
      thread.title || 'Conversation',
      thread.groupTitle || '',
      ...extraFields.map((field) => field(thread)),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

/** Parse workgroup collab origin from HermesThread.surface (handles /agent/agent legacy suffix). */
function parseWorkgroupOrigin(surface?: string | null): { slug: string; href: string } | null {
  const normalized = String(surface || '')
    .replace(/\/agent\/agent$/i, '/agent')
    .trim();
  const match = normalized.match(/\/workgroups\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  const slug = decodeURIComponent(match[1]);
  if (!slug) return null;
  return {
    slug,
    href: `/workgroups/${encodeURIComponent(slug)}?tab=chat`,
  };
}

function parseAllianceOrigin(surface?: string | null): { slug: string; href: string } | null {
  const match = String(surface || '').match(/\/onboard\/alliance\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  const slug = decodeURIComponent(match[1]);
  if (!slug) return null;
  return {
    slug,
    href: `/onboard/alliance/${encodeURIComponent(slug)}`,
  };
}

export default function HermesThreadSidebar({
  threads,
  sharedWithMeThreads = [],
  sharedByMeThreads = [],
  activeThreadId,
  loading = false,
  signedIn,
  archiveView = false,
  onSelect,
  onCreatePersonal,
  onCreateCommunity,
  onRename,
  onPin,
  onArchive,
  onDelete,
  onSignIn,
  onClose,
}: HermesThreadSidebarProps) {
  const [query, setQuery] = useState('');
  const [menuThreadId, setMenuThreadId] = useState<string | null>(null);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedThreadId, setCopiedThreadId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [headerInfoOpen, setHeaderInfoOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerInfoRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const filteredThreads = useMemo(() => {
    return sortThreads(filterByQuery(threads, query));
  }, [query, threads]);

  const filteredSharedWithMe = useMemo(() => {
    return sortThreads(filterByQuery(sharedWithMeThreads, query, [
      (thread) => thread.ownerName || '',
    ]));
  }, [query, sharedWithMeThreads]);

  const filteredSharedByMe = useMemo(() => {
    return sortThreads(filterByQuery(sharedByMeThreads, query));
  }, [query, sharedByMeThreads]);

  const showSharedSection = !archiveView
    && (filteredSharedWithMe.length > 0 || filteredSharedByMe.length > 0);

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

  useEffect(() => {
    if (!headerInfoOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (headerInfoRef.current && !headerInfoRef.current.contains(e.target as Node)) {
        setHeaderInfoOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [headerInfoOpen]);

  useEffect(() => {
    if (!newMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [newMenuOpen]);

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

  const archiveThread = async (thread: HermesThreadSummary) => {
    if (!onArchive) return;
    setMenuThreadId(null);
    setActionBusy(true);
    try {
      await onArchive(thread.id, !archiveView);
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

  const copyChatId = async (thread: HermesThreadSummary) => {
    const writeClipboard = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(thread.id);
        return;
      }
      const textarea = document.createElement('textarea');
      textarea.value = thread.id;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!ok) throw new Error('copy failed');
    };

    try {
      await writeClipboard();
      setCopiedThreadId(thread.id);
      window.setTimeout(() => {
        setCopiedThreadId((current) => (current === thread.id ? null : current));
        setMenuThreadId((current) => (current === thread.id ? null : current));
      }, 1500);
    } catch {
      setMenuThreadId(null);
    }
  };

  const threadActionsEnabled = signedIn && (onRename || onPin || onArchive || onDelete);

  const renderThreadRow = (
    thread: HermesThreadSummary,
    opts?: { shared?: boolean; sharedByMe?: boolean },
  ) => {
    const active = thread.id === activeThreadId;
    const dateLabel = formatThreadDate(thread.updatedAt);
    const menuOpen = menuThreadId === thread.id;
    const shared = opts?.shared;
    const sharedByMe = opts?.sharedByMe;
    const workgroupOrigin = parseWorkgroupOrigin(thread.surface);
    const allianceOrigin = parseAllianceOrigin(thread.surface);
    const isCommunity = thread.threadKind === 'group';
    const displayTitle = isCommunity
      ? (thread.groupTitle || thread.title || 'Community Chat')
      : (thread.title || 'New conversation');
    const showOwnerActions = threadActionsEnabled && (!shared || sharedByMe);
    const showActions = signedIn;

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
            {shared && !sharedByMe ? (
              <span className="mt-0.5 shrink-0 text-[10px]" aria-hidden title={thread.shareRole || 'shared'}>
                {thread.shareRole === 'controller' ? '✎' : thread.shareRole === 'control_invited' ? '⏳' : '👁'}
              </span>
            ) : sharedByMe || (thread.activeShareCount && thread.activeShareCount > 0) ? (
              <span className="mt-0.5 shrink-0 text-[10px] text-cyan-400/80" aria-hidden title="Shared with others">
                ↗
              </span>
            ) : null}
            <span className="line-clamp-2 text-sm leading-snug">
              {displayTitle}
            </span>
          </span>
          {shared && !sharedByMe && thread.ownerName ? (
            <span className="mt-0.5 block text-[10px] text-slate-500">from {thread.ownerName}</span>
          ) : null}
          {sharedByMe ? (
            <span className="mt-0.5 block text-[10px] text-slate-500">shared by you</span>
          ) : null}
          {isCommunity ? (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-teal-900/50 px-1.5 py-0.5 text-[10px] font-medium text-teal-200">
                Community
              </span>
            </span>
          ) : null}
          {workgroupOrigin ? (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-violet-900/50 px-1.5 py-0.5 text-[10px] font-medium text-violet-200">
                Workgroup
              </span>
              <Link
                href={workgroupOrigin.href}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-cyan-400 hover:text-cyan-200"
              >
                Open in collab
              </Link>
            </span>
          ) : null}
          {allianceOrigin ? (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-cyan-900/50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200">
                Alliance briefing
              </span>
              <Link
                href={allianceOrigin.href}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-cyan-400 hover:text-cyan-200"
              >
                Open briefing
              </Link>
            </span>
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

        {showActions ? (
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
                {showOwnerActions && !archiveView && onPin ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full bg-slate-950 px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => void togglePin(thread)}
                  >
                    {thread.pinned ? 'Unpin' : 'Pin'}
                  </button>
                ) : null}
                {showOwnerActions && onRename ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full bg-slate-950 px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => startRename(thread)}
                  >
                    Rename
                  </button>
                ) : null}
                {showOwnerActions && onArchive ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full bg-slate-950 px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => void archiveThread(thread)}
                  >
                    {archiveView ? 'Restore' : 'Archive'}
                  </button>
                ) : null}
                {showOwnerActions && onDelete ? (
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
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full bg-slate-950 px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
                  onClick={() => void copyChatId(thread)}
                >
                  {copiedThreadId === thread.id ? 'Copied' : 'Copy Chat ID'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  };

  const listSectionLabel = archiveView ? 'Archived' : 'My conversations';

  return (
    <aside className="relative z-40 flex h-full min-h-0 w-full flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-3">
        <div ref={headerInfoRef} className="relative min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white">Hermes</p>
            <button
              type="button"
              className="rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-600"
              aria-label="About DP Community AI"
              aria-expanded={headerInfoOpen}
              onClick={() => setHeaderInfoOpen((open) => !open)}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">DP Community AI</p>
          {headerInfoOpen ? (
            <div className="absolute left-0 top-full z-[140] mt-1 w-56 rounded-lg border border-slate-600 bg-slate-950 p-3 text-xs text-slate-300 shadow-2xl ring-1 ring-black/40">
              <p>
                Hermes helps you explore Desirable Properties, draft patches, and prepare
                contributions for community discussion.
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <Link
                  href="/participate"
                  className="text-cyan-300 hover:text-cyan-200"
                  onClick={() => setHeaderInfoOpen(false)}
                >
                  How to participate
                </Link>
                <Link
                  href={archiveView ? '/agent' : '/agent?archive=1'}
                  className="text-cyan-300 hover:text-cyan-200"
                  onClick={() => setHeaderInfoOpen(false)}
                >
                  {archiveView ? 'Back to conversations' : 'Archived conversations'}
                </Link>
              </div>
            </div>
          ) : null}
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
        {!archiveView ? (
          <div ref={newMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                if (!signedIn) {
                  onSignIn?.();
                  return;
                }
                setNewMenuOpen((open) => !open);
              }}
              disabled={!signedIn && !onSignIn}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-expanded={newMenuOpen}
              aria-haspopup="menu"
            >
              <span className="text-base leading-none" aria-hidden>
                +
              </span>
              New
              <svg
                className="ml-auto h-4 w-4 text-slate-500"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {newMenuOpen && signedIn ? (
              <div
                className="absolute left-0 right-0 z-[150] mt-1 overflow-hidden rounded-lg border border-slate-600 bg-slate-950 py-1 shadow-2xl ring-1 ring-black/40"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full bg-slate-950 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                  onClick={() => {
                    setNewMenuOpen(false);
                    onCreatePersonal();
                  }}
                >
                  <span className="font-medium text-white">Personal chat</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Private conversation with Hermes
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full bg-slate-950 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                  onClick={() => {
                    setNewMenuOpen(false);
                    onCreateCommunity();
                  }}
                >
                  <span className="font-medium text-white">Community Chat</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Invite others to prompt together
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              signedIn
                ? archiveView
                  ? 'Search archived…'
                  : 'Search conversations…'
                : 'Sign in to search…'
            }
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
          <p className="px-2 py-3 text-xs text-slate-500">
            {archiveView ? 'Loading archived…' : 'Loading conversations…'}
          </p>
        ) : (
          <div className="space-y-4">
            {showSharedSection ? (
              <div>
                {/*
                  Single SHARED section with optional sublabels keeps the sidebar compact
                  while separating threads others shared with you from ones you shared out.
                */}
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Shared
                </p>
                {filteredSharedWithMe.length > 0 ? (
                  <div className="mb-2">
                    {filteredSharedByMe.length > 0 ? (
                      <p className="px-2 pb-0.5 text-[10px] text-slate-600">With me</p>
                    ) : null}
                    <ul className="space-y-0.5">
                      {filteredSharedWithMe.map((thread) => renderThreadRow(thread, { shared: true }))}
                    </ul>
                  </div>
                ) : null}
                {filteredSharedByMe.length > 0 ? (
                  <div>
                    {filteredSharedWithMe.length > 0 ? (
                      <p className="px-2 pb-0.5 text-[10px] text-slate-600">By me</p>
                    ) : null}
                    <ul className="space-y-0.5">
                      {filteredSharedByMe.map((thread) => renderThreadRow(thread, {
                        shared: true,
                        sharedByMe: true,
                      }))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div>
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {listSectionLabel}
              </p>
              {filteredThreads.length === 0 ? (
                <p className="px-2 py-3 text-xs text-slate-500">
                  {query.trim()
                    ? 'No conversations match your search.'
                    : archiveView
                      ? 'No archived conversations.'
                      : 'No conversations yet.'}
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
