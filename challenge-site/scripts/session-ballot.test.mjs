// Session ballot: definition, count rules, and the API handlers (sign-in, open window, no other account's choices).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BALLOT_2026_11_16 as DEF } from '../src/data/sessions/2026-11-16-ballot.ts';
import {
  checkDefinition,
  effectiveStatus,
  handleBallotGet,
  handleBallotPost,
  parseVotes,
  tallyBallot,
} from '../src/lib/ballots/ballot-core.ts';

const SLUG = DEF.slug;
const ADA = { userId: 'u-ada', username: 'ada', displayName: 'Ada' };
const BOB = { userId: 'u-bob', username: 'bob', displayName: 'Bob' };

test('16 Nov ballot: 15 questions, every one with Abstain, closes 23 Nov 04:00 UTC', () => {
  assert.deepEqual(checkDefinition(DEF), []);
  assert.equal(DEF.questions.length, 15);
  assert.equal(DEF.closesAt, '2026-11-23T04:00:00.000Z');
  assert.match(DEF.questions[9].question, /Daveed Benjamin, Leandra Preston, Michelle Thuo, Phahsa and Renad Baomar/);
  assert.equal(DEF.questions[3].options.length, 6);
});

test('effective status: window from the definition; override can stop early or publish, never open', () => {
  assert.equal(effectiveStatus(DEF, null, new Date('2026-11-19T19:59:59Z')), 'not_open');
  assert.equal(effectiveStatus(DEF, null, new Date('2026-11-19T20:00:00Z')), 'open');
  assert.equal(effectiveStatus(DEF, null, new Date('2026-11-23T03:59:59Z')), 'open');
  assert.equal(effectiveStatus(DEF, null, new Date('2026-11-23T04:00:00Z')), 'closed');
  assert.equal(effectiveStatus(DEF, { status: 'closed', publishedAt: null }, new Date('2026-11-21T00:00:00Z')), 'closed');
  assert.equal(effectiveStatus(DEF, { status: 'closed', publishedAt: null }, new Date('2026-11-18T00:00:00Z')), 'not_open');
  assert.equal(effectiveStatus(DEF, { status: 'published', publishedAt: 'x' }, new Date('2026-11-24T00:00:00Z')), 'published');
});

test('parseVotes refuses unknown questions and options', () => {
  assert.equal(parseVotes(DEF, { votes: { q1: 'yes', q4: 'e' } }).ok, true);
  assert.equal(parseVotes(DEF, { votes: { q99: 'yes' } }).ok, false);
  assert.equal(parseVotes(DEF, { votes: { q1: 'maybe' } }).ok, false);
  assert.equal(parseVotes(DEF, { votes: {} }).ok, false);
  assert.equal(parseVotes(DEF, null).ok, false);
});

test('tally: Yes/No needs more Yes than No; abstain does not decide; plurality and ties', () => {
  const rows = [
    { question_key: 'q1', option_key: 'yes', user_id: 'a' },
    { question_key: 'q1', option_key: 'no', user_id: 'b' },
    { question_key: 'q1', option_key: 'abstain', user_id: 'c' },
    { question_key: 'q1', option_key: 'abstain', user_id: 'd' },
    { question_key: 'q9', option_key: 'yes', user_id: 'a' },
    { question_key: 'q9', option_key: 'abstain', user_id: 'b' },
    { question_key: 'q3', option_key: 'a', user_id: 'a' },
    { question_key: 'q3', option_key: 'b', user_id: 'b' },
    { question_key: 'q4', option_key: 'abstain', user_id: 'a' },
    { question_key: 'q4', option_key: 'abstain', user_id: 'b' },
    { question_key: 'q4', option_key: 'd', user_id: 'c' },
  ];
  const r = tallyBallot(DEF, rows);
  const by = Object.fromEntries(r.questions.map((x) => [x.key, x]));
  assert.equal(r.voters, 4);
  assert.equal(by.q1.outcome.result, 'not_passed');
  assert.equal(by.q1.abstain, 2);
  assert.equal(by.q9.outcome.result, 'passed');
  assert.equal(by.q3.outcome.result, 'tie');
  assert.equal(by.q4.outcome.result, 'winner');
  assert.equal(by.q4.outcome.option, 'd');
  assert.equal(by.q2.outcome.result, 'no_votes');
});

const OPEN_NOW = () => new Date('2026-11-21T00:00:00Z');

function fakeDeps({ viewer = () => ADA, override = null, now = OPEN_NOW } = {}) {
  const votes = new Map(); // `${user}|${q}` -> option
  const deps = {
    readSession: async () => viewer(),
    getDefinition: (slug) => (slug === SLUG ? DEF : null),
    getOverride: async () => override,
    myVotes: async (_s, uid) => {
      const out = {};
      for (const [k, v] of votes) {
        const [u, q] = k.split('|');
        if (u === uid) out[q] = v;
      }
      return out;
    },
    saveVotes: async (_def, uid, v) => {
      for (const [q, o] of Object.entries(v)) votes.set(`${uid}|${q}`, o);
      return { ok: true, savedAt: '2026-11-21T00:00:00.000Z' };
    },
    resultRows: async () => [...votes].map(([k, o]) => ({ user_id: k.split('|')[0], question_key: k.split('|')[1], option_key: o })),
    allowHit: () => true,
    now,
  };
  return { deps, votes };
}

