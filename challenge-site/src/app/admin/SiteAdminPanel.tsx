'use client';

import { useCallback, useEffect, useState } from 'react';
import { ONBOARD_TABS, type OnboardTabId } from '@/lib/hermes-onboard/tabs';

type AdminUser = {
  email: string;
  addedAt: string;
  addedBy: string | null;
  protected: boolean;
  source: 'env' | 'db';
};

export default function SiteAdminPanel() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [databaseConfigured, setDatabaseConfigured] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [defaultTab, setDefaultTab] = useState<OnboardTabId>('dp');
  const [onProperty, setOnProperty] = useState('desirableproperties');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, usersRes, onRes] = await Promise.all([
        fetch('/api/admin/me', { credentials: 'include' }),
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/pad-settings', { credentials: 'include' }),
      ]);
      const meData = await meRes.json();
      const usersData = await usersRes.json();
      if (!meRes.ok || !meData.ok) throw new Error('Could not verify admin session');
      setDatabaseConfigured(Boolean(meData.databaseConfigured));
      if (usersRes.ok && usersData.ok) {
        setAdmins(usersData.admins || []);
      }
      if (onRes.ok) {
        const onData = await onRes.json();
        if (onData.settings?.defaultTab) setDefaultTab(onData.settings.defaultTab);
        if (onData.settings?.property) setOnProperty(onData.settings.property);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addAdmin() {
    const email = newEmail.trim();
    if (!email) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Add failed');
      setNewEmail('');
      setAdmins(data.admins || []);
      setFlash('Admin added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeAdmin(email: string) {
    if (!window.confirm(`Remove admin ${email}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Remove failed');
      setAdmins(data.admins || []);
      setFlash('Admin removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveDefaultTab() {
    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/pad-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultTab }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save default tab');
      setFlash(`Default /pad tab is now ${data.settings.defaultTab}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-xl font-semibold text-white">Site admin</h2>
      <p className="mt-3 max-w-3xl text-slate-300">
        Authorized administrators for desirableproperties.org. Sign-in uses the on-chain admin session
        cookie; env-listed admins always have access.
      </p>

      {!databaseConfigured ? (
        <p className="mt-4 rounded-md border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          Postgres is not configured (<code className="text-amber-100">DP_DATABASE_URL</code>). Only
          env-listed admins are shown; DB CRUD is disabled until the database is connected.
        </p>
      ) : null}

      {flash ? (
        <p className="mt-4 rounded-md border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{flash}</p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
        /pad default tab
      </h3>
      <p className="mt-2 text-sm text-slate-400">
        Property <code className="text-slate-300">{onProperty}</code>. Visitors who open{' '}
        <code className="text-slate-300">/pad/{'{slug}'}</code> without <code className="text-slate-300">?tab=</code> land here.
        Ops can also set <code className="text-slate-300">DP_ON_DEFAULT_TAB</code> (and{' '}
        <code className="text-slate-300">hermes_on.default_tab</code> in meta-console registry) as the fallback before this save.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={defaultTab}
          onChange={(e) => setDefaultTab(e.target.value as OnboardTabId)}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {ONBOARD_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label} ({tab.id})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveDefaultTab()}
          className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          Save default tab
        </button>
      </div>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Admin users</h3>
      {loading ? (
        <p className="mt-3 text-sm text-slate-400">Loading…</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-800 rounded-lg border border-slate-800">
          {admins.map((admin) => (
            <li key={admin.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <span className="text-white">{admin.email}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {admin.source === 'env' ? 'env' : 'database'}
                  {admin.protected ? ' · protected' : ''}
                </span>
              </div>
              {admin.source === 'db' && !admin.protected ? (
                <button
                  type="button"
                  className="rounded border border-rose-800 px-2 py-1 text-xs text-rose-200"
                  disabled={busy}
                  onClick={() => void removeAdmin(admin.email)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {databaseConfigured ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="min-w-[240px] flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Add admin email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !newEmail.trim()}
            onClick={() => void addAdmin()}
            className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            Add admin
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Managed via <code className="text-slate-300">ONCHAIN_ADMIN_EMAILS</code> until Postgres is wired.
        </p>
      )}
    </section>
  );
}
