import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ContributionActivityClient from './ContributionActivityClient';
import { readSession } from '@/lib/auth-session';
import { isEmailAdmin } from '@/lib/dp-admin-auth';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export const metadata: Metadata = {
  title: 'Contribution activity · Desirable Properties Challenge',
  description:
    'Track Hermes contribution filings across Discuss — your published sets and layer-wide activity for admins.',
};

export const dynamic = 'force-dynamic';

async function fetchContributionActivity(session: {
  verifierId: string;
  email?: string | null;
  idToken: string;
}) {
  const email = String(session.email || session.verifierId || '').trim().toLowerCase();
  const isAdmin = email ? await isEmailAdmin(email) : false;
  const upstreamUrl = new URL(`${getHermesChatUrl()}/api/hermes/contribution-activity`);
  upstreamUrl.searchParams.set('verifierId', session.verifierId);
  if (isAdmin) upstreamUrl.searchParams.set('admin', '1');

  const headers: Record<string, string> = { ...hermesUpstreamHeaders() };
  if (isAdmin) {
    headers['X-Hermes-Admin-Email'] = email;
    headers['X-Hermes-Id-Token'] = session.idToken;
  }

  const upstream = await fetch(upstreamUrl.toString(), {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return { ok: false as const, error: data.error || 'Could not load contribution activity' };
  }
  return {
    ok: true as const,
    rows: data.rows || [],
    summary: data.summary || {
      contributorCount: 0,
      setsFiled: 0,
      dpsTouched: 0,
      threadsWithFiling: 0,
    },
    isAdmin: Boolean(data.admin),
  };
}

export default async function ContributionActivityPage() {
  const session = await readSession();
  if (!session) {
    redirect('/login?next=/contribution-activity');
  }

  const data = await fetchContributionActivity(session);

  if (!data.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold text-white">Contribution activity unavailable</h1>
        <p className="mt-3 text-slate-300">{data.error}</p>
        <Link href="/agent" className="mt-6 inline-block text-cyan-300 hover:text-cyan-200">
          Back to Hermes →
        </Link>
      </div>
    );
  }

  return (
    <ContributionActivityClient
      rows={data.rows}
      summary={data.summary}
      isAdmin={data.isAdmin}
    />
  );
}