const post = (body, ctype = 'application/json') =>
  new Request('http://x/api/ballots/' + SLUG, { method: 'POST', headers: { 'content-type': ctype }, body: JSON.stringify(body) });

test('POST: any signed-in account votes, changes a vote, reads back only its own', async () => {
  const { deps, votes } = fakeDeps({ viewer: () => BOB });
  votes.set('u-ada|q1', 'no');
  let res = await handleBallotPost(post({ votes: { q1: 'yes', q2: 'a' } }), SLUG, deps);
  assert.equal(res.status, 200);
  res = await handleBallotPost(post({ votes: { q1: 'abstain' } }), SLUG, deps);
  const body = await res.json();
  assert.deepEqual(body.votes, { q1: 'abstain', q2: 'a' });
  const get = await (await handleBallotGet(SLUG, deps)).json();
  assert.equal(get.ballot.status, 'open');
  assert.deepEqual(get.viewer, { signedIn: true, votes: { q1: 'abstain', q2: 'a' } });
  assert.equal(get.results, null, 'no totals before publish');
  assert.ok(!JSON.stringify(get).includes('u-ada'));
});

test('POST refusals: signed out, before open, after close, stopped early, not JSON, bad option, unknown ballot', async () => {
  const v = { votes: { q1: 'yes' } };
  assert.equal((await handleBallotPost(post(v), SLUG, fakeDeps({ viewer: () => null }).deps)).status, 401);
  assert.equal((await handleBallotPost(post(v), SLUG, fakeDeps({ now: () => new Date('2026-11-19T19:00:00Z') }).deps)).status, 409);
  assert.equal((await handleBallotPost(post(v), SLUG, fakeDeps({ now: () => new Date('2026-11-23T04:00:01Z') }).deps)).status, 409);
  assert.equal((await handleBallotPost(post(v), SLUG, fakeDeps({ override: { status: 'closed', publishedAt: null } }).deps)).status, 409);
  assert.equal((await handleBallotPost(post(v, 'text/plain'), SLUG, fakeDeps().deps)).status, 415);
  assert.equal((await handleBallotPost(post({ votes: { q1: 'z' } }), SLUG, fakeDeps().deps)).status, 400);
  assert.equal((await handleBallotPost(post(v), 'other', fakeDeps().deps)).status, 404);
});

test('GET: signed out sees status only; published shows totals', async () => {
  const out = await (await handleBallotGet(SLUG, fakeDeps({ viewer: () => null }).deps)).json();
  assert.deepEqual(out.viewer, { signedIn: false, votes: {} });
  const { deps, votes } = fakeDeps({ override: { status: 'published', publishedAt: '2026-11-23T05:00:00Z' } });
  votes.set('u-ada|q1', 'yes');
  const pub = await (await handleBallotGet(SLUG, deps)).json();
  assert.equal(pub.results.voters, 1);
  assert.equal(pub.results.questions[0].outcome.result, 'passed');
});

// Gov Hub as the store of record (PAD_VOTES_BACKEND=govhub; handoff/specs/pad-votes-govhub-api.md).

test('Gov Hub: an outage extension moves the close later; the status follows it', () => {
  const extended = { status: 'open', publishedAt: null, closesAt: '2026-11-23T06:00:00.000Z' };
  assert.equal(effectiveStatus(DEF, extended, new Date('2026-11-23T05:00:00Z')), 'open');
  assert.equal(effectiveStatus(DEF, extended, new Date('2026-11-23T06:00:00Z')), 'closed');
});

test('Gov Hub: an unreachable store fails closed with 503 and the plain message', async () => {
  const { deps } = fakeDeps();
  deps.saveVotes = async () => ({ ok: false, code: 'unavailable' });
  const res = await handleBallotPost(post({ votes: { q1: 'yes' } }), SLUG, deps);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.code, 'unavailable');
  assert.match(body.error, /Your vote was not recorded/);
});

test('Gov Hub: published results come from the store count, not from vote rows', async () => {
  const counted = { slug: SLUG, voters: 24, questions: [] };
  const { deps } = fakeDeps({ override: { status: 'published', publishedAt: '2026-11-24T00:00:00Z' }, now: () => new Date('2026-11-25T00:00:00Z') });
  deps.resultRows = async () => {
    throw new Error('must not read vote rows');
  };
  deps.results = async () => counted;
  const body = await (await handleBallotGet(SLUG, deps)).json();
  assert.deepEqual(body.results, counted);
});
