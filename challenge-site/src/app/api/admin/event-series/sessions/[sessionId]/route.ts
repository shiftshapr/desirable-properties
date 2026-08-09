import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  getAdminSessionDetail,
  setSessionRelatedDps,
  updateSession,
} from '@/lib/dp-event-series-store';

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { sessionId } = await params;
  const detail = await getAdminSessionDetail(sessionId);
  if (!detail) return jsonError('Session not found.', 404, 'not_found');
  return NextResponse.json({ ok: true, session: detail });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { sessionId } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.relatedDpIds !== undefined) {
    const dpResult = await setSessionRelatedDps(
      sessionId,
      Array.isArray(body.relatedDpIds) ? body.relatedDpIds : [],
    );
    if (!dpResult.ok) return jsonError('Could not update DPs.', 400, dpResult.error);
  }

  const hasSessionFields =
    body.title != null ||
    body.imageUrl !== undefined ||
    body.liveUrl !== undefined ||
    body.facilitatorBlurbMd !== undefined ||
    body.active !== undefined ||
    body.startsAt !== undefined ||
    body.endsAt !== undefined;

  if (hasSessionFields) {
    const result = await updateSession(sessionId, body, auth.email);
    if (!result.ok) return jsonError('Could not update session.', 400, result.error);
  }

  const detail = await getAdminSessionDetail(sessionId);
  return NextResponse.json({ ok: true, session: detail });
}
