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

test('community sessions carry a specific meeting title next to the series title', async () => {
  const { SESSION_2026_11_16 } = await import('../src/data/sessions/2026-11-16.ts');
  const nov16 = DP_ROUNDUP_EVENTS.find((e) => e.date === '2026-11-16');
  assert.equal(nov16.meetingTitle, SESSION_2026_11_16.meetingTitle);
  assert.equal(nov16.meetingTitle, 'Meeting agreements: how we decide');
  assert.equal(nov16.seriesTitle, SESSION_2026_11_16.title);
  assert.equal(SESSION_2026_11_16.date, '2026-11-16');
  for (const e of DP_ROUNDUP_EVENTS.filter((x) => x.kind === 'gathering')) assert.ok(e.meetingTitle, e.date);
  const after = currentSession(new Date('2026-11-23T04:00:00Z'));
  assert.equal(after.meetingTitle, 'Ballot results and the first weekly cycle');
});

test('session labels name the meeting by date and title', async () => {
  const { meetingLabel, meetingShortDate, sessionSectionLabels } = await import('../src/lib/sessions/session-labels.ts');
  const m = { date: '2026-11-16', meetingTitle: 'Meeting agreements: how we decide', seriesTitle: 'DP Meta-Governance' };
  assert.equal(meetingShortDate(m.date), '16 Nov 2026');
  assert.equal(meetingLabel(m), 'Monday 16 Nov 2026, Meeting agreements: how we decide');
  const l = sessionSectionLabels(m);
  assert.equal(l.transcript, 'Transcript: Monday 16 Nov 2026, Meeting agreements: how we decide');
  assert.equal(l.draft, 'Meeting draft: 16 Nov 2026, Meeting agreements: how we decide, for review');
  assert.equal(l.origins, 'Origins of the voting questions');
  assert.equal(l.processText, 'How this meeting changed the process page');
});

test('every phase step links to a section; "Voting open" jumps to the vote', async () => {
  const { DEFAULT_PHASE_ANCHORS, SESSION_PHASES, phaseCallToAction } = await import('../src/lib/sessions/session-phases.ts');
  for (const p of SESSION_PHASES) assert.ok(DEFAULT_PHASE_ANCHORS[p], p);
  assert.equal(DEFAULT_PHASE_ANCHORS['Voting open'], 'vote');
  assert.equal(phaseCallToAction('Voting open', { closesLabel: 'Sun 22 Nov, 8:00 PM PT' })?.anchor, 'vote');
});

test('Deepi context for a session carries the summary, the ballot and the transcript', async () => {
  const { sessionDeepiContext } = await import('../src/lib/sessions/session-deepi-context.ts');
  const c = sessionDeepiContext({
    meeting: { date: '2026-11-16', meetingTitle: 'Meeting agreements: how we decide', seriesTitle: 'S' },
    pagePath: NOV16,
    summary: ['A summary line.'],
    ballot: BALLOT_2026_11_16,
    turns: [{ t: 3723, speaker: 'Host', text: 'Hello.' }],
  });
  assert.match(c.title, /Meeting agreements/);
  assert.match(c.text, /A summary line\./);
  assert.match(c.text, new RegExp(BALLOT_2026_11_16.questions[0].question.slice(0, 20).replace(/[?.()]/g, '\\$&')));
  assert.match(c.text, /\[01:02:03\] Host: Hello\./);
});
