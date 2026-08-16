import {
  listUpcomingEventEntries,
  type EventSeriesType,
} from '@/lib/dp-event-series-store';
import { ensureDpSchema } from '@/lib/dp-db';

import {
  INVITE_SERIES_EVENT_PREFIX,
  INVITE_SESSION_EVENT_PREFIX,
  buildInviteContentContext,
  dpPublicBaseForInvite,
  resolveInviteAbsoluteUrl,
  resolveSelectedInviteEvents,
  resolveSelectedInvitePerspectives,
  type InviteContentCatalog,
  type InviteContentContextPayload,
  type InviteLeadType,
  type ResolvedInviteContentEvent,
} from '@/lib/dp-invite-content-context';

export {
  INVITE_SERIES_EVENT_PREFIX,
  INVITE_SESSION_EVENT_PREFIX,
  buildInviteContentContext,
  dpPublicBaseForInvite,
  resolveInviteAbsoluteUrl,
  resolveSelectedInviteEvents,
  resolveSelectedInvitePerspectives,
  type InviteContentCatalog,
  type InviteContentContextPayload,
  type InviteLeadType,
  type ResolvedInviteContentEvent,
};

export type InviteSelectableSeriesEvent = {
  id: string;
  title: string;
  url: string;
  eventDate: string | null;
  description: string | null;
  kind: 'single' | 'series' | 'session';
  seriesType: EventSeriesType;
  subtitle?: string | null;
  seriesStarted?: string | null;
};

export function inviteSeriesEventId(seriesId: string) {
  return `${INVITE_SERIES_EVENT_PREFIX}${seriesId}`;
}

export function inviteSessionEventId(sessionId: string) {
  return `${INVITE_SESSION_EVENT_PREFIX}${sessionId}`;
}

export function resolveInviteEventAbsoluteUrl(href: string): string {
  return resolveInviteAbsoluteUrl(href);
}

export async function listInviteSelectableSeriesEvents(
  now = new Date(),
): Promise<InviteSelectableSeriesEvent[]> {
  const entries = await listUpcomingEventEntries(now);
  const pool = await ensureDpSchema();
  const options: InviteSelectableSeriesEvent[] = [];
  const seriesIdsAdded = new Set<string>();

  for (const entry of entries) {
    if (entry.seriesType === 'single') {
      options.push({
        id: inviteSeriesEventId(entry.seriesId),
        title: entry.title,
        url: resolveInviteEventAbsoluteUrl(entry.href),
        eventDate: entry.startsAt,
        description: entry.external ? 'RSVP on Luma' : null,
        kind: 'single',
        seriesType: entry.seriesType,
      });
      continue;
    }

    if (entry.seriesId && !seriesIdsAdded.has(entry.seriesId)) {
      seriesIdsAdded.add(entry.seriesId);

      let seriesStarted: string | null = null;
      if (pool) {
        const startedRes = await pool.query(
          `SELECT MIN(s.starts_at) AS first_starts_at
           FROM dp_event_series_session s
           WHERE s.series_id = $1 AND s.active = true AND s.starts_at IS NOT NULL`,
          [entry.seriesId],
        );
        const firstStarts = startedRes.rows[0]?.first_starts_at;
        if (firstStarts) {
          seriesStarted = new Date(String(firstStarts)).toISOString();
        }
      }

      options.push({
        id: inviteSeriesEventId(entry.seriesId),
        title: entry.seriesTitle || entry.title,
        url: resolveInviteEventAbsoluteUrl(entry.seriesHref || entry.href),
        eventDate: entry.startsAt,
        description: 'Event series',
        kind: 'series',
        seriesType: entry.seriesType,
        seriesStarted,
      });
    }

    options.push({
      id: inviteSessionEventId(entry.id),
      title: entry.title,
      url: resolveInviteEventAbsoluteUrl(entry.href),
      eventDate: entry.startsAt,
      description: null,
      kind: 'session',
      seriesType: 'series',
      subtitle: entry.seriesTitle || null,
    });
  }

  return options;
}

export function seriesEventKindLabel(kind: InviteSelectableSeriesEvent['kind']) {
  if (kind === 'single') return 'Event';
  if (kind === 'session') return 'Session';
  return 'Series';
}
