'use client';

import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { DP_CANOPI_CHAPTERS } from '@/lib/dp-canopi-chapters';

type Blueberry = {
  id: string;
  label: string;
  description: string;
  kind: string;
  govhubMessageId: string | null;
  govhubUrl: string | null;
  dpIds: string[];
  sortOrder: number;
  requiresAcceptance: boolean;
  active: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
};

type Settings = {
  introText: string;
  available: boolean;
  unavailableMessage: string;
};

const KINDS = [
  { value: 'challenge', label: 'Challenge activity' },
  { value: 'reply', label: 'Reply (Canopi post)' },
  { value: 'govhub_action', label: 'Gov Hub action' },
  { value: 'custom', label: 'Custom' },
];

type CanopiPost = {
  id: string;
  content: string;
  pageId: string | null;
  authorName: string | null;
  createdAt: string | null;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export default function BlueberriesAdminPanel() {
  const [settings, setSettings] = useState<Settings>({
    introText: '',
    available: true,
    unavailableMessage: '',
  });
  const [blueberries, setBlueberries] = useState<Blueberry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    label: '',
    description: '',
    kind: 'challenge',
    dpIds: '',
    govhubUrl: '',
    requiresAcceptance: false,
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [availabilityDraft, setAvailabilityDraft] = useState<
    Record<string, { availableFrom: string; availableUntil: string }>
  >({});
  const [canopiPageId, setCanopiPageId] = useState('');
  const [canopiQuery, setCanopiQuery] = useState('');
  const [canopiAuthor, setCanopiAuthor] = useState('');
  const [canopiPosts, setCanopiPosts] = useState<CanopiPost[]>([]);
  const [canopiSearching, setCanopiSearching] = useState(false);
  const [canopiError, setCanopiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blueberries', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Load failed');
      setSettings(data.settings);
      setBlueberries(data.blueberries || []);
      const nextAvailability: Record<string, { availableFrom: string; availableUntil: string }> = {};
      for (const item of data.blueberries || []) {
        nextAvailability[item.id] = {
          availableFrom: toDatetimeLocal(item.availableFrom),
          availableUntil: toDatetimeLocal(item.availableUntil),
        };
      }
      setAvailabilityDraft(nextAvailability);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load blueberries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings() {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch('/api/admin/blueberries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_settings', settings }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Save failed');
      setSettings(data.settings);
      setFlash('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function addBlueberry() {
    if (!draft.label.trim()) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch('/api/admin/blueberries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          dpIds: draft.dpIds.split(/[\s,]+/).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Create failed');
      setDraft({ label: '', description: '', kind: 'challenge', dpIds: '', govhubUrl: '', requiresAcceptance: false });
      await load();
      setFlash('Blueberry added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: Blueberry) {
    setBusy(true);
    try {
      await fetch(`/api/admin/blueberries/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeBlueberry(id: string) {
    if (!window.confirm('Remove this blueberry?')) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/blueberries/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await load();
      setFlash('Blueberry removed.');
    } finally {
      setBusy(false);
    }
  }

  async function reorderBlueberries(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const next = [...blueberries];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setBlueberries(next);
    setBusy(true);
    setFlash(null);
    try {
      const ids = next.map((item) => item.id);
      const res = await fetch(`/api/admin/blueberries/${encodeURIComponent(ids[0])}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', ids }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Reorder failed');
      setBlueberries(data.blueberries || next);
      setFlash('Order updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed');
      await load();
    } finally {
      setBusy(false);
      setDragIndex(null);
    }
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  function handleDrop(index: number) {
    if (dragIndex == null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    void reorderBlueberries(dragIndex, index);
  }

  async function searchCanopiPosts() {
    setCanopiSearching(true);
    setCanopiError(null);
    try {
      const res = await fetch('/api/admin/blueberries/search-posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: canopiPageId || undefined,
          q: canopiQuery || undefined,
          authorName: canopiAuthor || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || data.message || 'Search failed');
      setCanopiPosts(data.posts || []);
    } catch (err) {
      setCanopiError(err instanceof Error ? err.message : 'Search failed');
      setCanopiPosts([]);
    } finally {
      setCanopiSearching(false);
    }
  }

  async function addFromCanopiPost(post: CanopiPost) {
    setBusy(true);
    setFlash(null);
    try {
      const label = post.content.slice(0, 80) || `Post ${post.id.slice(0, 8)}…`;
      const res = await fetch('/api/admin/blueberries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          description: post.content.slice(0, 400),
          kind: 'reply',
          govhubMessageId: post.id,
          requiresAcceptance: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Create failed');
      await load();
      setFlash('Reply blueberry added from Canopi post.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveAvailability(item: Blueberry) {
    const draft = availabilityDraft[item.id];
    if (!draft) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch(`/api/admin/blueberries/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableFrom: fromDatetimeLocal(draft.availableFrom),
          availableUntil: fromDatetimeLocal(draft.availableUntil),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Save failed');
      await load();
      setFlash(`Availability saved for “${item.label}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {flash ? (
        <p className="rounded-md border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{flash}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Blueberries</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Configure challenge participation activities and Gov Hub action links shown to participants.
            </p>
          </div>
          <a
            href="/participate#blueberries"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md border border-cyan-700/60 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-950/40"
          >
            Preview on participate page
          </a>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-300">Intro text</span>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              rows={3}
              value={settings.introText}
              onChange={(e) => setSettings((s) => ({ ...s, introText: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Unavailable message</span>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              rows={3}
              value={settings.unavailableMessage}
              onChange={(e) => setSettings((s) => ({ ...s, unavailableMessage: e.target.value }))}
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.available}
            onChange={(e) => setSettings((s) => ({ ...s, available: e.target.checked }))}
          />
          Blueberries section available to participants
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={() => void saveSettings()}
          className="mt-4 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          Save settings
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Canopi post search</h3>
        <p className="mt-2 text-sm text-slate-400">
          Search Canopi posts on the DP book reader and add reply blueberries. Pick a chapter, search,
          then click Add on a post.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={canopiPageId}
            onChange={(e) => setCanopiPageId(e.target.value)}
          >
            {DP_CANOPI_CHAPTERS.map((c) => (
              <option key={c.value || 'all'} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Search text"
            value={canopiQuery}
            onChange={(e) => setCanopiQuery(e.target.value)}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Author name"
            value={canopiAuthor}
            onChange={(e) => setCanopiAuthor(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={canopiSearching}
          onClick={() => void searchCanopiPosts()}
          className="mt-4 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {canopiSearching ? 'Searching…' : 'Search posts'}
        </button>
        {canopiError ? (
          <p className="mt-3 text-sm text-rose-300">{canopiError}</p>
        ) : null}
        {canopiPosts.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {canopiPosts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-white">{post.content.slice(0, 200)}{post.content.length > 200 ? '…' : ''}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {post.authorName || 'Unknown author'}
                    {post.pageId ? ` · ${post.pageId}` : ''}
                    {post.createdAt ? ` · ${new Date(post.createdAt).toLocaleString()}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addFromCanopiPost(post)}
                  className="shrink-0 rounded border border-cyan-700 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-950/40 disabled:opacity-50"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        ) : canopiSearching ? null : (
          <p className="mt-4 text-sm text-slate-500">Search results appear here.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Add blueberry</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Label"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white md:col-span-2"
            placeholder="Description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="DP ids (e.g. DP1, DP3)"
            value={draft.dpIds}
            onChange={(e) => setDraft((d) => ({ ...d, dpIds: e.target.value }))}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Gov Hub URL (optional)"
            value={draft.govhubUrl}
            onChange={(e) => setDraft((d) => ({ ...d, govhubUrl: e.target.value }))}
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={draft.requiresAcceptance}
            onChange={(e) => setDraft((d) => ({ ...d, requiresAcceptance: e.target.checked }))}
          />
          Requires acceptance
        </label>
        <button
          type="button"
          disabled={busy || !draft.label.trim()}
          onClick={() => void addBlueberry()}
          className="mt-4 rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          Add blueberry
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Configured blueberries</h3>
        <p className="mt-1 text-xs text-slate-500">Drag rows to reorder. Set optional availability windows per item.</p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : blueberries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No blueberries yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {blueberries.map((item, index) => (
              <li
                key={item.id}
                draggable={!busy}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => setDragIndex(null)}
                className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${
                  dragIndex === index ? 'bg-slate-800/60' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <span
                    className="mt-1 cursor-grab select-none text-slate-500 active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="text-sm text-slate-400">{item.description || '—'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.kind}
                      {item.dpIds.length ? ` · ${item.dpIds.join(', ')}` : ''}
                      {item.requiresAcceptance ? ' · requires acceptance' : ''}
                      {!item.active ? ' · disabled' : ''}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="block text-xs text-slate-400">
                        Available from
                        <input
                          type="datetime-local"
                          disabled={busy}
                          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                          value={availabilityDraft[item.id]?.availableFrom ?? ''}
                          onChange={(e) =>
                            setAvailabilityDraft((prev) => ({
                              ...prev,
                              [item.id]: {
                                availableFrom: e.target.value,
                                availableUntil: prev[item.id]?.availableUntil ?? '',
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="block text-xs text-slate-400">
                        Available until
                        <input
                          type="datetime-local"
                          disabled={busy}
                          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
                          value={availabilityDraft[item.id]?.availableUntil ?? ''}
                          onChange={(e) =>
                            setAvailabilityDraft((prev) => ({
                              ...prev,
                              [item.id]: {
                                availableFrom: prev[item.id]?.availableFrom ?? '',
                                availableUntil: e.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveAvailability(item)}
                      className="mt-2 rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      Save availability
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200"
                    onClick={() => void toggleActive(item)}
                  >
                    {item.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-rose-800 px-2 py-1 text-xs text-rose-200"
                    onClick={() => void removeBlueberry(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
