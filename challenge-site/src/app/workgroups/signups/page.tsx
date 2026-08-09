import Link from 'next/link';
import type { Metadata } from 'next';
import WorkgroupSignupsClient from './WorkgroupSignupsClient';
import { fetchWorkgroupSignups } from '@/lib/workgroup-signups';
import { isWorkgroupCollabEnabled } from '@/lib/workgroup-links.server';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Workgroup Signups · Desirable Properties Challenge',
  description:
    'See everyone who has joined a Desirable Properties workgroup – browse by workgroup or by person.',
};

export default async function WorkgroupSignupsPage() {
  const data = await fetchWorkgroupSignups();

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold text-white">Workgroup signups unavailable</h1>
        <p className="mt-3 text-slate-300">
          We could not load signup data from Gov Hub right now. Please try again in a few minutes.
        </p>
        <Link href="/workgroups/join" className="mt-6 inline-block text-cyan-300 hover:text-cyan-200">
          Back to workgroups →
        </Link>
      </div>
    );
  }

  return (
    <WorkgroupSignupsClient
      data={data}
      collabEnabled={await isWorkgroupCollabEnabled()}
    />
  );
}
