'use client';

import Link from 'next/link';
import SessionActionLink from '@/components/series/SessionActionLink';
import SeriesBadgeCards from '@/components/series/SeriesBadgeCards';
import { formatSessionSchedule } from '@/lib/event-series-session-ui';
import type { SeriesProgress } from '@/lib/dp-event-series-store';

type Session = {
  id: string;
  sessionNumber: number;
  slug: string;
  title: string;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  liveUrl: string | null;
  recordingUrl: string | null;
};

type Props = {
  seriesSlug: string;
  seriesTitle: string;
  sessions: Session[];
  progress: SeriesProgress | null;
  badgeImageUrl: string | null;
  pearlBadgeImageUrl: string | null;
};

function statusChip(status: SeriesProgress['sessionStatuses'][0]['status']) {
  if (status === 'submitted') return 'Submitted';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
}

export default function SeriesProgressPanel({
  seriesSlug,
  seriesTitle,
  sessions,
  progress,
  badgeImageUrl,
  pearlBadgeImageUrl,
}: Props) {
  const pct = progress
    ? Math.round((progress.completedSessions / Math.max(progress.requiredSessions, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {progress ? (
        <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5">
          <p className="text-sm font-medium text-cyan-200">Series badge progress</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {progress.completedSessions} / {progress.requiredSessions} sessions
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-cyan-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {progress.seriesBadgeGranted ? (
            <p className="mt-3 text-sm text-emerald-300">Series badge earned!</p>
          ) : progress.seriesBadgeEligible ? (
            <p className="mt-3 text-sm text-emerald-300">Eligible for series badge</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Sign in to track progress toward the series badge.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sessions.map((session) => {
          const st = progress?.sessionStatuses.find((s) => s.sessionId === session.id);
          const schedule = formatSessionSchedule(session.startsAt, session.endsAt);
          return (
            <article
              key={session.id}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40"
            >
              {session.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.imageUrl}
                  alt=""
                  className="h-36 w-full object-cover opacity-90"
                />
              ) : (
                <div className="flex h-36 items-center justify-center bg-slate-800 text-slate-500">
                  Session {session.sessionNumber}
                </div>
              )}
              <div className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-cyan-400">
                  Session {session.sessionNumber}
                  {st ? (
                    <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-slate-400 normal-case">
                      {statusChip(st.status)}
                    </span>
                  ) : null}
                </p>
                <h3 className="mt-1 text-base font-semibold text-white">{session.title}</h3>
                {schedule ? <p className="mt-1 text-xs text-slate-400">{schedule}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <SessionActionLink
                    recordingUrl={session.recordingUrl}
                    liveUrl={session.liveUrl}
                    variant="primary"
                    showPending={false}
                    className="px-3 py-1.5 text-xs"
                  />
                  <Link
                    href={`/series/${seriesSlug}/session/${session.sessionNumber}`}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-400"
                  >
                    Session questions
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <SeriesBadgeCards
        seriesSlug={seriesSlug}
        seriesTitle={seriesTitle}
        badgeImageUrl={badgeImageUrl}
        pearlBadgeImageUrl={pearlBadgeImageUrl}
        progress={progress}
      />
    </div>
  );
}
