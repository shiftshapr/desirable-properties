import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  createInvitePerspective,
  listInvitePerspectives,
} from '@/lib/dp-invite-content-store';

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const perspectives = await listInvitePerspectives(false);
  return NextResponse.json({ ok: true, perspectives, count: perspectives.length });
}

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await createInvitePerspective(body, auth.email);
  if (!result.ok) return jsonError('Could not create perspective.', 400, result.error);
  return NextResponse.json(result);
}
