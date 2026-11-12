import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SteeringNotes from '@/components/steering/SteeringNotes';
import SteeringSweep from '@/components/steering/SteeringSweep';
import { readSession } from '@/lib/auth-session';
import { frontMatterTitle, normalizeMl } from '@/lib/dp-steering';
import { stageKey } from '@/lib/dp-steering-govhub.server';
import { viewerIsSteering } from '@/lib/steering-notes.server';

type PageProps = { params: Promise<{ ml: string }>; searchParams: Promise<{ stage?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const ml = normalizeMl((await params).ml);
  const name = ml ? frontMatterTitle(ml) || ml : 'Steering';
  return { title: `Steering · ${name} – Desirable Properties`, robots: { index: false, follow: false } };
}

export const dynamic = 'force-dynamic';

export default async function SteeringDocumentPage({ params, searchParams }: PageProps) {
  const ml = normalizeMl((await params).ml);
  if (!ml) notFound();
  const stage = stageKey((await searchParams).stage);
  const session = await readSession();
  // A closed stage is a public record; the open stage is for steering members.
  if (stage) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href={`/steering?stage=${stage}`} className="text-sm text-cyan-300 hover:text-cyan-200">
          ← All documents
        </Link>
        <SteeringSweep ml={ml} stageKey={stage} />
      </main>
    );
  }
  const steering = session?.idToken ? await viewerIsSteering(session.idToken) : false;
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center justify-between gap-3">
        <Link href="/steering" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← All documents
        </Link>
        {steering ? (
          <a href="#steering-notes" className="text-sm text-cyan-300 hover:text-cyan-200">
            Steering notes ↓
          </a>
        ) : null}
      </div>
      {session?.userId ? (
        <>
          <SteeringSweep ml={ml} />
          {steering ? <SteeringNotes ml={ml} /> : null}
        </>
      ) : (
        <p className="mt-8 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          <Link
            href={`/login?next=${encodeURIComponent(`/steering/${ml}`)}`}
            className="text-cyan-300 underline hover:text-cyan-200"
          >
            Sign in
          </Link>{' '}
          as a steering committee member to decide this document&apos;s proposals.
        </p>
      )}
    </main>
  );
}
