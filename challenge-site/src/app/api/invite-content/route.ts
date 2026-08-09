import { NextResponse } from 'next/server';
import {
  listInviteGlobalEvents,
  listInvitePerspectives,
  publicInviteEventPayload,
  publicInvitePerspectivePayload,
} from '@/lib/dp-invite-content-store';

export async function GET() {
  const [events, perspectives] = await Promise.all([
    listInviteGlobalEvents(true),
    listInvitePerspectives(true),
  ]);

  return NextResponse.json({
    ok: true,
    events: events.map(publicInviteEventPayload),
    perspectives: perspectives.map(publicInvitePerspectivePayload),
  });
}
