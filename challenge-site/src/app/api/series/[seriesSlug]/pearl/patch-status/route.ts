import { NextResponse } from 'next/server';
import { getEventSeriesBySlug } from '@/lib/dp-event-series-store';
import { requireSeriesAuth } from '@/lib/dp-event-series-api';
import { verifyUserPatch } from '@/lib/dp-event-series-patch-verify';

type Params = { params: Promise<{ seriesSlug: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireSeriesAuth();
  if (!auth.ok) return auth.response;

  const { seriesSlug } = await params;
  const series = await getEventSeriesBySlug(seriesSlug);
  if (!series) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const { pearl, match } = await verifyUserPatch({
    seriesId: series.id,
    session: auth.session,
  });

  return NextResponse.json({
    ok: true,
    pearl,
    match,
    verified: Boolean(pearl?.patchVerified),
  });
}
