// Current session: a session whose ballot is still open stays current; then the next upcoming session takes over.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentSession, sessionWithOpenBallot } from '../src/lib/current-session.ts';
import { DP_ROUNDUP_EVENTS } from '../src/lib/dp-roundups.ts';
import { BALLOT_2026_11_16 } from '../src/data/sessions/2026-11-16-ballot.ts';

const NOV16 = '/events/meta-governance-2026-11-16';

test('the four DP Listening Experiment sessions are scheduled, 10:00–11:30 PT, with their Luma pages', () => {
  const le = DP_ROUNDUP_EVENTS.filter((e) => e.title.startsWith('DP Listening Experiment'));
  assert.deepEqual(le.map((e) => [e.date, e.title, e.lumaUrl, e.href]), [
    ['2026-11-23', 'DP Listening Experiment 1/4: Creating a Living Book Together', 'https://luma.com/nqyu7j5r', '/roundups/2026-11-23'],
    ['2026-11-30', 'DP Listening Experiment 2/4: Creating a Living Book Together', 'https://luma.com/gra1xda9', '/roundups/2026-11-30'],
    ['2026-12-07', 'DP Listening Experiment 3/4: Creating a Living Book Together', 'https://luma.com/ihn1dfw9', '/roundups/2026-12-07'],
    ['2026-12-14', 'DP Listening Experiment 4/4: Creating a Living Book Together', 'https://luma.com/pt5uhcqz', '/roundups/2026-12-14'],
  ]);
  for (const e of le) {
    assert.equal(e.kind, 'gathering');
    assert.equal(new Date(e.startsAt).toISOString(), `${e.date}T18:00:00.000Z`);
    assert.equal(new Date(e.endsAt).toISOString(), `${e.date}T19:30:00.000Z`);
    assert.doesNotMatch(e.details ?? '', /zoom\.us/i);
  }
});

test('16 Nov stays current while its ballot is open, then 23 Nov takes over', () => {
  assert.equal(BALLOT_2026_11_16.closesAt, '2026-11-23T04:00:00.000Z');
  assert.equal(currentSession(new Date('2026-11-16T17:00:00Z')).href, NOV16); // before it starts: next upcoming
  assert.equal(currentSession(new Date('2026-11-19T21:00:00Z')).href, NOV16); // voting open
  const last = currentSession(new Date('2026-11-23T03:59:59Z'));
  assert.equal(last.href, NOV16);
  assert.equal(last.upcoming, false);
  const after = currentSession(new Date('2026-11-23T04:00:00Z'));
  assert.equal(after.href, '/roundups/2026-11-23');
  assert.equal(after.title, 'DP Listening Experiment 1/4: Creating a Living Book Together');
  assert.equal(after.upcoming, true);
  assert.equal(currentSession(new Date('2026-11-23T19:31:00Z')).href, '/roundups/2026-11-30');
  const end = currentSession(new Date('2027-01-01T00:00:00Z'));
  assert.equal(end.href, '/roundups/2026-12-14');
  assert.equal(end.upcoming, false);
});

test('with no ballots, the next unended session is current', () => {
  assert.equal(currentSession(new Date('2026-11-19T21:00:00Z'), { ballots: [] }).href, '/roundups/2026-11-23');
});

test('a ballot only holds a session that has started; the latest such session wins', () => {
  const sessions = DP_ROUNDUP_EVENTS.filter((e) => e.kind === 'gathering');
  const ballots = [{ pagePath: NOV16, closesAt: '2026-12-31T00:00:00Z' }];
  assert.equal(sessionWithOpenBallot(sessions, new Date('2026-11-15T00:00:00Z'), ballots), undefined);
  assert.equal(sessionWithOpenBallot(sessions, new Date('2026-12-20T00:00:00Z'), ballots)?.pageHref, NOV16);
});
