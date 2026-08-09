import { NextResponse } from 'next/server';
import {
  getEventSeriesBySlug,
  getSeriesProgress,
  listPreReads,
  listQuestionSectionsForSession,
  listRelatedDps,
  listSessionsForSeries,
} from '@/lib/dp-event-series-store';
import { readSession } from '@/lib/auth-session';

type Params = { params: Promise<{ seriesSlug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series || !series.active) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const sessions = await listSessionsForSeries(series.id, true);
  const session = await readSession();
  const progress = session?.userId
    ? await getSeriesProgress(series.id, session.userId)
    : null;

  const sessionsWithMeta = await Promise.all(
    sessions.map(async (s) => ({
      ...s,
      preReads: await listPreReads(s.id),
      relatedDpIds: await listRelatedDps(s.id),
    })),
  );

  return NextResponse.json({
    ok: true,
    series,
    sessions: sessionsWithMeta,
    progress,
  });
}
