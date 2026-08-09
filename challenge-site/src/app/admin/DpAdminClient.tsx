'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SupportAdminClient from '@/app/support/admin/SupportAdminClient';
import BlueberriesAdminPanel from '@/app/admin/BlueberriesAdminPanel';
import BroadcastAdminPanel from '@/app/admin/BroadcastAdminPanel';
import SiteMessagesAdminPanel from '@/app/admin/SiteMessagesAdminPanel';
import InviteContentAdminPanel from '@/app/admin/InviteContentAdminPanel';
import EventSeriesAdminPanel from '@/app/admin/EventSeriesAdminPanel';
import SiteAdminPanel from '@/app/admin/SiteAdminPanel';
import { AdminToastProvider } from '@/components/AdminToastHost';
import AdminAuthShell from '@/components/AdminAuthShell';
import {
  DP_ADMIN_TABS,
  normalizeDpAdminTab,
  type DpAdminTabKey,
} from '@/lib/dp-admin-tabs';
import { useAdminAuthGate } from '@/lib/use-admin-auth-gate';

export default function DpAdminClient() {
  const searchParams = useSearchParams();
  const { authState, error, retry } = useAdminAuthGate();
  const [tab, setTab] = useState<DpAdminTabKey>(() =>
    normalizeDpAdminTab(searchParams.get('tab')),
  );
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    setTab(normalizeDpAdminTab(searchParams.get('tab')));
  }, [searchParams]);

  const selectTab = useCallback((next: DpAdminTabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }, []);

  return (
    <AdminToastProvider>
      <AdminAuthShell authState={authState} error={error} onRetry={retry}>
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6">
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

        {tab === 'blueberries' ? <BlueberriesAdminPanel /> : null}
        {tab === 'support' ? (
          <div className="-mx-4 sm:mx-0">
            <SupportAdminClient />
          </div>
        ) : null}
        {tab === 'broadcast' ? <BroadcastAdminPanel /> : null}
        {tab === 'messages' ? <SiteMessagesAdminPanel /> : null}
        {tab === 'invite-content' ? <InviteContentAdminPanel /> : null}
        {tab === 'event-series' ? <EventSeriesAdminPanel /> : null}
        {tab === 'site' ? <SiteAdminPanel /> : null}
      </div>
      </AdminAuthShell>
    </AdminToastProvider>
  );
}
