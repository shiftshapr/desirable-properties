import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ListeningWorkspace from '@/components/listening/ListeningWorkspace';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { MOUNTED_CANONICAL_PATHS } from '@/lib/listening/mounts';
import { getMeetingBySlug } from '@/lib/listening/store.server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Meeting workspace (preview)',
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Workspace for an occurrence without a page of its own (replay demos, tests). An occurrence that has a
 * canonical page redirects there: one durable URL per occurrence. Staging only (feature flag).
 */
export default async function ListeningOccurrencePage({ params }: PageProps) {
  if (!listeningWorkspaceEnabled()) notFound();
  const { slug } = await params;
  const meeting = await getMeetingBySlug(slug);
  if (!meeting) notFound();
  if (meeting.canonicalPath && MOUNTED_CANONICAL_PATHS.has(meeting.canonicalPath)) redirect(meeting.canonicalPath);

  return (
    <main className="mx-auto w-full min-w-0 max-w-[96rem] px-4 py-10 sm:px-6">
      <p className="text-sm">
        <Link href="/events" className="text-cyan-300 hover:text-cyan-200">
          ← Events
        </Link>
      </p>
      <header className="mt-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          {meeting.kind === 'demo' ? 'Replay demo' : 'Meeting record'}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{meeting.title}</h1>
      </header>
      <ListeningWorkspace slug={slug} />
    </main>
  );
}
