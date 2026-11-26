// Phase pill, call to action and draft-ballot banner for the 23 Nov session: derived from the clock, so they do not
// go stale between releases (26 Nov 2026: the pill read "Community verification closed" and the banner "pending host
// approval" while the council was screening).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SESSION_2026_11_23 as SESSION } from '../src/data/sessions/2026-11-23.ts';
import {
  draftBallotBanner,
  pacificLong,
  phaseCallToAction,
  phasePillLabel,
  phaseRows,
} from '../src/lib/sessions/session-phases.ts';
import { REVIEW_WINDOW_HOURS, SCREENING_HOURS, VOTING_PERIOD_HOURS } from '../src/lib/sessions/session-rules.ts';

const RULES = { reviewHours: REVIEW_WINDOW_HOURS, votingHours: VOTING_PERIOD_HOURS };
const reviewClosesAt = SESSION.phaseHistory.find((e) => e.phase === 'Community verification closed').at;
const screeningClosesAt = new Date(new Date(reviewClosesAt).getTime() + SCREENING_HOURS * 3600_000).toISOString();
const at = (iso) => {
  const now = new Date(iso);
  const { current } = phaseRows(SESSION, now);
  const clock = { now, screeningClosesAt };
  return {
    current,
    pill: phasePillLabel(current, clock),
    cta: phaseCallToAction(current, clock),
    banner: draftBallotBanner(current, { ...clock, reviewClosesAt }, RULES),
  };
};

test('voted windows: 48-hour review, 24-hour screening to Fri 27 Nov 04:00 UTC, 72-hour vote', () => {
  assert.equal(REVIEW_WINDOW_HOURS, 48);
  assert.equal(VOTING_PERIOD_HOURS, 72);
  assert.equal(screeningClosesAt, '2026-11-27T04:00:00.000Z');
  assert.equal(pacificLong(screeningClosesAt), 'Thursday 26 November, 8:00 PM Pacific');
});

test('during review: open for review until Wednesday 25 November', () => {
  const s = at('2026-11-25T12:00:00Z');
  assert.equal(s.current, 'Community verification open');
  assert.match(s.banner, /open for review until Wednesday 25 November, 8:00 PM Pacific/);
  assert.doesNotMatch(s.banner, /pending host approval/i);
});

test('during screening: the council is screening until Thursday 26 November, 8:00 PM Pacific', () => {
  const s = at('2026-11-26T09:30:00Z');
  assert.equal(s.current, 'Council screening');
  assert.equal(s.pill, 'Council screening until Thu, Nov 26, 8:00 PM PT');
  assert.match(s.cta.text, /interim council is screening the draft ballot until/);
  assert.equal(s.cta.anchor, 'draft-ballot');
  assert.equal(
    s.banner,
    'The community review has closed. The interim council is screening the draft ballot until Thursday 26 November, 8:00 PM Pacific; then the community votes for 72 hours.',
  );
  assert.doesNotMatch(s.banner, /pending host approval|not yet open/i);
});

test('screening closed without the vote on the clock: "ballot being prepared" (labels kept for such a session)', () => {
  const now = new Date('2026-11-27T04:00:00Z');
  const clock = { now, screeningClosesAt };
  assert.equal(phasePillLabel('Council screening', clock), 'Council screening closed: ballot being prepared');
  assert.match(phaseCallToAction('Council screening', clock).text, /has closed/);
  assert.match(
    draftBallotBanner('Council screening', { ...clock, reviewClosesAt }, RULES),
    /^Council screening closed Thursday 26 November, 8:00 PM Pacific\. Questions with no standing objection go to the ballot/,
  );
});

test('at the screening close the 23 Nov vote opens on the clock (no release needed)', () => {
  const s = at('2026-11-27T04:00:00Z');
  assert.equal(s.current, 'Voting open');
});

test('only clock phases may be scheduled: the vote opening may, a decision may not', () => {
  const bad = { ...SESSION, phaseHistory: [{ phase: 'Decision recorded', by: 'x', at: '2026-11-30T04:00:00Z', scheduled: true }] };
  assert.throws(() => phaseRows(bad, new Date()), /may be scheduled/);
});
