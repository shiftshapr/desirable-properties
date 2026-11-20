import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SteeringNotes from '@/components/steering/SteeringNotes';
import SteeringSweep from '@/components/steering/SteeringSweep';
import { readSession } from '@/lib/auth-session';
import { frontMatterTitle, normalizeMl } from '@/lib/dp-steering';
import { stageKey, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';
import { dpIdFromMlNumber } from '@/lib/dp-govhub-patch-status';
import { dpDetailHref } from '@/lib/dp-links';
import { dpWorkgroupSlug } from '@/lib/dp-workgroup-slugs';
import { viewerIsSteering } from '@/lib/steering-notes.server';

/** True while a steering stage is open; with none open, each DP's co-editors decide its proposals. */
async function steeringStageOpen(): Promise<boolean> {
  const res = await steeringFetch(steeringPaths.stages(), null);
  const stages = Array.isArray(res.data.stages) ? (res.data.stages as Array<{ status?: string }>) : [];
  return stages.some((s) => String(s.status || '').toLowerCase() === 'open');
}

function CoEditorsDecide({ ml }: { ml: string }) {
  const dpId = dpIdFromMlNumber(ml);
  const slug = dpId ? dpWorkgroupSlug(dpId) : null;
  return (
    <div className="mt-8 rounded-xl border border-sky-800/60 bg-sky-950/20 p-4 text-sm text-slate-300">
      <p>
        No steering stage is open. Proposals for Version 1.1, including the Version 1.0 proposals reopened for it,
        are decided by {dpId ? `${dpId}'s` : "this document's"} co-editors through the normal review.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {dpId ? (
          <Link href={dpDetailHref(dpId)} className="text-cyan-300 underline hover:text-cyan-200">
            Open the {dpId} page
          </Link>
        ) : null}
        {slug ? (
          <Link href={`/workgroups/${slug}?tab=review`} className="text-cyan-300 underline hover:text-cyan-200">
            Review its proposals
          </Link>
        ) : null}
        <Link href="/improve/open-items" className="text-cyan-300 underline hover:text-cyan-200">
          All Version 1.1 open items
        </Link>
      </p>
    </div>
  );
}

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
  const [steering, stageOpen] = await Promise.all([
    session?.idToken ? viewerIsSteering(session.idToken) : Promise.resolve(false),
    steeringStageOpen(),
  ]);
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
      {stageOpen ? null : <CoEditorsDecide ml={ml} />}
      {session?.userId ? (
        <>
          <SteeringSweep ml={ml} />
          {steering ? <SteeringNotes ml={ml} /> : null}
        </>
      ) : stageOpen ? (
        <p className="mt-8 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          <Link
            href={`/login?next=${encodeURIComponent(`/steering/${ml}`)}`}
            className="text-cyan-300 underline hover:text-cyan-200"
          >
            Sign in
          </Link>{' '}
          as a steering committee member to decide this document&apos;s proposals.
        </p>
      ) : null}
    </main>
  );
}
