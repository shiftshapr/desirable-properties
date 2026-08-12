/** Client-safe invite content resolution (no DB / Node built-ins). */

export const INVITE_SERIES_EVENT_PREFIX = 'series:';
export const INVITE_SESSION_EVENT_PREFIX = 'session:';

export type InviteSeriesEventOption = {
  id: string;
  title: string;
  url: string;
  eventDate?: string | null;
  description?: string | null;
  subtitle?: string | null;
  kind?: 'single' | 'series' | 'session';
};

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

export function resolveSelectedInvitePerspectives(
  selectedIds: string[],
  perspectives: InviteContentCatalog['perspectives'],
): Array<{ title: string; url: string; slug: string }> {
  const byId = new Map(perspectives.map((item) => [item.id, item]));
  const resolved: Array<{ title: string; url: string; slug: string }> = [];
  for (const id of selectedIds) {
    const item = byId.get(id);
    if (item) {
      resolved.push({ title: item.title, url: item.url, slug: item.slug });
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
