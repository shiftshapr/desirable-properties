'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SupportAdminClient from '@/app/support/admin/SupportAdminClient';
import BlueberriesAdminPanel from '@/app/admin/BlueberriesAdminPanel';
import BroadcastAdminPanel from '@/app/admin/BroadcastAdminPanel';
import SiteMessagesAdminPanel from '@/app/admin/SiteMessagesAdminPanel';
import SiteAdminPanel from '@/app/admin/SiteAdminPanel';
import {
  DP_ADMIN_TABS,
  normalizeDpAdminTab,
  type DpAdminTabKey,
} from '@/lib/dp-admin-tabs';

export default function DpAdminClient() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<DpAdminTabKey>(() =>
    normalizeDpAdminTab(searchParams.get('tab')),
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'unauthorized' | 'forbidden'>(
    'loading',
  );

  const loadAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'include' });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/admin')}`;
        return;
      }
      if (res.status === 403 || !res.ok || !data.ok) {
        setAuthState('forbidden');
        return;
      }
      setAuthState('ok');
    } catch {
      setFlash('Could not verify admin session.');
      setAuthState('unauthorized');
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

  if (authState === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-slate-400 sm:px-6">Verifying admin access…</div>
    );
  }

  if (authState === 'forbidden') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Desirable Properties</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Not authorized</h1>
        <p className="mt-4 text-slate-300">
          You are signed in, but this account is not on the site admin allowlist. Contact an
          existing admin if you need access.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Back to site
          </Link>
          <Link
            href="/login?next=%2Fadmin"
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Sign in with another account
          </Link>
        </div>
      </div>
    );
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

      {tab === 'blueberries' ? <BlueberriesAdminPanel /> : null}
      {tab === 'support' ? (
        <div className="-mx-4 sm:mx-0">
          <SupportAdminClient />
        </div>
      ) : null}
      {tab === 'broadcast' ? <BroadcastAdminPanel /> : null}
      {tab === 'messages' ? <SiteMessagesAdminPanel /> : null}
      {tab === 'site' ? <SiteAdminPanel /> : null}
    </div>
  );
}
