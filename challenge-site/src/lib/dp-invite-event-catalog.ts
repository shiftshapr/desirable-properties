import { dpPublicBase } from '@/lib/support-store';
import {
  listUpcomingEventEntries,
  type EventSeriesType,
} from '@/lib/dp-event-series-store';
import { ensureDpSchema } from '@/lib/dp-db';

export const INVITE_SERIES_EVENT_PREFIX = 'series:';
export const INVITE_SESSION_EVENT_PREFIX = 'session:';

export type InviteSelectableSeriesEvent = {
  id: string;
  title: string;
  url: string;
  eventDate: string | null;
  description: string | null;
  kind: 'single' | 'series' | 'session';
  seriesType: EventSeriesType;
  subtitle?: string | null;
};

export function inviteSeriesEventId(seriesId: string) {
  return `${INVITE_SERIES_EVENT_PREFIX}${seriesId}`;
}

export function inviteSessionEventId(sessionId: string) {
  return `${INVITE_SESSION_EVENT_PREFIX}${sessionId}`;
}

export function resolveInviteEventAbsoluteUrl(href: string): string {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = dpPublicBase();
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export async function listInviteSelectableSeriesEvents(
  now = new Date(),
): Promise<InviteSelectableSeriesEvent[]> {
  const entries = await listUpcomingEventEntries(now);
  const pool = await ensureDpSchema();
  const options: InviteSelectableSeriesEvent[] = [];

  for (const entry of entries) {
    if (entry.seriesType === 'single') {
      options.push({
        id: inviteSeriesEventId(entry.id),
        title: entry.title,
        url: resolveInviteEventAbsoluteUrl(entry.href),
        eventDate: entry.startsAt,
        description: entry.external ? 'RSVP on Luma' : null,
        kind: 'single',
        seriesType: entry.seriesType,
      });
      continue;
    }

    options.push({
      id: inviteSeriesEventId(entry.id),
      title: entry.title,
      url: resolveInviteEventAbsoluteUrl(entry.href),
      eventDate: entry.startsAt,
      description: 'Event series',
      kind: 'series',
      seriesType: entry.seriesType,
    });

    if (!pool) continue;

    const sessions = await pool.query(
      `SELECT s.id, s.title, s.session_number, s.starts_at, s.live_url, e.slug
       FROM dp_event_series_session s
       JOIN dp_event_series e ON e.id = s.series_id
       WHERE s.series_id = $1
         AND s.active = true
         AND (s.starts_at IS NULL OR s.starts_at >= $2)
       ORDER BY s.starts_at ASC NULLS LAST, s.session_number ASC`,
      [entry.id, now.toISOString()],
    );

    for (const row of sessions.rows) {
      const sessionNumber = Number(row.session_number) || 0;
      const sessionTitle = String(row.title || '').trim() || `Session ${sessionNumber}`;
      const liveUrl = row.live_url ? String(row.live_url) : null;
      const href =
        liveUrl || `/series/${String(row.slug)}/session/${sessionNumber}`;
      const startsAt = row.starts_at
        ? new Date(String(row.starts_at)).toISOString()
        : null;

      options.push({
        id: inviteSessionEventId(String(row.id)),
        title: sessionTitle,
        url: resolveInviteEventAbsoluteUrl(href),
        eventDate: startsAt,
        description: null,
        kind: 'session',
        seriesType: 'series',
        subtitle: entry.title,
      });
    }
  }

  return options;
}

export type ResolvedInviteContentEvent = {
  title: string;
  url: string;
  description?: string | null;
  event_date?: string | null;
};

type GlobalInviteEventOption = {
  id: string;
  title: string;
  url: string;
  eventDate?: string | null;
  description?: string | null;
};

/** Map selected picker IDs (global UUID or series:/session: prefix) to draft payload events. */
export function resolveSelectedInviteEvents(
  selectedIds: string[],
  globalEvents: GlobalInviteEventOption[],
  seriesEvents: InviteSelectableSeriesEvent[],
): ResolvedInviteContentEvent[] {
  const globalById = new Map(globalEvents.map((event) => [event.id, event]));
  const seriesById = new Map(seriesEvents.map((event) => [event.id, event]));
  const resolved: ResolvedInviteContentEvent[] = [];

  for (const id of selectedIds) {
    const global = globalById.get(id);
    if (global) {
      resolved.push({
        title: global.title,
        url: global.url,
        description: global.description ?? null,
        event_date: global.eventDate ?? null,
      });
      continue;
    }
    const series = seriesById.get(id);
    if (series) {
      resolved.push({
        title: series.title,
        url: series.url,
        description: series.description ?? series.subtitle ?? null,
        event_date: series.eventDate ?? null,
      });
    }
  }

  return resolved;
}

export function seriesEventKindLabel(kind: InviteSelectableSeriesEvent['kind']) {
  if (kind === 'single') return 'Event';
  if (kind === 'session') return 'Session';
  return 'Series';
}
