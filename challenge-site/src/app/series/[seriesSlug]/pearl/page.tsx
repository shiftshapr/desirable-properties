import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PearlTrackForm from '@/components/series/PearlTrackForm';
import { getEventSeriesBySlug, getOrCreatePearl } from '@/lib/dp-event-series-store';
import { readSession } from '@/lib/auth-session';

type Props = { params: Promise<{ seriesSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series) return { title: 'PEARL track' };
  return { title: `PEARL track | ${series.title}` };
}

export default async function SeriesPearlPage({ params }: Props) {
  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series || !series.active) notFound();

  const authSession = await readSession();
  const pearl = authSession?.userId
    ? await getOrCreatePearl(series.id, authSession.userId, authSession.email ?? null)
    : null;

  const initial = {
    patchIdea: pearl?.patchIdea || '',
    socializeUrl: pearl?.socializeUrl || '',
    socializeNote: pearl?.socializeNote || '',
    feedbackSummary: pearl?.feedbackSummary || '',
    feedbackFrom: pearl?.feedbackFrom || '',
    reflection: pearl?.reflection || '',
    patchVerified: pearl?.patchVerified ?? false,
    patchVerifiedHref: pearl?.patchVerifiedHref || null,
    patchVerifiedSource: pearl?.patchVerifiedSource || null,
    status: (pearl?.status === 'submitted' ? 'submitted' : 'draft') as 'draft' | 'submitted',
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href={`/series/${series.slug}`} className="text-sm text-cyan-300 hover:text-cyan-200">
        ← {series.title}
      </Link>

      <p className="mt-6 text-sm font-medium uppercase tracking-wide text-violet-300">PEARL track</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Patch pipeline</h1>
      <p className="mt-4 text-slate-400">
        Create a patch idea, socialize it, gather feedback, submit a real patch (we detect it on Gov
        Hub or Canopi), and reflect.
      </p>

      <div className="mt-10">
        <PearlTrackForm
          seriesSlug={series.slug}
          seriesTitle={series.title}
          pearlBadgeCode={series.pearlBadgeCode}
          initial={initial}
        />
      </div>
    </main>
  );
}
