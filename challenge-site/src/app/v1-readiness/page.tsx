import Link from 'next/link';
import type { Metadata } from 'next';
import ProposalCountsTable from '@/components/readiness/ProposalCountsTable';
import ReadinessGrid from '@/components/readiness/ReadinessGrid';
import { READINESS_ITEMS, V1_RELEASE_DATE, V1_FREEZE_LABEL } from '@/data/dp-process';
import { readSession } from '@/lib/auth-session';
import { fetchReadinessBoard } from '@/lib/v1-readiness.server';
import V1PhaseText from '@/components/v1/V1PhaseText';

export const metadata: Metadata = {
  title: 'V1 readiness board – Desirable Properties',
  description:
    'Which of the 24 Desirable Properties chapters are ready for Version 1.0 (Friday, November 13, 2026), against the ten-item readiness checklist.',
};

export const dynamic = 'force-dynamic';

export default async function V1ReadinessPage() {
  const [board, session] = await Promise.all([fetchReadinessBoard(), readSession()]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/process" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Principles, protocols and practices
      </Link>
      <header className="mt-6 border-b border-slate-800 pb-8">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          <V1PhaseText
            before="Version 1.0 · Friday, November 13, 2026, 10–11 AM PT"
            during="Version 1.0 is live"
            after="Version 1.0 is finished · Record"
          />
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white">V1 readiness board</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">
          <V1PhaseText
            before={
              <>
                A chapter is ready for Version 1.0 when all {READINESS_ITEMS.length} items pass. This is the board the{' '}
                <Link href="/roundups/2026-11-02" className="text-cyan-300 hover:text-cyan-200">
                  V1 Readiness Review on 2 November
                </Link>{' '}
                works from. Editorial freeze: {V1_FREEZE_LABEL}; release{' '}
                {new Date(`${V1_RELEASE_DATE}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.
              </>
            }
            during={
              <>
                Version 1.0 is finished: all 28 documents are signed off and published. This board is kept as a
                record. A chapter was ready for Version 1.0 when all {READINESS_ITEMS.length} items passed; the{' '}
                <Link href="/roundups/2026-11-02" className="text-cyan-300 hover:text-cyan-200">
                  V1 Readiness Review on 2 November
                </Link>{' '}
                worked from it. Proposals now count toward Version 1.1:{' '}
                <Link href="/participate" className="text-cyan-300 hover:text-cyan-200">
                  how to contribute
                </Link>
                .
              </>
            }
          />
        </p>
      </header>

      <div className="mt-8">
        {board.error ? (
          <p className="rounded-xl border border-amber-700/60 bg-amber-950/40 p-4 text-amber-200">{board.error}</p>
        ) : (
          <>
            <ReadinessGrid
              items={board.items}
              dps={board.dps}
              signedIn={Boolean(session?.userId)}
              generatedAt={board.generatedAt}
            />
            <div className="mt-12">
              <ProposalCountsTable dps={board.dps} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
