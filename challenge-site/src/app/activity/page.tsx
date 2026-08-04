import { Suspense } from 'react';
import ActivityHubClient from '@/app/activity/ActivityHubClient';
import { fetchChallengeActivity } from '@/lib/govhub';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity – Desirable Properties Challenge',
  description:
    'Gov Hub governance activity and optional Blueberries participation for the Desirable Properties Challenge.',
};

export default async function ActivityPage() {
  const activityItems = await fetchChallengeActivity(24);

  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
        </main>
      }
    >
      <ActivityHubClient activityItems={activityItems} />
    </Suspense>
  );
}
