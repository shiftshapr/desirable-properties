import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import { listParticipantEdits } from '@/lib/participant-edits-store.server';

export async function GET(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const status = new URL(request.url).searchParams.get('status') || undefined;
  const edits = await listParticipantEdits(status);
  if (!edits) return jsonError('Postgres is not configured.', 503, 'no_database');
  return NextResponse.json({ ok: true, edits, count: edits.length });
}
