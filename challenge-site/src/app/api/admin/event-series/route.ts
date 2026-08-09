import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  createEventSeries,
  listEventSeries,
  listSessionsForSeries,
  updateEventSeries,
  updateSession,
} from '@/lib/dp-event-series-store';

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const seriesList = await listEventSeries(false);
  const enriched = await Promise.all(
    seriesList.map(async (s) => ({
      ...s,
      sessions: await listSessionsForSeries(s.id, false),
    })),
  );
  return NextResponse.json({ ok: true, series: enriched, count: enriched.length });
}

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await createEventSeries(body, auth.email);
  if (!result.ok) return jsonError('Could not create series.', 400, result.error);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));

  if (body.sessionId) {
    const sessionResult = await updateSession(String(body.sessionId), body, auth.email);
    if (!sessionResult.ok) return jsonError('Could not update session.', 400, sessionResult.error);
    return NextResponse.json(sessionResult);
  }

  const id = String(body.id || '');
  if (!id) return jsonError('Series id required.', 400);

  const result = await updateEventSeries(id, body, auth.email);
  if (!result.ok) return jsonError('Could not update series.', 400, result.error);
  return NextResponse.json(result);
}
