import type { Metadata } from 'next';
import Link from 'next/link';
import PearlMark from '@/components/badges/PearlMark';
import { listEventSeries } from '@/lib/dp-event-series-store';

export const metadata: Metadata = {
  title: 'Event Series | Desirable Properties',
  description: 'Workshop and event series for the Desirable Properties Challenge.',
};

export default async function SeriesIndexPage() {
  const seriesList = await listEventSeries(true);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Event series</p>
      <h1 className="mt-3 text-4xl font-bold text-white">Workshops &amp; series</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-400">
        Standalone sessions with reflection questions, series badges, and optional{' '}
        <span className="inline-flex items-center gap-1 text-violet-300">
          <PearlMark size={18} />
          PEARL
        </span>{' '}
        patch tracks.
      </p>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {seriesList.map((series) => (
          <li key={series.id}>
            <Link
              href={`/series/${series.slug}`}
              className="block rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-cyan-800/50"
            >
              <h2 className="text-xl font-semibold text-white">{series.title}</h2>
              {series.subtitle ? (
                <p className="mt-2 text-sm text-slate-400">{series.subtitle}</p>
              ) : null}
              <span className="mt-4 inline-block text-sm text-cyan-300">View series →</span>
            </Link>
          </li>
        ))}
      </ul>

      {seriesList.length === 0 ? (
        <p className="mt-8 text-slate-500">No active series yet.</p>
      ) : null}
    </main>
  );
}
