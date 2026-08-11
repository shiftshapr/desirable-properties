'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InviteGlobalEvent, InvitePerspective } from '@/lib/dp-invite-content-store';

function emptyEventDraft() {
  return {
    title: '',
    url: '',
    eventDate: '',
    description: '',
    active: true,
    sortOrder: '0',
  };
}

function emptyPerspectiveDraft() {
  return {
    title: '',
    url: '',
    slug: '',
    active: true,
    sortOrder: '0',
  };
}

export default function InviteContentAdminPanel() {
  const [events, setEvents] = useState<InviteGlobalEvent[]>([]);
  const [perspectives, setPerspectives] = useState<InvitePerspective[]>([]);
  const [eventEditId, setEventEditId] = useState<string | null>(null);
  const [perspectiveEditId, setPerspectiveEditId] = useState<string | null>(null);
  const [eventDraft, setEventDraft] = useState(emptyEventDraft());
  const [perspectiveDraft, setPerspectiveDraft] = useState(emptyPerspectiveDraft());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, perspectivesRes] = await Promise.all([
        fetch('/api/admin/invite-content/events', { credentials: 'include' }),
        fetch('/api/admin/invite-content/perspectives', { credentials: 'include' }),
      ]);
      const eventsData = await eventsRes.json();
      const perspectivesData = await perspectivesRes.json();
      if (!eventsRes.ok || !eventsData.ok) throw new Error(eventsData.message || 'Events load failed');
      if (!perspectivesRes.ok || !perspectivesData.ok) {
        throw new Error(perspectivesData.message || 'Perspectives load failed');
      }
      setEvents(eventsData.events || []);
      setPerspectives(perspectivesData.perspectives || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditEvent(event: InviteGlobalEvent) {
    setEventEditId(event.id);
    setEventDraft({
      title: event.title,
      url: event.url,
      eventDate: event.eventDate ? event.eventDate.slice(0, 16) : '',
      description: event.description || '',
      active: event.active,
      sortOrder: String(event.sortOrder),
    });
  }

  function startEditPerspective(perspective: InvitePerspective) {
    setPerspectiveEditId(perspective.id);
    setPerspectiveDraft({
      title: perspective.title,
      url: perspective.url,
      slug: perspective.slug,
      active: perspective.active,
      sortOrder: String(perspective.sortOrder),
    });
  }

  async function saveEvent() {
    if (!eventDraft.title.trim() || !eventDraft.url.trim()) return;
    setBusy(true);
    setFlash(null);
    try {
      const payload = {
        title: eventDraft.title.trim(),
        url: eventDraft.url.trim(),
        eventDate: eventDraft.eventDate || null,
        description: eventDraft.description.trim() || null,
        active: eventDraft.active,
        sortOrder: Number(eventDraft.sortOrder) || 0,
      };
      const url = eventEditId
        ? `/api/admin/invite-content/events/${encodeURIComponent(eventEditId)}`
        : '/api/admin/invite-content/events';
      const res = await fetch(url, {
        method: eventEditId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Save failed');
      setFlash(eventEditId ? 'Event updated.' : 'Event created.');
      setEventEditId(null);
      setEventDraft(emptyEventDraft());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function savePerspective() {
    if (!perspectiveDraft.title.trim() || !perspectiveDraft.url.trim()) return;
    setBusy(true);
    setFlash(null);
    try {
      const payload = {
        title: perspectiveDraft.title.trim(),
        url: perspectiveDraft.url.trim(),
        slug: perspectiveDraft.slug.trim() || undefined,
        active: perspectiveDraft.active,
        sortOrder: Number(perspectiveDraft.sortOrder) || 0,
      };
      const url = perspectiveEditId
        ? `/api/admin/invite-content/perspectives/${encodeURIComponent(perspectiveEditId)}`
        : '/api/admin/invite-content/perspectives';
      const res = await fetch(url, {
        method: perspectiveEditId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Save failed');
      setFlash(perspectiveEditId ? 'Perspective updated.' : 'Perspective created.');
      setPerspectiveEditId(null);
      setPerspectiveDraft(emptyPerspectiveDraft());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(id: string) {
    if (!window.confirm('Delete this event?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-content/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Delete failed');
      setFlash('Event deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function removePerspective(id: string) {
    if (!window.confirm('Delete this perspective?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-content/perspectives/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Delete failed');
      setFlash('Perspective deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading invite content…</p>;
  }

  return (
    <div className="space-y-10">
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Invite content admin</p>
        <p className="mt-2">
          Manage global events and perspectives that workgroup members can attach to AI invite
          emails. URL: <span className="text-cyan-300">/admin?tab=invite-content</span>
        </p>
        <p className="mt-2 text-slate-400">
          Global events are manual links (no Luma API). Upcoming series and sessions are managed
          under <span className="text-cyan-300">/admin?tab=event-series</span>. Perspectives should
          use site paths like{' '}
          <code className="text-slate-300">/perspectives/a-fork-in-the-web</code>.
        </p>
      </div>

      {flash ? (
        <p className="rounded-md border border-emerald-800/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-800/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Global events</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-400">Title</span>
            <input
              value={eventDraft.title}
              onChange={(e) => setEventDraft((d) => ({ ...d, title: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">URL</span>
            <input
              value={eventDraft.url}
              onChange={(e) => setEventDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="https://…"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Event date (optional)</span>
            <input
              type="datetime-local"
              value={eventDraft.eventDate}
              onChange={(e) => setEventDraft((d) => ({ ...d, eventDate: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Sort order</span>
            <input
              type="number"
              value={eventDraft.sortOrder}
              onChange={(e) => setEventDraft((d) => ({ ...d, sortOrder: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-400">Description (optional)</span>
          <textarea
            value={eventDraft.description}
            onChange={(e) => setEventDraft((d) => ({ ...d, description: e.target.value }))}
            rows={2}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={eventDraft.active}
            onChange={(e) => setEventDraft((d) => ({ ...d, active: e.target.checked }))}
          />
          Active (visible in invite picker)
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveEvent()}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {eventEditId ? 'Update event' : 'Add event'}
          </button>
          {eventEditId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEventEditId(null);
                setEventDraft(emptyEventDraft());
              }}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {events.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">No events yet.</li>
          ) : (
            events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    {event.title}{' '}
                    {!event.active ? (
                      <span className="text-xs text-slate-500">(inactive)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-slate-400">{event.url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditEvent(event)}
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void removeEvent(event.id)}
                  className="text-rose-300 hover:text-rose-200"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Perspectives</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-400">Title</span>
            <input
              value={perspectiveDraft.title}
              onChange={(e) => setPerspectiveDraft((d) => ({ ...d, title: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">URL</span>
            <input
              value={perspectiveDraft.url}
              onChange={(e) => setPerspectiveDraft((d) => ({ ...d, url: e.target.value }))}
              placeholder="/perspectives/a-fork-in-the-web"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Slug</span>
            <input
              value={perspectiveDraft.slug}
              onChange={(e) => setPerspectiveDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="a-fork-in-the-web"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Sort order</span>
            <input
              type="number"
              value={perspectiveDraft.sortOrder}
              onChange={(e) => setPerspectiveDraft((d) => ({ ...d, sortOrder: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={perspectiveDraft.active}
            onChange={(e) => setPerspectiveDraft((d) => ({ ...d, active: e.target.checked }))}
          />
          Active (visible in invite picker)
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void savePerspective()}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {perspectiveEditId ? 'Update perspective' : 'Add perspective'}
          </button>
          {perspectiveEditId ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPerspectiveEditId(null);
                setPerspectiveDraft(emptyPerspectiveDraft());
              }}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {perspectives.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">No perspectives yet.</li>
          ) : (
            perspectives.map((perspective) => (
              <li key={perspective.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    {perspective.title}{' '}
                    {!perspective.active ? (
                      <span className="text-xs text-slate-500">(inactive)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-slate-400">
                    {perspective.url} · {perspective.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEditPerspective(perspective)}
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void removePerspective(perspective.id)}
                  className="text-rose-300 hover:text-rose-200"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
