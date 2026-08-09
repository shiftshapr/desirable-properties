import { NextResponse } from 'next/server';
import {
  getEventSeriesBySlug,
  getOrCreateResponse,
  getSessionBySeriesAndNumber,
  listPreReads,
  listQuestionSectionsForSession,
  listRelatedDps,
} from '@/lib/dp-event-series-store';
import { requireSeriesAuth } from '@/lib/dp-event-series-api';

type Params = { params: Promise<{ seriesSlug: string; sessionNumber: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { seriesSlug, sessionNumber: sessionNumberRaw } = await params;
  const sessionNumber = Number(sessionNumberRaw);
  if (!Number.isFinite(sessionNumber)) {
    return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
  }

  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series || !series.active) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const session = await getSessionBySeriesAndNumber(series.id, sessionNumber);
  if (!session || !session.active) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const sections = await listQuestionSectionsForSession(session.id);
  const preReads = await listPreReads(session.id);
  const relatedDpIds = await listRelatedDps(session.id);

  const auth = await requireSeriesAuth();
  let response = null;
  if (auth.ok) {
    response = await getOrCreateResponse(
      session.id,
      auth.session.userId,
      auth.session.email ?? null,
    );
  }

  return NextResponse.json({
    ok: true,
    series: { id: series.id, slug: series.slug, title: series.title },
    session,
    preReads,
    relatedDpIds,
    sections,
    response,
    authRequired: !auth.ok,
  });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireSeriesAuth();
  if (!auth.ok) return auth.response;

  const { seriesSlug, sessionNumber: sessionNumberRaw } = await params;
  const sessionNumber = Number(sessionNumberRaw);
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const session = await getSessionBySeriesAndNumber(series.id, sessionNumber);
  if (!session) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const result = await import('@/lib/dp-event-series-store').then((m) =>
    m.saveResponseAnswers({
      sessionId: session.id,
      userId: auth.session.userId,
      userEmail: auth.session.email ?? null,
      attendedConfirmed: body.attendedConfirmed,
      answers: Array.isArray(body.answers) ? body.answers : [],
      submit: Boolean(body.submit),
    }),
  );

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
