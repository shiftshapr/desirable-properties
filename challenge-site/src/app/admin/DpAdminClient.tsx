'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SupportAdminClient from '@/app/support/admin/SupportAdminClient';
import {
  DP_ADMIN_TABS,
  normalizeDpAdminTab,
  type DpAdminTabKey,
} from '@/lib/dp-admin-tabs';

function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-3xl text-slate-300">{description}</p>
      <p className="mt-4 text-sm text-slate-500">
        This tab mirrors the metaweb-book admin layout. Backend wiring for DP-specific data stores
        is not connected yet.
      </p>
    </section>
  );
}

function SiteAdminPanel({ adminEmails }: { adminEmails: string[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-xl font-semibold text-white">Site admin</h2>
      <p className="mt-3 max-w-3xl text-slate-300">
        Authorized administrators for desirableproperties.org. Sign-in uses the same admin session
        as on-chain claims and support admin.
      </p>
      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Admin users
      </h3>
      <ul className="mt-3 divide-y divide-slate-800 rounded-lg border border-slate-800">
        {adminEmails.map((email) => (
          <li key={email} className="px-4 py-3 text-sm text-white">
            {email}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-slate-500">
        Managed via the <code className="text-slate-300">ONCHAIN_ADMIN_EMAILS</code> environment
        variable.
      </p>
    </section>
  );
}

export default function DpAdminClient() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<DpAdminTabKey>(() =>
    normalizeDpAdminTab(searchParams.get('tab')),
  );
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  const loadAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        window.location.href = `/onchain/admin/login?next=${encodeURIComponent('/admin')}`;
        return;
      }
      setAdminEmails(Array.isArray(data.adminEmails) ? data.adminEmails : []);
    } catch {
      setFlash('Could not verify admin session.');
    }
  }, []);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

  useEffect(() => {
    setTab(normalizeDpAdminTab(searchParams.get('tab')));
  }, [searchParams]);

  function selectTab(next: DpAdminTabKey) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Desirable Properties</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Site admin</h1>
      </div>

      {flash ? (
        <p className="mb-4 rounded-md border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          {flash}
        </p>
      ) : null}

      <nav
        className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-4"
        aria-label="Admin sections"
      >
        {DP_ADMIN_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              tab === item.key
                ? 'bg-cyan-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            aria-current={tab === item.key ? 'page' : undefined}
            onClick={() => selectTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'blueberries' ? (
        <AdminPlaceholder
          title="Blueberries"
          description="Configure challenge participation activities, Gov Hub action blueberries, and availability windows for the DP site."
        />
      ) : null}

      {tab === 'support' ? (
        <div className="-mx-4 sm:mx-0">
          <SupportAdminClient />
        </div>
      ) : null}

      {tab === 'broadcast' ? (
        <AdminPlaceholder
          title="Broadcast"
          description="Compose and send email broadcasts to challenge participants, with audience filters and delivery logs."
        />
      ) : null}

      {tab === 'messages' ? (
        <AdminPlaceholder
          title="Site messages"
          description="Schedule modals and announcements across desirableproperties.org pages for specific audiences."
        />
      ) : null}

      {tab === 'site' ? <SiteAdminPanel adminEmails={adminEmails} /> : null}
    </div>
  );
}
