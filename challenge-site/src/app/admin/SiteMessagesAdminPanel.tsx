'use client';

import { useCallback, useEffect, useState } from 'react';

type SiteModal = {
  id: string;
  title: string;
  message: string;
  question: string | null;
  variant: string;
  status: string;
  sites: string[];
  audience: string;
  startAt: string | null;
  endAt: string | null;
};

const VARIANTS = ['info', 'success', 'warning', 'danger'];
const AUDIENCES = ['public', 'signed_in', 'workgroup'];
const SITES = ['all', 'home', 'challenge', 'participate', 'workgroups', 'support', 'about'];

function emptyDraft() {
  return {
    title: '',
    message: '',
    question: '',
    variant: 'info',
    audience: 'public',
    sites: ['all'] as string[],
    status: 'draft',
    startAt: '',
    endAt: '',
  };
}

export default function SiteMessagesAdminPanel() {
  const [modals, setModals] = useState<SiteModal[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/site-modals', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Load failed');
      setModals(data.modals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(modal: SiteModal) {
    setEditId(modal.id);
    setDraft({
      title: modal.title,
      message: modal.message,
      question: modal.question || '',
      variant: modal.variant,
      audience: modal.audience,
      sites: modal.sites,
      status: modal.status === 'draft' ? 'draft' : 'scheduled',
      startAt: modal.startAt ? modal.startAt.slice(0, 16) : '',
      endAt: modal.endAt ? modal.endAt.slice(0, 16) : '',
    });
  }

  function resetForm() {
    setEditId(null);
    setDraft(emptyDraft());
  }

  async function saveModal() {
    if (!draft.title.trim()) return;
    setBusy(true);
    setFlash(null);
    try {
      const payload = {
        ...draft,
        startAt: draft.startAt || null,
        endAt: draft.endAt || null,
      };
      const url = editId
        ? `/api/admin/site-modals/${encodeURIComponent(editId)}`
        : '/api/admin/site-modals';
      const res = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Save failed');
      resetForm();
      await load();
      setFlash(editId ? 'Site message updated.' : 'Site message created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function duplicateModal(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/site-modals/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate' }),
      });
      await load();
      setFlash('Duplicated as draft.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteModal(id: string) {
    if (!window.confirm('Delete this site message?')) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/site-modals/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (editId === id) resetForm();
      await load();
      setFlash('Site message deleted.');
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
        <h2 className="text-xl font-semibold text-white">{editId ? 'Edit site message' : 'New site message'}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white md:col-span-2"
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <textarea
            className="min-h-[100px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white md:col-span-2"
            placeholder="Message"
            value={draft.message}
            onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white md:col-span-2"
            placeholder="Optional question"
            value={draft.question}
            onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
          />
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={draft.variant}
            onChange={(e) => setDraft((d) => ({ ...d, variant: e.target.value }))}
          >
            {VARIANTS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={draft.audience}
            onChange={(e) => setDraft((d) => ({ ...d, audience: e.target.value }))}
          >
            {AUDIENCES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={draft.startAt}
            onChange={(e) => setDraft((d) => ({ ...d, startAt: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={draft.endAt}
            onChange={(e) => setDraft((d) => ({ ...d, endAt: e.target.value }))}
          />
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled / active</option>
          </select>
          <select
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            value={draft.sites[0] || 'all'}
            onChange={(e) => setDraft((d) => ({ ...d, sites: [e.target.value] }))}
          >
            {SITES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !draft.title.trim()}
            onClick={() => void saveModal()}
            className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {editId ? 'Update' : 'Create'}
          </button>
          {editId ? (
            <button type="button" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">All site messages</h3>
        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Loading…</p>
        ) : modals.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No site messages yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {modals.map((modal) => (
              <li key={modal.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-white">{modal.title}</p>
                  <p className="text-sm text-slate-400">{modal.message.slice(0, 120)}{modal.message.length > 120 ? '…' : ''}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {modal.status} · {modal.variant} · {modal.sites.join(', ')} · {modal.audience}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" onClick={() => startEdit(modal)}>Edit</button>
                  <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200" onClick={() => void duplicateModal(modal.id)}>Duplicate</button>
                  <button type="button" className="rounded border border-rose-800 px-2 py-1 text-xs text-rose-200" onClick={() => void deleteModal(modal.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
