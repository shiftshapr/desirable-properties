import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  createInviteGlobalEvent,
  listInviteGlobalEvents,
} from '@/lib/dp-invite-content-store';

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const events = await listInviteGlobalEvents(false);
  return NextResponse.json({ ok: true, events, count: events.length });
}

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await createInviteGlobalEvent(body, auth.email);
  if (!result.ok) return jsonError('Could not create event.', 400, result.error);
  return NextResponse.json(result);
}
