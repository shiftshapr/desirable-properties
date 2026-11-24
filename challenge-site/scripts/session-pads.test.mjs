// Session pads on /pads: derived from the schedule and occurrence data, newest first, only the next upcoming one.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionPads } from '../src/lib/pads/session-pads-core.ts';

const at = (iso) => new Date(iso);

test('newest first, only the next upcoming session, V1 launch and community review included', () => {
  const pads = sessionPads(at('2026-11-22T12:00:00Z'));
  const starts = pads.map((p) => Date.parse(p.startsAt));
  assert.deepEqual(starts, [...starts].sort((a, b) => b - a));
  assert.equal(pads[0].date, '2026-11-23');
  assert.match(pads[0].status, /^Upcoming/);
  assert.equal(pads.filter((p) => p.tone === 'upcoming').length, 1);
  assert.ok(pads.some((p) => p.href === '/events/v1-launch'));
  assert.ok(pads.some((p) => p.href === '/events/community-review'));
  assert.ok(pads.some((p) => p.href === '/roundups/2026-09-28'));
  assert.equal(new Set(pads.map((p) => p.href)).size, pads.length);
});

test('16 Nov session shows its ballot status', () => {
  const find = (pads) => pads.find((p) => p.href === '/events/meta-governance-2026-11-16');
  assert.match(find(sessionPads(at('2026-11-22T12:00:00Z'))).status, /^Voting open until/);
  assert.match(find(sessionPads(at('2026-11-23T05:00:00Z'))).status, /^Voting closed; results to follow/);
  const published = { 'meta-governance-2026-11-16': { status: 'published', publishedAt: '2026-11-23T06:00:00Z' } };
  assert.match(find(sessionPads(at('2026-11-23T07:00:00Z'), published)).status, /results published/);
  assert.equal(find(sessionPads(at('2026-11-18T00:00:00Z'))).status, 'Community verification open');
});

test('23 Nov session pad links to its own page and shows its phase', () => {
  const find = (pads) => pads.find((p) => p.date === '2026-11-23');
  const pad = find(sessionPads(at('2026-11-24T02:00:00Z')));
  assert.equal(pad.href, '/events/listening-2026-11-23');
  assert.equal(pad.title, 'Ballot results and the first weekly cycle');
  assert.equal(pad.status, 'Preparing the draft');
  assert.equal(find(sessionPads(at('2026-11-23T18:30:00Z'))).status, 'Happening now');
});
