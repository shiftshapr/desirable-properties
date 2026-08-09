'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { EventSeriesSession } from '@/lib/dp-event-series-store';

type Props = {
  session: EventSeriesSession;
  seriesSlug: string;
  editorOpen: boolean;
  onOpenEditor: () => void;
  onSaved: () => void;
  children?: React.ReactNode;
};

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export default function EventSeriesSessionCard({
  session,
  seriesSlug,
  editorOpen,
  onOpenEditor,
  onSaved,
  children,
}: Props) {
  const serverLiveUrl = session.liveUrl || '';
  const serverActive = session.active;

  const [liveUrl, setLiveUrl] = useState(serverLiveUrl);
  const [active, setActive] = useState(serverActive);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDirty = liveUrl !== serverLiveUrl || active !== serverActive;

  useEffect(() => {
    if (status === 'saving') return;
    setLiveUrl(serverLiveUrl);
    setActive(serverActive);
    if (!isDirty) {
      setStatus((s) => (s === 'dirty' || s === 'saved' ? 'idle' : s));
    }
  }, [serverLiveUrl, serverActive, session.id]);

  useEffect(() => {
    if (status === 'saving' || status === 'saved') return;
    setStatus(isDirty ? 'dirty' : 'idle');
  }, [isDirty, status]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const save = useCallback(async () => {
    setStatus('saving');
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/admin/event-series/sessions/${encodeURIComponent(session.id)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ liveUrl, active }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || 'Save failed');
      }
      setStatus('saved');
      onSaved();
      window.setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }, [session.id, liveUrl, active, onSaved]);

  const statusLabel =
    status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? 'Saved'
        : status === 'dirty'
          ? 'Unsaved changes'
          : status === 'error'
            ? 'Save failed'
            : null;

  const statusClass =
    status === 'saved'
      ? 'text-emerald-400'
      : status === 'dirty'
        ? 'text-amber-400'
        : status === 'error'
          ? 'text-rose-400'
          : 'text-slate-500';

  return (
    <li className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-slate-200">
          {session.sessionNumber}. {session.title}
        </p>
        {statusLabel ? (
          <span className={`text-xs font-medium ${statusClass}`}>{statusLabel}</span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-slate-300">Live URL (join link)</span>
          <p className="mt-0.5 text-xs text-slate-500">
            Zoom, Meet, or other link participants use to join this session live.
          </p>
          <input
            className="mt-1.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
            value={liveUrl}
            placeholder="https://…"
            onChange={(e) => {
              setLiveUrl(e.target.value);
              if (status !== 'saving') setStatus('dirty');
            }}
          />
        </label>
        <label className="flex items-center gap-2 text-slate-400">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              if (status !== 'saving') setStatus('dirty');
            }}
          />
          Session active (visible on series page)
        </label>
      </div>

      {errorMsg ? (
        <p className="mt-2 rounded border border-rose-800/50 bg-rose-950/30 px-3 py-1.5 text-xs text-rose-200">
          {errorMsg}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={status === 'saving' || !isDirty}
          onClick={() => void save()}
          className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 disabled:opacity-40"
        >
          {status === 'saving' ? 'Saving…' : 'Save session link'}
        </button>
        <button
          type="button"
          onClick={onOpenEditor}
          className="text-xs font-medium text-violet-300 hover:text-violet-200"
        >
          {editorOpen ? 'Close questions editor' : 'Edit questions →'}
        </button>
        <Link
          href={`/series/${seriesSlug}/session/${session.sessionNumber}`}
          className="text-xs text-cyan-400 hover:text-cyan-300"
          target="_blank"
        >
          Session page →
        </Link>
      </div>

      {children}
    </li>
  );
}
