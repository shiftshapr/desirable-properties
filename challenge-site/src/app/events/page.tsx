import type { Metadata } from 'next';
import Link from 'next/link';
import {
  listUpcomingEventEntries,
  type UpcomingEventEntry,
} from '@/lib/dp-event-series-store';

export const metadata: Metadata = {
  title: 'Events | Desirable Properties',
  description: 'Upcoming workshops, launches, and gatherings for the Desirable Properties Challenge.',
};

function EventRow({ event }: { event: UpcomingEventEntry }) {
  const kind = event.seriesType === 'single' ? 'Event' : 'Series';

  const inner = (
    <>
      <p className="text-sm font-medium text-cyan-400">{event.dateLabel}</p>
      <h2 className="mt-1 text-xl font-semibold text-white">{event.title}</h2>
      <p className="mt-2 text-sm text-slate-500">
        {kind}
        {event.external ? ' · RSVP on Luma' : ''}
      </p>
      <span className="mt-4 inline-block text-sm text-cyan-300">
        {event.external ? 'RSVP →' : 'View details →'}
      </span>
    </>
  );

  if (event.external) {
    return (
      <li>
        <a
          href={event.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-cyan-800/50"
        >
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={event.href}
        className="block rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-cyan-800/50"
      >
        {inner}
      </Link>
    </li>
  );
}

export default async function EventsIndexPage() {
  const events = await listUpcomingEventEntries();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Events</p>
      <h1 className="mt-3 text-4xl font-bold text-white">Upcoming</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-400">
        Workshops, book launches, and gatherings – sorted by date.
      </p>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </ul>

      {events.length === 0 ? (
        <p className="mt-8 text-slate-500">No upcoming events right now.</p>
      ) : null}
    </main>
  );
}
