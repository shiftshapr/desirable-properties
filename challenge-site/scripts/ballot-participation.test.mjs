// Voter participation (src/lib/ballots/participation-core.ts): ballots voted, weekly streaks, the opt-out, and no
// vote choice in anything public. Owner 25 Nov 2026 (pad votes D5): no non-abstain counts, so an all-Abstain ballot
// counts like any other and nothing public says how anyone voted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { participation, participationLine, publicParticipation, streaks } from '../src/lib/ballots/participation-core.ts';

const B = [
  { slug: 'w1', closesAt: '2026-11-23T04:00:00.000Z' },
  { slug: 'w2', closesAt: '2026-11-30T04:00:00.000Z' },
  // No ballot in the week of 7 Dec.
  { slug: 'w4', closesAt: '2026-12-14T04:00:00.000Z' },
  { slug: 'w5', closesAt: '2026-12-21T04:00:00.000Z' }, // still open at NOW
];
const NOW = new Date('2026-12-15T00:00:00Z');
const row = (ballot_slug, user_id) => ({ ballot_slug, user_id });

test('an all-Abstain ballot counts toward the streak like any other', () => {
  const v = participation(B, [row('w1', 'cy'), row('w2', 'cy')], NOW);
  assert.equal(v[0].currentStreak, 0); // did not vote on w4, the most recent closed ballot
  assert.equal(v[0].longestStreak, 2);
});

test('streaks: weeks without a ballot never break a streak; open ballots do not count yet', () => {
  assert.deepEqual(streaks(['w1', 'w2', 'w4'], new Set(['w1', 'w2', 'w4'])), { current: 3, longest: 3 });
  const [ada] = participation(B, [row('w1', 'ada'), row('w2', 'ada'), row('w4', 'ada'), row('w5', 'ada'), row('nope', 'ada')], NOW);
  assert.deepEqual(ada.ballots.map((b) => b.slug), ['w1', 'w2', 'w4', 'w5']);
  assert.equal(ada.currentStreak, 3);
});

test('a merged second account counts once', () => {
  const v = participation(B, [row('w1', 'main'), row('w1', 'alt')], NOW, { alt: 'main' });
  assert.equal(v.length, 1);
  assert.equal(v[0].ballots.length, 1);
});

test('public list: real names only, the opt-out, sorted by streak then ballots then name', () => {
  const rows = [row('w1', 'ada'), row('w1', 'bob'), row('w2', 'ada'), row('w4', 'ada'), row('w4', 'bob'), row('w1', 'cy'), row('w1', 'dee')];
  const names = { ada: 'Ada Lovelace', bob: 'Bob Moses', cy: 'Cy Twombly' };
  const p = publicParticipation(participation(B, rows, NOW), (id) => names[id] ?? null, new Set(['cy']));
  assert.equal(p.voters, 4);
  assert.deepEqual(p.listed.map((v) => v.name), ['Ada Lovelace', 'Bob Moses']);
  assert.equal(p.others, 2);
  assert.ok(!JSON.stringify(p).includes('Cy Twombly'));
  assert.equal(participationLine(p.listed[0]), 'Voted on 3 ballots · weekly streak 3 (longest 3)');
});

test('no vote choice or account id in the public list, and the SQL never reads a choice', () => {
  const p = publicParticipation(participation(B, [row('w1', 'ada')], NOW), () => 'Ada Lovelace', new Set());
  for (const v of p.listed) assert.deepEqual(Object.keys(v).sort(), ['ballots', 'currentStreak', 'longestStreak', 'name']);
  assert.deepEqual(Object.keys(p).sort(), ['listed', 'others', 'voters']);
  const server = readFileSync(new URL('../src/lib/ballots/participation.server.ts', import.meta.url), 'utf8');
  const selects = server.match(/SELECT[^`']*/g) ?? [];
  for (const s of selects) assert.ok(!/\boption_key\b/.test(s), `selects a choice: ${s}`);
  const page = readFileSync(new URL('../src/app/pads/ballot-options/page.tsx', import.meta.url), 'utf8');
  assert.ok(!/myVotes|option_key|ballotVoteRows|non-abstain/i.test(page));
  const api = readFileSync(new URL('../src/app/api/me/participation/route.ts', import.meta.url), 'utf8');
  assert.ok(!/option_key|myVotes/.test(api));
});
