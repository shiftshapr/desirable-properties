import type { Metadata } from 'next';
import Link from 'next/link';
import SteeringIssues from '@/components/steering/SteeringIssues';
import { readSession } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Steering · Cross-DP issues – Desirable Properties',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Stage 2 by issue: the cross-DP findings in their groups, with the fixes to vote on. */
export default async function SteeringIssuesPage() {
  const session = await readSession();
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/steering" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← All documents
      </Link>
      {session?.userId ? (
        <SteeringIssues />
      ) : (
        <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          <Link href="/login?next=%2Fsteering%2Fissues" className="text-cyan-300 underline hover:text-cyan-200">
            Sign in
          </Link>{' '}
          to read the cross-DP issues.
        </p>
      )}
    </main>
  );
}
