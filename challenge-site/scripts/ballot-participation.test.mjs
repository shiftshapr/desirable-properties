// Voter participation (src/lib/ballots/participation-core.ts): non-abstain counts, weekly streaks, the opt-out, and
// no vote choice in anything public.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { participation, publicParticipation, streaks } from '../src/lib/ballots/participation-core.ts';

const B = [
  { slug: 'w1', closesAt: '2026-11-23T04:00:00.000Z' },
  { slug: 'w2', closesAt: '2026-11-30T04:00:00.000Z' },
  // No ballot in the week of 7 Dec.
  { slug: 'w4', closesAt: '2026-12-14T04:00:00.000Z' },
  { slug: 'w5', closesAt: '2026-12-21T04:00:00.000Z' }, // still open at NOW
];
const NOW = new Date('2026-12-15T00:00:00Z');

/** Rows as the SQL produces them, from raw votes: count of option_key <> 'abstain' per ballot and account. */
function aggregate(votes) {
  const m = new Map();
  for (const v of votes) {
    const k = `${v.ballot_slug}|${v.user_id}`;
    m.set(k, (m.get(k) ?? 0) + (v.option_key === 'abstain' ? 0 : 1));
  }
  return [...m].map(([k, n]) => ({ ballot_slug: k.split('|')[0], user_id: k.split('|')[1], non_abstain: n }));
}

test('non-abstain votes: abstain choices and skipped questions do not count', () => {
  const votes = [
    ...Array.from({ length: 15 }, (_, i) => ({ ballot_slug: 'w1', user_id: 'ada', question_key: `q${i + 1}`, option_key: 'a' })),
    { ballot_slug: 'w1', user_id: 'bob', question_key: 'q1', option_key: 'yes' },
    { ballot_slug: 'w1', user_id: 'bob', question_key: 'q2', option_key: 'abstain' },
    { ballot_slug: 'w1', user_id: 'bob', question_key: 'q3', option_key: 'abstain' },
    // bob skipped q4 to q15
    { ballot_slug: 'w1', user_id: 'cy', question_key: 'q1', option_key: 'abstain' },
  ];
  const by = Object.fromEntries(participation(B, aggregate(votes), NOW).map((v) => [v.userId, v]));
  assert.equal(by.ada.nonAbstain, 15);
  assert.equal(by.bob.nonAbstain, 1);
  assert.equal(by.cy.nonAbstain, 0);
  assert.equal(by.cy.ballots.length, 1, 'an all-abstain ballot is still a ballot voted');
  assert.equal(by.cy.currentStreak, 0, 'but it does not count toward a streak');
});

test('streaks: a week without a ballot does not break it; a missed ballot does; open ballots are not counted yet', () => {
  assert.deepEqual(streaks(['w1', 'w2', 'w4'], new Set(['w1', 'w2', 'w4'])), { current: 3, longest: 3 });
  assert.deepEqual(streaks(['w1', 'w2', 'w4'], new Set(['w1', 'w4'])), { current: 1, longest: 1 });
  assert.deepEqual(streaks(['w1', 'w2', 'w4'], new Set(['w1', 'w2'])), { current: 0, longest: 2 });
  assert.deepEqual(streaks([], new Set()), { current: 0, longest: 0 });
  const rows = [
    { ballot_slug: 'w1', user_id: 'ada', non_abstain: 3 },
    { ballot_slug: 'w2', user_id: 'ada', non_abstain: 1 },
    { ballot_slug: 'w4', user_id: 'ada', non_abstain: 2 },
    { ballot_slug: 'w5', user_id: 'ada', non_abstain: 9 },
    { ballot_slug: 'nope', user_id: 'ada', non_abstain: 9 },
  ];
  const [ada] = participation(B, rows, NOW);
  assert.equal(ada.currentStreak, 3);
  assert.equal(ada.longestStreak, 3);
  assert.equal(ada.ballots.length, 4, 'the open ballot is listed as voted on, the unknown slug is ignored');
  assert.equal(ada.nonAbstain, 15);
});

test('a second account merges into the person: one voter, counts not doubled', () => {
  const rows = [
    { ballot_slug: 'w1', user_id: 'main', non_abstain: 15 },
    { ballot_slug: 'w1', user_id: 'alt', non_abstain: 12 },
  ];
  const v = participation(B, rows, NOW, { alt: 'main' });
  assert.equal(v.length, 1);
  assert.equal(v[0].nonAbstain, 15);
});

test('opt-out hides the name; hidden and unnamed voters are counted as others; sorted by streak then votes', () => {
  const rows = [
    { ballot_slug: 'w1', user_id: 'ada', non_abstain: 10 },
    { ballot_slug: 'w1', user_id: 'bob', non_abstain: 15 },
    { ballot_slug: 'w2', user_id: 'ada', non_abstain: 1 },
    { ballot_slug: 'w4', user_id: 'ada', non_abstain: 1 },
    { ballot_slug: 'w1', user_id: 'cy', non_abstain: 15 },
    { ballot_slug: 'w1', user_id: 'dee', non_abstain: 15 },
  ];
  const names = { ada: 'Ada Lovelace', bob: 'Bob Moses', cy: 'Cy Twombly' };
  const p = publicParticipation(participation(B, rows, NOW), (id) => names[id] ?? null, new Set(['cy']));
  assert.equal(p.voters, 4);
  assert.deepEqual(p.listed.map((v) => v.name), ['Ada Lovelace', 'Bob Moses']);
  assert.equal(p.others, 2);
  assert.ok(!JSON.stringify(p).includes('Cy Twombly'));
});

test('no vote choice or account id in the public list, and the SQL only aggregates', () => {
  const p = publicParticipation(participation(B, [{ ballot_slug: 'w1', user_id: 'ada', non_abstain: 2 }], NOW), () => 'Ada Lovelace', new Set());
  for (const v of p.listed) assert.deepEqual(Object.keys(v).sort(), ['ballots', 'currentStreak', 'longestStreak', 'name', 'nonAbstain']);
  assert.deepEqual(Object.keys(p).sort(), ['listed', 'others', 'voters']);
  const server = readFileSync(new URL('../src/lib/ballots/participation.server.ts', import.meta.url), 'utf8');
  const selects = server.match(/SELECT[^`']*/g) ?? [];
  for (const s of selects) assert.ok(!/\boption_key\b(?!\s*<>)/.test(s.replace(/FILTER \(WHERE option_key <> 'abstain'\)/, '')), `selects a choice: ${s}`);
  const page = readFileSync(new URL('../src/app/pads/ballot-options/page.tsx', import.meta.url), 'utf8');
  assert.ok(!/myVotes|option_key|ballotVoteRows/.test(page));
  const api = readFileSync(new URL('../src/app/api/me/participation/route.ts', import.meta.url), 'utf8');
  assert.ok(!/option_key|myVotes/.test(api));
});
