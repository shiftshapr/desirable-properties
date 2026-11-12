import type { Metadata } from 'next';
import SteeringNotes from '@/components/steering/SteeringNotes';
import SteeringOverview from '@/components/steering/SteeringOverview';
import { readSession } from '@/lib/auth-session';
import { viewerIsSteering } from '@/lib/steering-notes.server';

export const metadata: Metadata = {
  title: 'Steering sweep – Desirable Properties',
  description: 'The steering committee records a decision on every open Version 1.0 proposal.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function SteeringPage() {
  const session = await readSession();
  const steering = session?.idToken ? await viewerIsSteering(session.idToken) : false;
  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="border-b border-slate-800 pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-violet-300">Version 1.0 · steering committee</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Steering sweep</h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
          Every open proposal on the 24 DPs and the front matter gets a recorded decision. Two steering members
          must agree on the same decision (and, to accept a revision, the same text) before it is carried out.
          A member may vote on their own proposal and may change their vote until then. The work runs in passes;
          each closed pass keeps its full record, which anyone can read.
        </p>
      </header>
      <SteeringOverview signedIn={Boolean(session?.userId)} steering={steering} />
      {steering ? <SteeringNotes /> : null}
    </main>
  );
}
