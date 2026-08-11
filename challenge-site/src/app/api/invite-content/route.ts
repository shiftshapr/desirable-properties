import { NextResponse } from 'next/server';
import { listInviteSelectableSeriesEvents } from '@/lib/dp-invite-event-catalog';
import {
  listInviteGlobalEvents,
  listInvitePerspectives,
  publicInviteEventPayload,
  publicInvitePerspectivePayload,
} from '@/lib/dp-invite-content-store';

export async function GET() {
  const [events, perspectives, seriesEvents] = await Promise.all([
    listInviteGlobalEvents(true),
    listInvitePerspectives(true),
    listInviteSelectableSeriesEvents(),
  ]);

  return NextResponse.json({
    ok: true,
    events: events.map(publicInviteEventPayload),
    seriesEvents,
    perspectives: perspectives.map(publicInvitePerspectivePayload),
  });
}
