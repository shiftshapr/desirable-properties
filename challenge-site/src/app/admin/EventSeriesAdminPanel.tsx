'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import EventSeriesSessionEditor from '@/app/admin/EventSeriesSessionEditor';
import type { EventSeries, EventSeriesSession } from '@/lib/dp-event-series-store';

type SeriesWithSessions = EventSeries & { sessions: EventSeriesSession[] };

function emptySeriesDraft() {
  return {
    title: '',
    slug: '',
    subtitle: '',
    descriptionMd: '',
    heroImageUrl: '',
    perspectiveUrl: '',
    pathwayUrl: '',
    sessionsRequiredCount: '',
    badgeCode: '',
    pearlBadgeCode: '',
    badgeImageUrl: '',
    active: true,
    sortOrder: '0',
  };
}

export default function EventSeriesAdminPanel() {
  const [seriesList, setSeriesList] = useState<SeriesWithSessions[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptySeriesDraft());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [editorSessionId, setEditorSessionId] = useState<string | null>(null);
  const [editorSeriesSlug, setEditorSeriesSlug] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/event-series', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Load failed');
      setSeriesList(data.series || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: SeriesWithSessions) {
    setEditId(item.id);
    setDraft({
      title: item.title,
      slug: item.slug,
      subtitle: item.subtitle || '',
      descriptionMd: item.descriptionMd || '',
      heroImageUrl: item.heroImageUrl || '',
      perspectiveUrl: item.perspectiveUrl || '',
      pathwayUrl: item.pathwayUrl || '',
      sessionsRequiredCount:
        item.sessionsRequiredCount != null ? String(item.sessionsRequiredCount) : '',
      badgeCode: item.badgeCode,
      pearlBadgeCode: item.pearlBadgeCode || '',
      badgeImageUrl: item.badgeImageUrl || '',
      active: item.active,
      sortOrder: String(item.sortOrder),
    });
  }

  async function saveSeries() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...draft,
        id: editId || undefined,
        sessionsRequiredCount: draft.sessionsRequiredCount
          ? Number(draft.sessionsRequiredCount)
          : null,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      const res = await fetch('/api/admin/event-series', {
        method: editId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Save failed');
      setFlash(editId ? 'Series updated.' : 'Series created.');
      setEditId(null);
      setDraft(emptySeriesDraft());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function updateSessionField(
    sessionId: string,
    field: string,
    value: string | boolean,
  ) {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/event-series', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, [field]: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Update failed');
      setFlash('Session updated.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Event series</h2>
        <p className="mt-2 text-sm text-slate-400">
          Manage workshop series, sessions, and badge codes. Fork series is seeded on first load.
        </p>
      </div>

      {flash ? (
        <p className="rounded-md border border-cyan-800/50 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-200">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-800/50 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="font-semibold text-white">{editId ? 'Edit series' : 'New series'}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['title', 'Title'],
              ['slug', 'Slug'],
              ['subtitle', 'Subtitle'],
              ['badgeCode', 'Badge code'],
              ['pearlBadgeCode', 'PEARL badge code'],
              ['heroImageUrl', 'Hero image URL'],
              ['perspectiveUrl', 'Perspective URL'],
              ['pathwayUrl', 'Pathway URL'],
              ['sessionsRequiredCount', 'Sessions required (blank = all)'],
              ['sortOrder', 'Sort order'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="text-slate-400">{label}</span>
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Description</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              value={draft.descriptionMd}
              onChange={(e) => setDraft((d) => ({ ...d, descriptionMd: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
            />
            Active
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveSeries()}
            className="rounded bg-cyan-700 px-4 py-2 text-sm text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {editId ? 'Update' : 'Create'}
          </button>
          {editId ? (
            <button
              type="button"
              onClick={() => {
                setEditId(null);
                setDraft(emptySeriesDraft());
              }}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>

      {loading ? <p className="text-slate-500">Loading…</p> : null}

      <ul className="space-y-6">
        {seriesList.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-slate-500">
                  /series/{item.slug} · {item.active ? 'active' : 'inactive'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/series/${item.slug}`}
                  className="text-sm text-cyan-300 hover:text-cyan-200"
                  target="_blank"
                >
                  Preview
                </Link>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-sm text-slate-300 hover:text-white"
                >
                  Edit
                </button>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {item.sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm"
                >
                  <p className="font-medium text-slate-200">
                    {session.sessionNumber}. {session.title}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs text-slate-500">Live URL</span>
                      <input
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                        defaultValue={session.liveUrl || ''}
                        onBlur={(e) =>
                          void updateSessionField(session.id, 'liveUrl', e.target.value)
                        }
                      />
                    </label>
                    <label className="flex items-end gap-2 pb-1 text-slate-400">
                      <input
                        type="checkbox"
                        defaultChecked={session.active}
                        onChange={(e) =>
                          void updateSessionField(session.id, 'active', e.target.checked)
                        }
                      />
                      Active
                    </label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorSessionId(session.id);
                        setEditorSeriesSlug(item.slug);
                      }}
                      className="text-xs font-medium text-violet-300 hover:text-violet-200"
                    >
                      Edit questions →
                    </button>
                    <Link
                      href={`/series/${item.slug}/session/${session.sessionNumber}`}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                      target="_blank"
                    >
                      Session page →
                    </Link>
                  </div>
                  {editorSessionId === session.id ? (
                    <EventSeriesSessionEditor
                      sessionId={session.id}
                      seriesSlug={item.slug}
                      onClose={() => setEditorSessionId(null)}
                      onFlash={(msg) => setFlash(msg)}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
