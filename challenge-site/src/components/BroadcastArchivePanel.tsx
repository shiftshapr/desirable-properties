'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { BROADCAST_FONT_OPTIONS } from '@/lib/dp-broadcast-send';

type ArchiveEntry = {
  id: string;
  subject: string;
  sentAt: string;
};

type ArchiveDetail = {
  id: string;
  subject: string;
  html: string;
  sentAt: string;
};

export default function BroadcastArchivePanel() {
  const { user, checked, login, loginBusy } = useAuth();
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ArchiveDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/broadcast/archive', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Could not load archive');
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load archive');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void loadEntries();
    else setLoading(false);
  }, [user, loadEntries]);

  useEffect(() => {
    if (!selectedId || !user) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/broadcast/archive/${encodeURIComponent(selectedId)}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || 'Could not load message');
        if (!cancelled) setDetail(data.entry);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load message');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, user]);

  const fontLabel = useMemo(() => {
    if (!detail) return null;
    return BROADCAST_FONT_OPTIONS.find((f) => f.id === 'default')?.label ?? null;
  }, [detail]);

  if (!checked) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (!user) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">Challenge updates archive</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to read past broadcast emails sent to workgroup participants.
        </p>
        <button
          type="button"
          disabled={loginBusy}
          onClick={() => void login()}
          className="mt-4 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          Sign in
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Challenge updates archive</h2>
        <p className="mt-2 text-sm text-slate-400">
          Past broadcast emails marked for archive by admins. Content is personalized with your name and
          workgroups.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-400">Loading archive…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-8 text-sm text-slate-500">
          No archived broadcasts yet.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`w-full px-4 py-3 text-left text-sm transition ${
                    selectedId === entry.id ? 'bg-cyan-950/40' : 'hover:bg-slate-800/60'
                  }`}
                >
                  <p className="font-medium text-white">{entry.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(entry.sentAt).toLocaleString()}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            {!selectedId ? (
              <p className="text-sm text-slate-500">Select an update to read.</p>
            ) : detailLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : detail ? (
              <>
                <h3 className="text-lg font-semibold text-white">{detail.subject}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(detail.sentAt).toLocaleString()}
                  {fontLabel ? ` · ${fontLabel}` : ''}
                </p>
                <div
                  className="prose prose-invert mt-4 max-w-none text-sm [&_img]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: detail.html }}
                />
              </>
            ) : (
              <p className="text-sm text-slate-500">Could not load this update.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
