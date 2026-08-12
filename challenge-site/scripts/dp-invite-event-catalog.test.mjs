import assert from 'node:assert/strict';
import test from 'node:test';

// Keep in sync with src/lib/dp-invite-event-catalog.ts
const INVITE_SERIES_EVENT_PREFIX = 'series:';

function resolveSelectedInviteEvents(selectedIds, globalEvents, seriesEvents) {
  const globalById = new Map(globalEvents.map((event) => [event.id, event]));
  const seriesById = new Map(seriesEvents.map((event) => [event.id, event]));
  const resolved = [];

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

function buildInviteContentContext(selectedEventIds, selectedPerspectiveIds, lead, catalog) {
  const events = resolveSelectedInviteEvents(
    selectedEventIds,
    catalog.events,
    catalog.seriesEvents,
  );
  const perspectives = catalog.perspectives
    .filter((item) => selectedPerspectiveIds.includes(item.id))
    .map((item) => ({ title: item.title, url: item.url, slug: item.slug }));

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
      eventDate: '2026-09-01T00:00:00.000Z',
      description: 'Event series',
      kind: 'series',
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
  assert.equal(context.perspectives.length, 1);
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
