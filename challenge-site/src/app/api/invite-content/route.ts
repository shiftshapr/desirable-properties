import { NextResponse } from 'next/server';
import { listInviteSelectableSeriesEvents } from '@/lib/dp-invite-event-catalog';
import {
  listInviteGlobalEvents,
  listInvitePerspectives,
  publicInviteEventPayload,
  publicInvitePerspectivePayload,
} from '@/lib/dp-invite-content-store';

/** Events and perspectives an invitation can include. A failing source is logged and left empty. */
export async function GET() {
  const [events, perspectives, seriesEvents] = await Promise.allSettled([
    listInviteGlobalEvents(true),
    listInvitePerspectives(true),
    listInviteSelectableSeriesEvents(),
  ]);

  const failed: string[] = [];
  const settled = <T,>(name: string, result: PromiseSettledResult<T[]>): T[] => {
    if (result.status === 'fulfilled') return result.value;
    failed.push(name);
    console.error(`[invite-content] ${name} failed:`, result.reason);
    return [];
  };
  const eventRows = settled('events', events);
  const perspectiveRows = settled('perspectives', perspectives);
  const seriesRows = settled('series events', seriesEvents);

  if (failed.length === 3) {
    return NextResponse.json(
      { ok: false, message: 'Events and perspectives could not be loaded right now. You can still send the invitation without them.' },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    events: eventRows.map(publicInviteEventPayload),
    seriesEvents: seriesRows,
    perspectives: perspectiveRows.map(publicInvitePerspectivePayload),
    ...(failed.length ? { partial: failed } : {}),
  });
}
