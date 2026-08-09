import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SeriesProgressPanel from '@/components/series/SeriesProgressPanel';
import {
  getEventSeriesBySlug,
  getSeriesProgress,
  listSessionsForSeries,
} from '@/lib/dp-event-series-store';
import { readSession } from '@/lib/auth-session';

type Props = { params: Promise<{ seriesSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series) return { title: 'Series not found' };
  return {
    title: `${series.title} | Desirable Properties`,
    description: series.subtitle || series.descriptionMd || undefined,
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series || !series.active) notFound();

  const sessions = await listSessionsForSeries(series.id, true);
  const session = await readSession();
  const progress = session?.userId
    ? await getSeriesProgress(series.id, session.userId)
    : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/series" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← All series
      </Link>

      <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
        {series.seriesType === 'single' ? 'Event' : 'Event series'}
      </p>
      <h1 className="mt-2 text-4xl font-bold text-white">{series.title}</h1>
      {series.subtitle ? (
        <p className="mt-3 max-w-3xl text-lg text-slate-300">{series.subtitle}</p>
      ) : null}

      {series.heroImageUrl ? (
        <div className="relative mt-8 aspect-video overflow-hidden rounded-xl border border-slate-800">
          <Image
            src={series.heroImageUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-400">
        {series.seriesType === 'single' ? (
          <span>Save the date</span>
        ) : (
          <span>Online · 75 min · Standalone sessions</span>
        )}
        {series.perspectiveUrl ? (
          <Link href={series.perspectiveUrl} className="text-cyan-300 hover:text-cyan-200">
            Read the perspective →
          </Link>
        ) : null}
        {series.pathwayUrl ? (
          <Link href={series.pathwayUrl} className="text-cyan-300 hover:text-cyan-200">
            Pathway →
          </Link>
        ) : null}
      </div>

      {series.descriptionMd ? (
        <p className="mt-6 max-w-3xl whitespace-pre-wrap text-slate-400">{series.descriptionMd}</p>
      ) : null}

      {series.seriesType === 'single' && sessions[0]?.liveUrl ? (
        <div className="mt-8">
          <a
            href={sessions[0].liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
          >
            RSVP on Luma →
          </a>
          {sessions[0].startsAt ? (
            <p className="mt-3 text-sm text-slate-500">
              {new Date(sessions[0].startsAt).toLocaleString('en-US', {
                dateStyle: 'full',
                timeStyle: 'short',
                timeZone: 'America/Los_Angeles',
              })}{' '}
              PT
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Date TBD — check Luma for updates.</p>
          )}
        </div>
      ) : null}

      {series.seriesType === 'series' ? (
        <div className="mt-12">
          <SeriesProgressPanel
            seriesSlug={series.slug}
            seriesTitle={series.title}
            sessions={sessions}
            progress={progress}
            badgeImageUrl={series.badgeImageUrl}
            pearlBadgeImageUrl={series.pearlBadgeImageUrl}
          />
        </div>
      ) : null}
    </main>
  );
}
