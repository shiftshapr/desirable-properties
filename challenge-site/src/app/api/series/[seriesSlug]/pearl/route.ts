import { NextResponse } from 'next/server';
import {
  getEventSeriesBySlug,
  getOrCreatePearl,
  savePearl,
} from '@/lib/dp-event-series-store';
import { requireSeriesAuth } from '@/lib/dp-event-series-api';

type Params = { params: Promise<{ seriesSlug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireSeriesAuth();
  if (!auth.ok) return auth.response;

  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series || !series.active) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const pearl = await getOrCreatePearl(
    series.id,
    auth.session.userId,
    auth.session.email ?? null,
  );
  return NextResponse.json({ ok: true, series, pearl });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireSeriesAuth();
  if (!auth.ok) return auth.response;

  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const result = await savePearl({
    seriesId: series.id,
    userId: auth.session.userId,
    userEmail: auth.session.email ?? null,
    patchIdea: body.patchIdea,
    socializeUrl: body.socializeUrl,
    socializeNote: body.socializeNote,
    feedbackSummary: body.feedbackSummary,
    feedbackFrom: body.feedbackFrom,
    reflection: body.reflection,
    submit: Boolean(body.submit),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
