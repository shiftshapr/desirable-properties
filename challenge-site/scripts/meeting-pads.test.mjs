// Meeting pads (/pads/meetings/[slug]): the preview flag, the data shape, the invite copy, and the consent rule
// (no unconsented participant's name anywhere in the committed pad data or the chat context).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { MEETING_PADS, getMeetingPad, publicMeetingPads } from '../src/data/meeting-pads/index.ts';
import { meetingPadServable, meetingPadsPreviewEnabled } from '../src/lib/meeting-pads/flag.ts';
import {
  isMeetingPadPublic,
  MEETING_PAD_STATUS_LABEL,
  meetingPadChatContext,
  meetingPadCounts,
  meetingPadHref,
} from '../src/lib/meeting-pads/types.ts';
import { DP_ROUNDUP_EVENTS } from '../src/lib/dp-roundups.ts';
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
    // Quotes only from participants who consented, and never from anyone not on the pad.
    const consented = new Set(pad.participants.filter((p) => p.consent === 'consented').map((p) => p.shownAs));
    for (const item of pad.groups.flatMap((g) => g.items)) {
      if (item.quote) {
        assert.ok(consented.has(item.quote.by), `item ${item.n}: quote from a consented participant`);
        assert.match(item.quote.at, /^\d{2}:\d{2}$/);
      }
    }
  }
});

// The same profanity rule applies to quotes and transcripts.
const LEFT_OUT = /fuck|shit|slut|\bhell\b|damn|jamaima/i;

const BASE = getMeetingPad('2026-11-20-session-page-review');
const privateCopy = {
  ...BASE,
  slug: '2026-01-01-private-test',
  visibility: 'private',
  participants: [
    { shownAs: 'Daveed Benjamin', role: 'host', consent: 'consented' },
    { shownAs: 'A participant', role: 'reviewer', consent: 'pending' },
  ],
};

test('public rule: public visibility AND every non-host participant consented', () => {
  assert.equal(isMeetingPadPublic(BASE), true);
  assert.equal(isMeetingPadPublic(privateCopy), false);
  // Public visibility alone is not enough while someone has not consented.
  assert.equal(isMeetingPadPublic({ ...privateCopy, visibility: 'public' }), false);
  // Everyone consented but the pad is still marked private: not public.
  assert.equal(isMeetingPadPublic({ ...BASE, visibility: 'private' }), false);
  // The host's own consent value does not gate it.
  assert.equal(
    isMeetingPadPublic({ ...BASE, participants: [{ shownAs: 'Host', role: 'host', consent: 'pending' }, BASE.participants[1]] }),
    true,
  );
});

test('public pad is served with the preview off and in production; a private pad stays preview-only', () => {
  for (const env of [{}, { DP_ENV: 'prod' }, { DP_ENV: 'production', MEETING_PADS_PREVIEW: 'on' }, { DP_ENV: 'staging' }]) {
    assert.equal(withEnv(env, () => meetingPadServable(BASE)), true, `public pad served: ${JSON.stringify(env)}`);
    assert.equal(withEnv(env, () => meetingPadServable(privateCopy)), false, `private pad hidden: ${JSON.stringify(env)}`);
  }
  assert.equal(withEnv({ MEETING_PADS_PREVIEW: 'on', DP_ENV: 'staging' }, () => meetingPadServable(privateCopy)), true);
  // Listings carry only public pads, newest first.
  for (const p of publicMeetingPads()) assert.ok(isMeetingPadPublic(p));
  assert.ok(publicMeetingPads().some((p) => p.slug === BASE.slug));
});

test('Markabadi: named, public, consented; no leftover pseudonym wording', () => {
  const m = BASE.participants.find((p) => p.role !== 'host');
  assert.deepEqual(m, { shownAs: 'Markabadi', role: 'reviewer, co-editor of DP19', consent: 'consented' });
  assert.equal(BASE.visibility, 'public');
  const text = JSON.stringify(BASE);
  assert.doesNotMatch(text, /\b(a|the) reviewer\b|A participant|their name/i);
  assert.doesNotMatch(text, LEFT_OUT);
});

test('transcript: two named speakers, timestamped, in order, nothing left in that should be out', () => {
  const t = JSON.parse(readFileSync(new URL('../src/data/meeting-pads/2026-11-20-session-page-review.transcript.json', import.meta.url), 'utf8'));
  assert.ok(t.turns.length > 100);
  const toSec = (at) => Number(at.slice(0, 2)) * 60 + Number(at.slice(3));
  let last = -1;
  for (const turn of t.turns) {
    assert.match(turn.at, /^\d{2}:\d{2}$/);
    assert.ok(['Daveed Benjamin', 'Markabadi'].includes(turn.speaker), turn.speaker);
    assert.ok(toSec(turn.at) >= last, `in order at ${turn.at}`);
    last = toSec(turn.at);
    assert.doesNotMatch(turn.text, LEFT_OUT, `left-out span at ${turn.at}`);
  }
  assert.ok(t.turns.some((x) => x.text.includes('[a passage is left out here]')));
});

test('23 Nov session lists the pad\'s process suggestions between sessions', () => {
  const nov23 = DP_ROUNDUP_EVENTS.find((e) => e.date === '2026-11-23');
  assert.deepEqual(nov23.raisedBetweenSessions, [BASE.slug]);
  const process = BASE.groups.find((g) => g.id === 'process');
  assert.equal(process.items.length, 7);
  for (const item of process.items) assert.ok(item.agendaLine && item.agendaLine.length <= 100, `item ${item.n} agenda line`);
  for (const e of DP_ROUNDUP_EVENTS.filter((x) => x.date !== '2026-11-23')) assert.deepEqual(e.raisedBetweenSessions, []);
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
