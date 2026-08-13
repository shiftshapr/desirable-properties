'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  DP_ADMIN_GROUPS,
  DP_ADMIN_TAB_LABELS,
  defaultTabForDpAdminGroup,
  dpAdminTabGroup,
  normalizeDpAdminTab,
  type DpAdminGroupKey,
  type DpAdminTabKey,
} from '@/lib/dp-admin-tabs';
import { useAdminAuthGate } from '@/lib/use-admin-auth-gate';

const GROUP_LAST_TAB_KEY = 'dp-admin-group-last-tab';

function readGroupLastTabs(): Partial<Record<DpAdminGroupKey, DpAdminTabKey>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(GROUP_LAST_TAB_KEY) || '{}') as Partial<
      Record<DpAdminGroupKey, DpAdminTabKey>
    >;
  } catch {
    return {};
  }
}

function rememberGroupTab(tab: DpAdminTabKey) {
  try {
    const group = dpAdminTabGroup(tab);
    const saved = readGroupLastTabs();
    saved[group] = tab;
    sessionStorage.setItem(GROUP_LAST_TAB_KEY, JSON.stringify(saved));
  } catch {
    /* ignore */
  }
}

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

  const activeGroup = useMemo(() => dpAdminTabGroup(tab), [tab]);
  const activeGroupConfig = useMemo(
    () => DP_ADMIN_GROUPS.find((g) => g.key === activeGroup),
    [activeGroup],
  );

  const selectTab = useCallback((next: DpAdminTabKey) => {
    setTab(next);
    rememberGroupTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }, []);

  const selectGroup = useCallback(
    (group: DpAdminGroupKey) => {
      const saved = readGroupLastTabs()[group];
      const cfg = DP_ADMIN_GROUPS.find((g) => g.key === group);
      const next =
        saved && cfg && (cfg.tabs as readonly string[]).includes(saved)
          ? saved
          : defaultTabForDpAdminGroup(group);
      selectTab(next);
    },
    [selectTab],
  );

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
            className="mb-0 flex gap-6 overflow-x-auto border-b border-slate-800 pb-0 scrollbar-thin"
            aria-label="Admin areas"
          >
            {DP_ADMIN_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                className={`mb-[-1px] shrink-0 border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${
                  activeGroup === group.key
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                aria-current={activeGroup === group.key ? 'page' : undefined}
                onClick={() => selectGroup(group.key)}
              >
                {group.label}
              </button>
            ))}
          </nav>

          {activeGroupConfig && activeGroupConfig.tabs.length > 1 ? (
            <nav
              className="mb-6 flex flex-wrap gap-4 border-b border-slate-800 py-3"
              aria-label="Admin section"
            >
              {activeGroupConfig.tabs.map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  className={`border-b-2 px-0.5 py-1 text-sm font-medium transition-colors ${
                    tab === tabKey
                      ? 'border-cyan-500 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  aria-current={tab === tabKey ? 'page' : undefined}
                  onClick={() => selectTab(tabKey)}
                >
                  {DP_ADMIN_TAB_LABELS[tabKey]}
                </button>
              ))}
            </nav>
          ) : (
            <div className="mb-6" />
          )}

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
