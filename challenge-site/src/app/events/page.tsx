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

const cardLinkClass =
  'no-underline transition-colors hover:text-cyan-300 focus-visible:text-cyan-300';
const actionLinkClass =
  'mt-4 inline-block text-sm text-cyan-300 no-underline transition-colors hover:text-cyan-200 focus-visible:text-cyan-200';

function EventRow({ event }: { event: UpcomingEventEntry }) {
  const kind = event.seriesType === 'single' ? 'Event' : 'Workshop';
  const detailHref = event.detailHref;
  const cardClassName =
    'overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition hover:border-cyan-800/50';

  return (
    <li>
      <article className={cardClassName}>
        {event.imageUrl ? (
          <Link href={detailHref} className={`block ${cardLinkClass}`}>
            <div className="relative aspect-[16/9] max-h-44 w-full bg-slate-950">
              <Image
                src={event.imageUrl}
                alt=""
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Link>
        ) : null}
        <div className="p-6">
          <p className="text-sm font-medium">
            <Link href={detailHref} className={`text-cyan-400 ${cardLinkClass}`}>
              {event.dateLabel}
            </Link>
          </p>
          <h2 className="mt-1 text-xl font-semibold">
            <Link href={detailHref} className={`text-white ${cardLinkClass}`}>
              {event.title}
            </Link>
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {kind}
            {event.external && !event.recordingUrl ? ' · RSVP on Luma' : ''}
            {event.recordingUrl ? ' · Recording available' : ''}
          </p>
          {event.seriesTitle ? (
            <p className="mt-2 text-sm text-slate-400">{event.seriesTitle}</p>
          ) : null}
          {event.recordingUrl ? (
            <a
              href={event.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionLinkClass}
            >
              Watch recording →
            </a>
          ) : null}
          {!event.recordingUrl && event.external ? (
            <a href={event.href} target="_blank" rel="noopener noreferrer" className={actionLinkClass}>
              RSVP →
            </a>
          ) : null}
          {!event.recordingUrl && !event.external && event.seriesHref ? (
            <Link href={event.seriesHref} className={actionLinkClass}>
              View series →
            </Link>
          ) : null}
        </div>
      </article>
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
        Individual sessions sorted by date. Date and title open the session page with questions.
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
