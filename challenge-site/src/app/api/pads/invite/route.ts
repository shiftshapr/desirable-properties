import { NextResponse } from 'next/server';
import { handleInviteGet, handleInviteSend } from '@/lib/pads/pad-invite-core';
import { padInviteDeps } from '@/lib/pads/pad-invite.server';

/**
 * "Send from the site" for a pad's Invite others panel. GET: signed in, sender name, addresses left today.
 * POST {kind, key, to, note}: sends up to 5 invitations (pad-invite-core.ts has the limits).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await handleInviteGet(padInviteDeps());
  return NextResponse.json(r.body, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const r = await handleInviteSend(padInviteDeps(), body);
  return NextResponse.json(r.body, { status: r.status });
}
