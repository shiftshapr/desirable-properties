'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import UserDateTime from '@/components/UserDateTime';
import WorkgroupMessageBody from '@/components/workgroup/WorkgroupMessageBody';
import { frontMatterTitle } from '@/lib/dp-steering';

type Note = {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  mlNumber: string | null;
  body: string;
  mine: boolean;
};

const REFRESH_MS = 30_000;

function docLabel(ml: string): string {
  return frontMatterTitle(ml) || ml;
}

/**
 * Steering notes: a private chat for the steering members, on /steering and every
 * /steering/<ml> page (one shared thread). Notes written from a document page carry it, and on a
 * document page you can show only that document's notes.
 */
export default function SteeringNotes({ ml = null }: { ml?: string | null }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [onlyThis, setOnlyThis] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/steering/notes', { cache: 'no-store', credentials: 'include' });
      const body = (await res.json().catch(() => ({}))) as { notes?: Note[]; error?: string };
      if (res.status === 403) {
        setDenied(true);
        return;
      }
      if (!res.ok) throw new Error(body.error || `Could not load notes (${res.status})`);
      setNotes(body.notes || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notes');
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const t = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh]);

  const shown = (notes || []).filter((n) => !onlyThis || n.mlNumber === ml);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  async function send() {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch('/api/steering/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body, ml }),
      });
      const data = (await res.json().catch(() => ({}))) as { note?: Note; error?: string };
      if (!res.ok || !data.note) throw new Error(data.error || `Could not post (${res.status})`);
      setNotes((prev) => [...(prev || []), data.note!]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setPosting(false);
    }
  }

  async function remove(note: Note) {
    setError(null);
    const res = await fetch(`/api/steering/notes?id=${encodeURIComponent(note.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) setNotes((prev) => (prev || []).filter((n) => n.id !== note.id));
    else setError(((await res.json().catch(() => ({}))) as { error?: string }).error || 'Could not remove the note');
  }

  if (denied) return null;

  return (
    <section id="steering-notes" className="mt-10 scroll-mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Steering notes</h2>
          <p className="mt-1 text-xs text-slate-400">
            A private chat for Daveed, Michelle and Lela. Only the steering committee can read it. Notes are not votes.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {ml ? (
            <label className="flex items-center gap-1.5 text-slate-400">
              <input type="checkbox" checked={onlyThis} onChange={(e) => setOnlyThis(e.target.checked)} className="accent-cyan-500" />
              Only {docLabel(ml)}
            </label>
          ) : null}
          <button type="button" onClick={() => void refresh()} className="text-slate-400 hover:text-cyan-300">
            Refresh
          </button>
        </div>
      </div>

      <div ref={listRef} className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {notes === null && !error ? (
          <p className="text-sm text-slate-500">Loading notes…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet. Leave the first one.</p>
        ) : (
          shown.map((n) => (
            <article key={n.id} className="group rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-100">{n.userName}</span>
                  {n.mlNumber ? (
                    <Link
                      href={`/steering/${n.mlNumber.toLowerCase()}`}
                      className="rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-cyan-300 hover:border-cyan-600"
                    >
                      {docLabel(n.mlNumber)}
                    </Link>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {n.mine ? (
                    <button
                      type="button"
                      onClick={() => void remove(n)}
                      className="text-[11px] text-slate-500 opacity-0 transition hover:text-rose-300 group-hover:opacity-100 focus:opacity-100"
                    >
                      Remove
                    </button>
                  ) : null}
                  <UserDateTime value={n.createdAt} mode="short" className="text-xs text-slate-500" />
                </div>
              </div>
              <WorkgroupMessageBody body={n.body} />
            </article>
          ))
        )}
      </div>

      <form
        className="mt-4 space-y-2 border-t border-slate-800 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          maxLength={4000}
          placeholder={ml ? `Leave a note for the committee (tagged ${docLabel(ml)})` : 'Leave a note for the committee'}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={posting || !draft.trim()}
            className="rounded-lg bg-cyan-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {posting ? 'Posting…' : 'Post note'}
          </button>
          <span className="text-xs text-slate-500">⌘/Ctrl + Enter to post</span>
        </div>
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      </form>
    </section>
  );
}
