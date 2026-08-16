import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  listPastEventEntries,
  listUpcomingEventEntries,
  type UpcomingEventEntry,
} from '@/lib/dp-event-series-store';

export const metadata: Metadata = {
  title: 'Events | Desirable Properties',
  description: 'Upcoming workshops, launches, and gatherings for the Desirable Properties Challenge.',
};

function actionLabel(event: UpcomingEventEntry) {
  if (event.recordingUrl) return 'Watch recording →';
  if (event.external) return 'RSVP →';
  if (event.seriesHref) return 'View series →';
  return 'View details →';
}

function EventRow({ event }: { event: UpcomingEventEntry }) {
  const kind = event.seriesType === 'single' ? 'Event' : 'Workshop';
  const href = event.recordingUrl || event.href;
  const external = Boolean(event.external || event.recordingUrl);
  const cardClassName =
    'block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition hover:border-cyan-800/50';

  const inner = (
    <>
      {event.imageUrl ? (
        <div className="relative aspect-[16/9] max-h-44 w-full bg-slate-950">
          <Image
            src={event.imageUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="p-6">
        <p className="text-sm font-medium text-cyan-400">{event.dateLabel}</p>
        <h2 className="mt-1 text-xl font-semibold text-white">{event.title}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {kind}
          {event.external && !event.recordingUrl ? ' · RSVP on Luma' : ''}
          {event.recordingUrl ? ' · Recording available' : ''}
        </p>
        {event.seriesTitle && event.seriesHref ? (
          <p className="mt-2 text-sm text-slate-400">{event.seriesTitle}</p>
        ) : null}
        <span className="mt-4 inline-block text-sm text-cyan-300">{actionLabel(event)}</span>
      </div>
    </>
  );

  if (external) {
    return (
      <li>
        <a href={href} target="_blank" rel="noopener noreferrer" className={cardClassName}>
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link href={href} className={cardClassName}>
        {inner}
      </Link>
    </li>
  );
}

export default async function EventsIndexPage() {
  const [upcoming, past] = await Promise.all([
    listUpcomingEventEntries(),
    listPastEventEntries(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Events</p>
      <h1 className="mt-3 text-4xl font-bold text-white">Workshops and gatherings</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-400">
        Individual sessions sorted by date. Series workshops link to the full series page.
      </p>

      <section className="mt-10" aria-labelledby="events-upcoming-heading">
        <h2 id="events-upcoming-heading" className="text-2xl font-semibold text-white">
          Upcoming <span className="text-slate-500">({upcoming.length})</span>
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2">
          {upcoming.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
        {upcoming.length === 0 ? (
          <p className="mt-6 text-slate-500">No upcoming events right now.</p>
        ) : null}
      </section>

      <section className="mt-14" aria-labelledby="events-past-heading">
        <h2 id="events-past-heading" className="text-2xl font-semibold text-white">
          Past <span className="text-slate-500">({past.length})</span>
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-2">
          {past.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
        {past.length === 0 ? (
          <p className="mt-6 text-slate-500">No past events yet.</p>
        ) : null}
      </section>
    </main>
  );
}
