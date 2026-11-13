import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/site-metadata';
import SteeringNotes from '@/components/steering/SteeringNotes';
import SteeringOverview from '@/components/steering/SteeringOverview';
import Link from 'next/link';
import { readSession } from '@/lib/auth-session';
import { viewerIsSteering } from '@/lib/steering-notes.server';

export const metadata: Metadata = {
  title: 'How Version 1.0 was decided – Desirable Properties',
  description:
    'The open record of how The Layered Web, Version 1.0 was decided: every proposal, every steering decision and the final text of each document.',
  openGraph: pageOpenGraph({
    title: 'How Version 1.0 was decided',
    description:
      'The open record of how The Layered Web, Version 1.0 was decided: every proposal, every steering decision and the final text of each document.',
    path: '/steering',
  }),
};

export const dynamic = 'force-dynamic';

export default async function SteeringPage() {
  const session = await readSession();
  const steering = session?.idToken ? await viewerIsSteering(session.idToken) : false;
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="border-b border-slate-800 pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-violet-300">Version 1.0 · the steering record</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">How Version 1.0 was decided</h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
          The Layered Web was written in the open, and so was every decision about what went into it. This is the
          full record: each proposal, who decided it and why, and the final text of all 28 documents. Anyone can
          read it.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/steering?stage=proposals" className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-cyan-600">
            <p className="font-semibold text-white">Browse the proposals →</p>
            <p className="mt-1 text-sm text-slate-400">
              All 1,635, searchable: 355 from the open review and 1,280 editorial repairs after the freeze.
            </p>
          </Link>
          <Link href="/steering?stage=ledger" className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-cyan-600">
            <p className="font-semibold text-white">Read the ledger →</p>
            <p className="mt-1 text-sm text-slate-400">What each stage decided, stage by stage, with the counts.</p>
          </Link>
          <Link href="/v1" className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-cyan-600">
            <p className="font-semibold text-white">Get the book →</p>
            <p className="mt-1 text-sm text-slate-400">Read Version 1.0 online, download the PDF, or ask Deepi about it.</p>
          </Link>
        </div>
        <details className="mt-5 max-w-3xl text-sm text-slate-400">
          <summary className="cursor-pointer text-slate-300 hover:text-white">How the steering committee worked</summary>
          <p className="mt-2">
            After the November 9 freeze, every open proposal on the 24 DPs and the front matter got a recorded
            decision. Two steering members had to agree on the same decision (and, to accept a revision, the same
            text) before it was carried out. The work ran in four stages: proposal review, a cross-DP check, a style
            pass, and a final read ending in two sign-offs on each document. Each closed stage keeps its full record
            below. Voting and the steering chat are for steering members; everything else is public.
          </p>
        </details>
      </header>
      <SteeringOverview signedIn={Boolean(session?.userId)} steering={steering} />
      {steering ? <SteeringNotes /> : null}
    </main>
  );
}
