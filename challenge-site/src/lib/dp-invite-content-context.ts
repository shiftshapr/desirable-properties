/** Client-safe invite content resolution (no DB / Node built-ins). */

export const INVITE_SERIES_EVENT_PREFIX = 'series:';
export const INVITE_SESSION_EVENT_PREFIX = 'session:';

const DEFAULT_DP_PUBLIC_BASE = 'https://desirableproperties.org';

export type InviteSeriesEventOption = {
  id: string;
  title: string;
  url: string;
  eventDate?: string | null;
  description?: string | null;
  subtitle?: string | null;
  kind?: 'single' | 'series' | 'session';
  seriesStarted?: string | null;
};

export type ResolvedInviteContentEvent = {
  title: string;
  url: string;
  description?: string | null;
  event_date?: string | null;
  kind?: 'single' | 'series' | 'session';
  next_session_date?: string | null;
  series_started?: string | null;
};

type GlobalInviteEventOption = {
  id: string;
  title: string;
  url: string;
  eventDate?: string | null;
  description?: string | null;
};

export type InviteContentCatalog = {
  events: GlobalInviteEventOption[];
  seriesEvents: InviteSeriesEventOption[];
  perspectives: Array<{ id: string; title: string; url: string; slug: string }>;
};

export type InviteLeadType = 'events' | 'perspectives' | 'engagement';

export type InviteContentContextPayload = {
  events: ResolvedInviteContentEvent[];
  perspectives: Array<{ title: string; url: string; slug: string }>;
  lead: InviteLeadType;
};

/** Public site base for absolute invite URLs (client + server). */
export function dpPublicBaseForInvite(): string {
  if (typeof process !== 'undefined' && process.env) {
    const fromEnv =
      process.env.NEXT_PUBLIC_DP_PUBLIC_BASE || process.env.DP_PUBLIC_BASE;
    if (fromEnv) return String(fromEnv).replace(/\/$/, '');
  }
  return DEFAULT_DP_PUBLIC_BASE;
}

/** Resolve relative DP paths to full https URLs for invite prose. */
export function resolveInviteAbsoluteUrl(href: string): string {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = dpPublicBaseForInvite();
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function resolveSeriesEvent(item: InviteSeriesEventOption): ResolvedInviteContentEvent {
  const kind = item.kind ?? 'series';
  const eventDate = item.eventDate ?? null;
  const seriesStarted = item.seriesStarted ?? null;

  if (kind === 'series') {
    return {
      title: item.title,
      url: resolveInviteAbsoluteUrl(item.url),
      description: item.description ?? item.subtitle ?? null,
      event_date: eventDate,
      kind: 'series',
      next_session_date: eventDate,
      series_started: seriesStarted,
    };
  }

  if (kind === 'session') {
    return {
      title: item.title,
      url: resolveInviteAbsoluteUrl(item.url),
      description: item.description ?? item.subtitle ?? null,
      event_date: eventDate,
      kind: 'session',
      next_session_date: eventDate,
    };
  }

  return {
    title: item.title,
    url: resolveInviteAbsoluteUrl(item.url),
    description: item.description ?? null,
    event_date: eventDate,
    kind: 'single',
  };
}

export function resolveSelectedInviteEvents(
  selectedIds: string[],
  globalEvents: GlobalInviteEventOption[],
  seriesEvents: InviteSeriesEventOption[],
): ResolvedInviteContentEvent[] {
  const globalById = new Map(globalEvents.map((event) => [event.id, event]));
  const seriesById = new Map(seriesEvents.map((event) => [event.id, event]));
  const resolved: ResolvedInviteContentEvent[] = [];

  for (const id of selectedIds) {
    const global = globalById.get(id);
    if (global) {
      resolved.push({
        title: global.title,
        url: resolveInviteAbsoluteUrl(global.url),
        description: global.description ?? null,
        event_date: global.eventDate ?? null,
        kind: 'single',
      });
      continue;
    }
    const series = seriesById.get(id);
    if (series) {
      resolved.push(resolveSeriesEvent(series));
    }
  }

  return resolved;
}

export function resolveSelectedInvitePerspectives(
  selectedIds: string[],
  perspectives: InviteContentCatalog['perspectives'],
): Array<{ title: string; url: string; slug: string }> {
  const byId = new Map(perspectives.map((item) => [item.id, item]));
  const resolved: Array<{ title: string; url: string; slug: string }> = [];
  for (const id of selectedIds) {
    const item = byId.get(id);
    if (item) {
      resolved.push({
        title: item.title,
        url: resolveInviteAbsoluteUrl(item.url),
        slug: item.slug,
      });
    }
  }
  return resolved;
}

/** Map picker selections to the invite-ai draft payload (handles series:/session: IDs). */
export function buildInviteContentContext(
  selectedEventIds: string[],
  selectedPerspectiveIds: string[],
  lead: InviteLeadType,
  catalog: InviteContentCatalog,
): InviteContentContextPayload | null {
  const events = resolveSelectedInviteEvents(
    selectedEventIds,
    catalog.events,
    catalog.seriesEvents,
  );
  const perspectives = resolveSelectedInvitePerspectives(
    selectedPerspectiveIds,
    catalog.perspectives,
  );
  if (!events.length && !perspectives.length) return null;

  let effectiveLead = lead;
  if (events.length && !perspectives.length && effectiveLead === 'perspectives') {
    effectiveLead = 'events';
  } else if (perspectives.length && !events.length && effectiveLead === 'events') {
    effectiveLead = 'perspectives';
  }

  return { events, perspectives, lead: effectiveLead };
}
