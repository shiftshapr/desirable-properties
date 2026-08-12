import assert from 'node:assert/strict';
import test from 'node:test';

// Keep in sync with src/lib/dp-invite-content-context.ts
const INVITE_SERIES_EVENT_PREFIX = 'series:';
const DEFAULT_DP_PUBLIC_BASE = 'https://desirableproperties.org';

function dpPublicBaseForInvite() {
  return DEFAULT_DP_PUBLIC_BASE;
}

function resolveInviteAbsoluteUrl(href) {
  const raw = String(href || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = dpPublicBaseForInvite();
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function resolveSeriesEvent(item) {
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

function resolveSelectedInviteEvents(selectedIds, globalEvents, seriesEvents) {
  const globalById = new Map(globalEvents.map((event) => [event.id, event]));
  const seriesById = new Map(seriesEvents.map((event) => [event.id, event]));
  const resolved = [];

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

function buildInviteContentContext(selectedEventIds, selectedPerspectiveIds, lead, catalog) {
  const events = resolveSelectedInviteEvents(
    selectedEventIds,
    catalog.events,
    catalog.seriesEvents,
  );
  const perspectives = catalog.perspectives
    .filter((item) => selectedPerspectiveIds.includes(item.id))
    .map((item) => ({
      title: item.title,
      url: resolveInviteAbsoluteUrl(item.url),
      slug: item.slug,
    }));

  if (!events.length && !perspectives.length) return null;

  let effectiveLead = lead;
  if (events.length && !perspectives.length && effectiveLead === 'perspectives') {
    effectiveLead = 'events';
  } else if (perspectives.length && !events.length && effectiveLead === 'events') {
    effectiveLead = 'perspectives';
  }

  return { events, perspectives, lead: effectiveLead };
}

test('buildInviteContentContext resolves series-prefixed event IDs', () => {
  const catalog = {
    events: [],
    seriesEvents: [{
      id: `${INVITE_SERIES_EVENT_PREFIX}abc`,
      title: 'Fork in the Web workshops',
      url: 'https://desirableproperties.org/series/fork-in-the-web',
      eventDate: '2026-08-17T00:00:00.000Z',
      description: 'Event series',
      kind: 'series',
      seriesStarted: '2026-06-01T00:00:00.000Z',
    }],
    perspectives: [{
      id: 'persp-1',
      title: 'A Fork in the Web',
      url: '/perspectives/a-fork-in-the-web',
      slug: 'a-fork-in-the-web',
    }],
  };

  const context = buildInviteContentContext(
    [`${INVITE_SERIES_EVENT_PREFIX}abc`],
    ['persp-1'],
    'perspectives',
    catalog,
  );

  assert.equal(context.events.length, 1);
  assert.equal(context.events[0].title, 'Fork in the Web workshops');
  assert.equal(context.events[0].kind, 'series');
  assert.equal(context.events[0].next_session_date, '2026-08-17T00:00:00.000Z');
  assert.equal(context.events[0].series_started, '2026-06-01T00:00:00.000Z');
  assert.equal(context.perspectives.length, 1);
  assert.equal(
    context.perspectives[0].url,
    'https://desirableproperties.org/perspectives/a-fork-in-the-web',
  );
  assert.equal(context.lead, 'perspectives');
});

test('buildInviteContentContext returns null when selections cannot be resolved', () => {
  const context = buildInviteContentContext(
    [`${INVITE_SERIES_EVENT_PREFIX}missing`],
    ['missing-perspective'],
    'events',
    { events: [], seriesEvents: [], perspectives: [] },
  );
  assert.equal(context, null);
});
