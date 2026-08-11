import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import PearlMark from '@/components/badges/PearlMark';
import { notFound } from 'next/navigation';
import SessionQuestionsForm from '@/components/series/SessionQuestionsForm';
import SessionActionLink from '@/components/series/SessionActionLink';
import { formatSessionSchedule, formatMinutesEstimate, sumPreReadMinutes, partitionPreReads } from '@/lib/event-series-session-ui';
import type { EventSeriesPreRead } from '@/lib/dp-event-series-store';
import {
  getEventSeriesBySlug,
  getOrCreateResponse,
  getSessionBySeriesAndNumber,
  listPreReads,
  listQuestionSectionsForSession,
  listRelatedDps,
} from '@/lib/dp-event-series-store';
import { readSession } from '@/lib/auth-session';

type Props = { params: Promise<{ seriesSlug: string; sessionNumber: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seriesSlug, sessionNumber } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  const session = series
    ? await getSessionBySeriesAndNumber(series.id, Number(sessionNumber))
    : null;
  if (!session) return { title: 'Session not found' };
  return { title: `${session.title} | ${series?.title || 'Series'}` };
}

export default async function SeriesSessionPage({ params }: Props) {
  const { seriesSlug, sessionNumber: sessionNumberRaw } = await params;
  const sessionNumber = Number(sessionNumberRaw);
  if (!Number.isFinite(sessionNumber)) notFound();

  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series || !series.active) notFound();

  const session = await getSessionBySeriesAndNumber(series.id, sessionNumber);
  if (!session || !session.active) notFound();

  const sections = await listQuestionSectionsForSession(session.id);
  const preReads = await listPreReads(session.id);
  const relatedDpIds = await listRelatedDps(session.id);

  const authSession = await readSession();
  const response = authSession?.userId
    ? await getOrCreateResponse(session.id, authSession.userId, authSession.email ?? null)
    : null;

  const initialAnswers: Record<
    string,
    { valueText?: string | null; valueBool?: boolean | null }
  > = {};
  for (const a of response?.answers || []) {
    initialAnswers[a.questionId] = {
      valueText: a.valueText,
      valueBool: a.valueBool,
    };
  }

  const schedule = formatSessionSchedule(session.startsAt, session.endsAt);
  const { required: requiredPreReads, optional: optionalPreReads } = partitionPreReads(preReads);
  const preReadTotalMinutes = sumPreReadMinutes(requiredPreReads);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href={`/series/${series.slug}`} className="text-sm text-cyan-300 hover:text-cyan-200">
        ← {series.title}
      </Link>

      <p className="mt-6 text-sm text-cyan-400">Session {session.sessionNumber}</p>
      <h1 className="mt-1 text-3xl font-bold text-white">{session.title}</h1>

      {schedule ? <p className="mt-3 text-sm text-slate-300">{schedule}</p> : null}

      {session.imageUrl ? (
        <div className="relative mt-6 aspect-video overflow-hidden rounded-lg border border-slate-800">
          <Image src={session.imageUrl} alt="" fill className="object-cover" />
        </div>
      ) : null}

      {session.facilitatorBlurbMd ? (
        <p className="mt-6 text-slate-300">{session.facilitatorBlurbMd}</p>
      ) : null}

      {requiredPreReads.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-300">
            Pre-Read
            {preReadTotalMinutes ? ` (${formatMinutesEstimate(preReadTotalMinutes)})` : null}
          </p>
          <PreReadLinkList items={requiredPreReads} />
        </div>
      ) : null}

      {optionalPreReads.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-400">Deeper reading (optional)</p>
          <PreReadLinkList items={optionalPreReads} className="text-slate-400" />
        </div>
      ) : null}

      <div className="mt-6">
        <SessionActionLink recordingUrl={session.recordingUrl} liveUrl={session.liveUrl} />
      </div>

      <div className="mt-10 border-t border-slate-800 pt-10">
        <h2 className="text-xl font-bold text-white">Session questions</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sign in required. Answers autosave; you can edit after submit.
        </p>
        <div className="mt-6">
          <SessionQuestionsForm
            seriesSlug={series.slug}
            sessionNumber={session.sessionNumber}
            seriesTitle={series.title}
            sessionTitle={session.title}
            relatedDpIds={relatedDpIds}
            sections={sections}
            initialAttended={response?.attendedConfirmed ?? false}
            initialStatus={response?.status ?? 'draft'}
            initialAnswers={initialAnswers}
            initialAiAssistUsed={response?.aiAssistUsed ?? false}
          />
        </div>
      </div>

      <p className="mt-10 text-sm text-slate-500">
        <Link
          href={`/series/${series.slug}/pearl`}
          className="inline-flex items-center gap-1.5 text-violet-300 hover:text-violet-200"
        >
          <PearlMark size={16} />
          PEARL patch track →
        </Link>
      </p>
    </main>
  );
}

function PreReadLinkList({
  items,
  className,
}: {
  items: EventSeriesPreRead[];
  className?: string;
}) {
  const linkClass = className ?? 'text-cyan-300 hover:text-cyan-200';
  return (
    <ul className="mt-2 space-y-1">
      {items.map((pr) => (
        <li key={pr.id}>
          <a
            href={pr.url}
            className={`text-sm ${linkClass}`}
            target={pr.url.startsWith('http') ? '_blank' : undefined}
            rel={pr.url.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {pr.label}
            {pr.minutesEstimate ? ` (${formatMinutesEstimate(pr.minutesEstimate)})` : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
