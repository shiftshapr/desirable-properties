// Meeting pads (/pads/meetings/[slug]): the preview flag, the data shape, the invite copy, and the consent rule
// (no unconsented participant's name anywhere in the committed pad data or the chat context).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEETING_PADS, getMeetingPad } from '../src/data/meeting-pads/index.ts';
import { meetingPadsPreviewEnabled } from '../src/lib/meeting-pads/flag.ts';
import { MEETING_PAD_STATUS_LABEL, meetingPadChatContext, meetingPadCounts, meetingPadHref } from '../src/lib/meeting-pads/types.ts';
import { meetingInvite, parsePadRef } from '../src/lib/pads/pad-invite-core.ts';

function withEnv(env, fn) {
  const keys = ['MEETING_PADS_PREVIEW', 'DP_ENV'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) {
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
    }
    return fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('flag: off by default, on only with MEETING_PADS_PREVIEW=on outside production', () => {
  assert.equal(withEnv({}, meetingPadsPreviewEnabled), false);
  assert.equal(withEnv({ DP_ENV: 'staging' }, meetingPadsPreviewEnabled), false);
  assert.equal(withEnv({ MEETING_PADS_PREVIEW: 'on', DP_ENV: 'staging' }, meetingPadsPreviewEnabled), true);
  assert.equal(withEnv({ MEETING_PADS_PREVIEW: ' ON ' }, meetingPadsPreviewEnabled), true);
  assert.equal(withEnv({ MEETING_PADS_PREVIEW: 'true', DP_ENV: 'staging' }, meetingPadsPreviewEnabled), false);
  assert.equal(withEnv({ MEETING_PADS_PREVIEW: 'on', DP_ENV: 'prod' }, meetingPadsPreviewEnabled), false);
  assert.equal(withEnv({ MEETING_PADS_PREVIEW: 'on', DP_ENV: 'production' }, meetingPadsPreviewEnabled), false);
});

test('20 Nov walk-through: 14 page items and 7 process items, numbered 1-21, each with a known status', () => {
  const pad = getMeetingPad('2026-11-20-session-page-review');
  assert.ok(pad);
  assert.equal(getMeetingPad('nope'), null);
  const [page, process] = pad.groups;
  assert.equal(page.items.length, 14);
  assert.equal(process.items.length, 7);
  assert.deepEqual(pad.groups.flatMap((g) => g.items.map((i) => i.n)), Array.from({ length: 21 }, (_, i) => i + 1));
  for (const item of pad.groups.flatMap((g) => g.items)) {
    assert.ok(MEETING_PAD_STATUS_LABEL[item.status], `item ${item.n} status`);
    assert.match(item.statusDate, /^\d{4}-\d{2}-\d{2}$/);
    if (item.status === 'built') assert.ok(item.links?.length, `built item ${item.n} links to what shipped`);
  }
  assert.deepEqual(meetingPadCounts(pad), [
    { status: 'built', count: 13 },
    { status: 'to_decide', count: 7 },
    { status: 'kept', count: 1 },
  ]);
  assert.equal(pad.followUps.items.length, 3);
  assert.equal(meetingPadHref(pad.slug), '/pads/meetings/2026-11-20-session-page-review');
});

test('consent: an unconsented participant is never named; no transcript or recording links', () => {
  for (const pad of MEETING_PADS) {
    const text = `${JSON.stringify(pad)}\n${meetingPadChatContext(pad)}`;
    // Names of participants who have not consented are kept out of the repo too: pass them at run time,
    // e.g. MEETING_PAD_PRIVATE_NAMES="name one,name two" npm run test:meeting-pads
    for (const name of (process.env.MEETING_PAD_PRIVATE_NAMES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      assert.ok(!text.toLowerCase().includes(name.toLowerCase()), 'an unconsented name appears in the pad');
    }
    assert.doesNotMatch(text, /transcript\.(txt|json)|zoom\.us\/rec|\.mp4|\.m4a/i);
    for (const p of pad.participants.filter((x) => x.consent !== 'consented')) {
      assert.match(p.shownAs, /participant|reviewer/i, 'pseudonym until consent');
    }
    if (pad.participants.some((p) => p.consent !== 'consented')) assert.equal(pad.visibility, 'private');
  }
});

test('invite: meeting pads share their date, title and own summary; the ref parser accepts their path', () => {
  const c = meetingInvite({
    path: '/pads/meetings/2026-11-20-session-page-review',
    dateLabel: '20 Nov 2026',
    title: 'Session page walk-through',
    summary: 'A walk-through of the 16 Nov session page.',
  });
  assert.equal(c.kind, 'meeting');
  assert.equal(c.key, c.path);
  assert.equal(c.title, '20 Nov 2026 · Session page walk-through');
  assert.deepEqual(parsePadRef({ kind: 'meeting', key: c.key }), { kind: 'meeting', key: c.key });
});
