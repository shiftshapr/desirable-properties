'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type TeachingNote = {
  id: string;
  noteId?: string;
  text: string;
  dpIds?: string[];
  status: string;
  verifierId?: string | null;
  threadId?: string | null;
  wrongReply?: string | null;
  userQuestion?: string | null;
  signal?: string | null;
  noteKind?: string | null;
  createdAt?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
};

const FILTERS = [
  { value: 'suggestion', label: 'Pending review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suggestion,pending', label: 'All pending' },
] as const;

function statusBadge(status: string) {
  if (status === 'verified') return 'border-emerald-700/70 bg-emerald-950/40 text-emerald-200';
  if (status === 'rejected') return 'border-rose-700/70 bg-rose-950/40 text-rose-200';
  return 'border-amber-700/70 bg-amber-950/40 text-amber-200';
}

function shortDate(value?: string | null) {
  if (!value) return '–';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 19);
  return d.toLocaleString();
}

export default function HermesTeachingAdminClient() {
  const [statusFilter, setStatusFilter] = useState<string>('suggestion');
  const [notes, setNotes] = useState<TeachingNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const selected = notes.find((n) => n.id === selectedId) || null;

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '80',
      });
      const res = await fetch(`/api/agent/admin/community-notes?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load teaching queue');
        setNotes([]);
        return;
      }
      const next = (data.notes || []) as TeachingNote[];
      setNotes(next);
      setSelectedId((prev) => {
        if (prev && next.some((n) => n.id === prev)) return prev;
        return next[0]?.id || null;
      });
    } catch {
      setError('Could not load teaching queue');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function act(action: 'verify' | 'reject' | 'revoke') {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(
        `/api/agent/admin/community-notes/${encodeURIComponent(selectedId)}/${action}`,
        {
          method: 'PATCH',
          credentials: 'include',
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${action} failed`);
      if (action === 'verify') {
        setFlash('Teaching verified – Deepi can use it now.');
      } else if (action === 'revoke') {
        setFlash('Verified teaching revoked – Deepi will no longer use it.');
      } else {
        setFlash('Suggestion rejected.');
      }
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Deepi admin</p>
            <h1 className="text-xl font-semibold text-white">Teaching review</h1>
            <p className="mt-1 text-sm text-slate-400">
              Approve community teaching before it can change Deepi answers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/agent"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
            >
              Open Deepi
            </Link>
            <button
              type="button"
              onClick={() => void loadQueue()}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Queue
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto">
            {loading ? (
              <p className="px-2 py-6 text-sm text-slate-400">Loading…</p>
            ) : notes.length === 0 ? (
              <p className="px-2 py-6 text-sm text-slate-400">No notes in this queue.</p>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selectedId === note.id
                      ? 'border-cyan-700 bg-cyan-950/30'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusBadge(note.status)}`}>
                        {note.status}
                      </span>
                      {note.noteKind === 'style' ? (
                        <span className="rounded-full border border-violet-700/70 bg-violet-950/40 px-2 py-0.5 text-[10px] text-violet-200">
                          style
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-slate-500">{shortDate(note.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-200">{note.text}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {(note.dpIds || []).join(', ') || 'general'}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          {error ? (
            <p className="mb-4 rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          {flash ? (
            <p className="mb-4 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              {flash}
            </p>
          ) : null}

          {!selected ? (
            <p className="text-sm text-slate-400">Select a suggestion to review.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs ${statusBadge(selected.status)}`}>
                    {selected.status}
                  </span>
                  <p className="mt-2 text-xs text-slate-500">
                    Saved {shortDate(selected.createdAt)}
                    {selected.verifierId ? ` · by ${selected.verifierId.slice(0, 24)}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    DPs: {(selected.dpIds || []).join(', ') || 'general'}
                    {selected.noteKind === 'style' ? ' · kind: style/process' : ' · kind: content'}
                    {selected.signal ? ` · signal: ${selected.signal}` : ''}
                  </p>
                </div>
                {selected.status === 'verified' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act('revoke')}
                      className="rounded-lg border border-amber-700/70 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950/40 disabled:opacity-50"
                    >
                      Revoke verified teaching
                    </button>
                  </div>
                ) : null}
                {selected.status === 'suggestion' || selected.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act('reject')}
                      className="rounded-lg border border-rose-700/70 px-4 py-2 text-sm text-rose-100 hover:bg-rose-950/40 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act('verify')}
                      className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                    >
                      {busy ? 'Saving…' : 'Approve & verify'}
                    </button>
                  </div>
                ) : null}
              </div>

              {selected.userQuestion ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    User question
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                    {selected.userQuestion}
                  </p>
                </div>
              ) : null}

              {selected.wrongReply ? (
                <details className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <summary className="cursor-pointer text-xs text-slate-500">
                    What Deepi said (wrong – audit only)
                  </summary>
                  <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-slate-400">
                    {selected.wrongReply}
                  </p>
                </details>
              ) : null}

              <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-500/90">
                  Proposed teaching
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                  {selected.text}
                </p>
              </div>

              {selected.status === 'verified' ? (
                <p className="text-sm text-emerald-300">
                  Verified {shortDate(selected.verifiedAt)}
                  {selected.verifiedBy ? ` by ${selected.verifiedBy}` : ''}.
                  Deepi can inject this on matching DP turns.
                </p>
              ) : null}
              {selected.status === 'rejected' ? (
                <p className="text-sm text-rose-300">
                  Rejected {shortDate(selected.rejectedAt)}
                  {selected.rejectedBy ? ` by ${selected.rejectedBy}` : ''}.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
