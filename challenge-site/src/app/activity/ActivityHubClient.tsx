'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BlueberriesWidget from '@/components/BlueberriesWidget';
import BroadcastArchivePanel from '@/components/BroadcastArchivePanel';
import ChallengeActivity from '@/components/ChallengeActivity';
import type { ChallengeActivityItem } from '@/lib/govhub';

const TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'updates', label: 'Updates' },
  { key: 'blueberries', label: 'Blueberries' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

type Props = {
  activityItems: ChallengeActivityItem[];
};

export default function ActivityHubClient({ activityItems }: Props) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => {
    const raw = searchParams.get('tab');
    if (raw === 'blueberries') return 'blueberries';
    if (raw === 'updates') return 'updates';
    return 'activity';
  });

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw === 'blueberries') setTab('blueberries');
    else if (raw === 'updates') setTab('updates');
    else setTab('activity');
  }, [searchParams]);

  const selectTab = useCallback((next: TabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }, []);

  return (
    <main className="border-b border-slate-800">
      <section className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Your hub</p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Activity</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Follow challenge governance on Gov Hub and optional Blueberries participation activities.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav
          className="mb-8 flex flex-wrap gap-2 border-b border-slate-800 pb-4"
          aria-label="Activity sections"
        >
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium ${
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

        {tab === 'activity' ? (
          <section>
            <h2 className="text-xl font-semibold text-white">Gov Hub activity</h2>
            <p className="mt-2 text-sm text-slate-400">
              Recent drafts, votes, and workgroup events from the Meta-Layer layer.
            </p>
            <div className="mt-6">
              <ChallengeActivity items={activityItems} />
            </div>
          </section>
        ) : null}

        {tab === 'updates' ? <BroadcastArchivePanel /> : null}

        {tab === 'blueberries' ? (
          <div className="-mx-4 sm:mx-0">
            <BlueberriesWidget embedded />
          </div>
        ) : null}
      </div>
    </main>
  );
}
