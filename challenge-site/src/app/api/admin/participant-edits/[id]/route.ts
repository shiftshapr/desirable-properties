import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import { setParticipantEditStatus } from '@/lib/participant-edits-store.server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await setParticipantEditStatus(id, String(body.status ?? ''), auth.email);
  if (!result.ok) {
    if (result.error === 'not_found') return jsonError('No such proposed edit.', 404, 'not_found');
    if (result.error === 'no_database') return jsonError('Postgres is not configured.', 503, 'no_database');
    return jsonError('Unknown status.', 400, 'bad_status');
  }
  return NextResponse.json(result);
}
