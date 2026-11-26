// 23 Nov ballot: the draft's 9 questions verbatim, opening and closing by the clock at the council screening close,
// held-back questions shown and never votable, the two-tier approval rule (16 Nov ballot) for Yes/No questions and
// plurality for multiple choice, and the phase labels that follow the clock with no release at the close.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { BALLOT_2026_11_23 as DEF } from '../src/data/sessions/2026-11-23-ballot.ts';
import { BALLOT_2026_11_16 } from '../src/data/sessions/2026-11-16-ballot.ts';
import { SESSION_BALLOTS } from '../src/data/sessions/ballots.ts';
import { SESSION_2026_11_23 as SESSION } from '../src/data/sessions/2026-11-23.ts';
import {
  applyApproval,
  checkDefinition,
  effectiveStatus,
  handleBallotGet,
  handleBallotPost,
  outcomeText,
  tallyBallot,
  twoTierResult,
} from '../src/lib/ballots/ballot-core.ts';
import { applyScreening } from '../src/lib/ballots/ballot-screening-core.ts';
import { screenQuestions, screeningDefinition } from '../src/lib/screening/screening-core.ts';
import { SCREENING_HOURS, VOTING_PERIOD_HOURS } from '../src/lib/sessions/session-rules.ts';
import { phaseCallToAction, phaseNowLabel, phasePillLabel, phaseRows, draftBallotBanner } from '../src/lib/sessions/session-phases.ts';
import { currentSession } from '../src/lib/current-session.ts';

const draft = JSON.parse(readFileSync(new URL('../src/data/sessions/2026-11-23-draft.json', import.meta.url), 'utf8'));
const reviewClose = SESSION.phaseHistory.find((e) => e.phase === 'Community verification closed');
const SCREENING = screeningDefinition({
  slug: SESSION.slug,
  draftVisibleAt: SESSION.draftVisibleAt,
  reviewClosesAt: reviewClose.at,
  hours: SCREENING_HOURS,
  questions: draft.ballot.questions,
});

const BEFORE = new Date('2026-11-27T03:59:59Z');
const OPEN = new Date('2026-11-27T04:00:00Z');
const MID = new Date('2026-11-28T12:00:00Z');
const CLOSE = new Date('2026-11-30T04:00:00Z');

const objection = (id, q, name, created, withdrawn = null) => ({
  id,
  question_key: q,
  member_user_id: `gh-${id}`,
  member_name: name,
  reason: `Reason ${id}: needs more work first.`,
  created_at: created,
  withdrawn_at: withdrawn,
});

test('the 9 draft questions, verbatim: text, options with Abstain, context notes and the question 1 correction', () => {
  assert.deepEqual(checkDefinition(DEF), []);
  assert.equal(DEF.questions.length, 9);
  draft.ballot.questions.forEach((d, i) => {
    const q = DEF.questions[i];
    assert.equal(q.key, `q${d.n}`);
    assert.equal(q.n, d.n);
    assert.equal(q.question, d.question);
    assert.equal(q.context, d.context);
    assert.equal(q.correction, d.correction);
    assert.deepEqual(q.options.map((o) => o.label), d.options);
    assert.equal(q.label, d.label ?? undefined);
  });
  assert.match(DEF.questions[0].correction, /^Corrected by the host on 25 November, after the review closed/);
  assert.match(DEF.questions[0].context, /25% of the active voting body is 7 votes/);
  // Multiple choice for questions 1 and 9 (one option, as on 16 Nov); Yes/No for 2 to 8.
  assert.deepEqual(DEF.questions.map((q) => q.kind), ['choice', ...Array(7).fill('yes_no'), 'choice']);
  assert.deepEqual(DEF.questions[0].options.map((o) => o.key), ['a', 'b', 'c', 'd', 'abstain']);
  assert.deepEqual(DEF.questions[8].options.map((o) => o.key), ['a', 'b', 'abstain']);
});

test('same voter body and eligibility as 16 Nov; registered by page slug; no handles or Zoom links', () => {
  assert.equal(DEF.voterBody, BALLOT_2026_11_16.voterBody);
  assert.equal(DEF.rules[0], BALLOT_2026_11_16.rules[0]);
  assert.equal(DEF.slug, SESSION.slug);
  assert.equal(DEF.pagePath, `/events/${SESSION.slug}`);
  assert.equal(SESSION_BALLOTS[DEF.slug], DEF);
  assert.equal(SESSION_BALLOTS[BALLOT_2026_11_16.slug], BALLOT_2026_11_16);
  const text = JSON.stringify(DEF);
  assert.doesNotMatch(text, /zoom\.us|@[a-z0-9]|Laura Sanchez|constitutional/i);
});

test('window: opens at the council screening close, closes 72 hours later (voted rules)', () => {
  assert.equal(DEF.screenedBy, SCREENING.slug);
  assert.equal(DEF.opensAt, SCREENING.closesAt);
  assert.equal(DEF.opensAt, '2026-11-27T04:00:00.000Z');
  assert.equal(new Date(DEF.closesAt).getTime() - new Date(DEF.opensAt).getTime(), VOTING_PERIOD_HOURS * 3600_000);
  assert.equal(DEF.closesAt, '2026-11-30T04:00:00.000Z');
  assert.ok(DEF.rules.some((r) => r.includes(`${SCREENING_HOURS} hours after the review`)));
  assert.ok(DEF.rules.some((r) => r.startsWith(`Voting lasts ${VOTING_PERIOD_HOURS} hours`)));
  assert.equal(DEF.approval, 'two_tier');
});

test('opening and closing by the clock, with no release at the close', () => {
  assert.equal(effectiveStatus(DEF, null, new Date('2026-11-26T12:00:00Z')), 'not_open');
  assert.equal(effectiveStatus(DEF, null, BEFORE), 'not_open');
  assert.equal(effectiveStatus(DEF, null, OPEN), 'open');
  assert.equal(effectiveStatus(DEF, null, new Date('2026-11-30T03:59:59Z')), 'open');
  assert.equal(effectiveStatus(DEF, null, CLOSE), 'closed');
  // An override can only stop early or publish; it never opens before the screening close.
  assert.equal(effectiveStatus(DEF, { status: 'open', publishedAt: null }, BEFORE), 'not_open');
});

test('screening: nothing votable before the close; with no objection all 9 go to the ballot as drafted', () => {
  assert.deepEqual(applyScreening(DEF, screenQuestions(SCREENING, [], BEFORE), BEFORE), { state: 'pending' });
  const r = applyScreening(DEF, screenQuestions(SCREENING, [], OPEN), OPEN);
  assert.equal(r.state, 'ready');
  assert.equal(r.votable.questions.length, 9);
  assert.deepEqual(r.heldBack, []);
  assert.deepEqual(r.votable.questions, DEF.questions);
});

test('screening: a question with a standing objection at the close is held back with its reasons and not votable', () => {
  const rows = [
    objection('a', 'q5', 'Leandra Preston', '2026-11-26T10:00:00.000Z'),
    objection('b', 'q5', 'Phahsa', '2026-11-26T11:00:00.000Z'),
    objection('c', 'q3', 'Phahsa', '2026-11-26T09:00:00.000Z', '2026-11-26T09:30:00.000Z'), // withdrawn before the close
    objection('d', 'q8', 'Leandra Preston', '2026-11-26T12:00:00.000Z', '2026-11-27T05:00:00.000Z'), // withdrawn after: still stands
    objection('e', 'q2', 'Leandra Preston', '2026-11-27T04:00:00.000Z'), // made at the close: ignored
    objection('f', 'q4', 'Phahsa', '2026-11-28T00:00:00.000Z'), // made after the close: ignored
  ];
  const r = applyScreening(DEF, screenQuestions(SCREENING, rows, OPEN), OPEN);
  assert.equal(r.state, 'ready');
  assert.deepEqual(r.heldBack.map((h) => [h.key, h.n]), [['q5', 5], ['q8', 8]]);
  assert.deepEqual(r.heldBack[0].objections.map((o) => o.name), ['Leandra Preston', 'Phahsa']);
  assert.match(r.heldBack[0].objections[0].reason, /needs more work/);
  assert.deepEqual(r.votable.questions.map((q) => q.key), ['q1', 'q2', 'q3', 'q4', 'q6', 'q7', 'q9']);
  assert.deepEqual(r.votable.questions.map((q) => q.n), [1, 2, 3, 4, 5, 6, 7], 'renumbered for the store');
  assert.deepEqual(checkDefinition(r.votable), []);
  // Fixed at the close: the same rows read later give the same ballot.
  assert.deepEqual(applyScreening(DEF, screenQuestions(SCREENING, rows, MID), MID), r);
});

test('screening: fails closed when an outcome is missing or still pending after the close', () => {
  const partial = screenQuestions(SCREENING, [], OPEN).slice(0, 8);
  assert.throws(() => applyScreening(DEF, partial, OPEN), /no final screening outcome for q9/);
  const pending = screenQuestions(SCREENING, [], BEFORE); // outcomes computed before the close
  assert.throws(() => applyScreening(DEF, pending, OPEN), /no final screening outcome/);
});

/* ---------------- API with screening ---------------- */

const ADA = { userId: 'u-ada', username: 'ada', displayName: 'Ada' };

function deps({ now, rows = [], viewer = () => ADA, override = null, resolveFails = false }) {
  const saved = [];
  const votes = new Map();
  return {
    saved,
    votes,
    deps: {
      readSession: async () => viewer(),
      getDefinition: (slug) => (slug === DEF.slug ? DEF : null),
      getOverride: async () => override,
      resolve: async (def, at) => {
        if (resolveFails) throw new Error('Gov Hub signal rows: 503');
        return applyScreening(def, screenQuestions(SCREENING, rows, at), at);
      },
      myVotes: async (_s, uid) => Object.fromEntries([...votes].filter(([k]) => k.startsWith(`${uid}|`)).map(([k, v]) => [k.split('|')[1], v])),
      saveVotes: async (def, uid, v) => {
        saved.push(def);
        for (const [q, o] of Object.entries(v)) votes.set(`${uid}|${q}`, o);
        return { ok: true, savedAt: at(now) };
      },
      resultRows: async () => [...votes].map(([k, o]) => ({ user_id: k.split('|')[0], question_key: k.split('|')[1], option_key: o })),
      allowHit: () => true,
      now: () => now,
    },
  };
}
const at = (d) => d.toISOString();
const post = (votes) =>
  new Request(`http://x/api/ballots/${DEF.slug}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ votes }) });
const HELD_Q5 = [objection('a', 'q5', 'Leandra Preston', '2026-11-26T10:00:00.000Z')];

test('API: no vote before the screening close; at the close a signed-in account votes on the questions that went forward', async () => {
  assert.equal((await handleBallotPost(post({ q2: 'yes' }), DEF.slug, deps({ now: BEFORE }).deps)).status, 409);
  const d = deps({ now: OPEN, rows: HELD_Q5 });
  const res = await handleBallotPost(post({ q1: 'd', q2: 'yes', q9: 'b' }), DEF.slug, d.deps);
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).votes, { q1: 'd', q2: 'yes', q9: 'b' });
  assert.equal(d.saved[0].questions.length, 8, 'the store gets the votable definition only');
  assert.equal((await handleBallotPost(post({ q2: 'no' }), DEF.slug, deps({ now: CLOSE }).deps)).status, 409);
  assert.equal((await handleBallotPost(post({ q2: 'no' }), DEF.slug, deps({ now: MID, viewer: () => null }).deps)).status, 401);
});

test('API: a held-back question is refused; an unreadable screening record pauses voting (503), never "no objections"', async () => {
  const held = await handleBallotPost(post({ q5: 'yes' }), DEF.slug, deps({ now: MID, rows: HELD_Q5 }).deps);
  assert.equal(held.status, 400);
  assert.match((await held.json()).error, /Unknown question/);
  const mixed = deps({ now: MID, rows: HELD_Q5 });
  assert.equal((await handleBallotPost(post({ q4: 'yes', q5: 'no' }), DEF.slug, mixed.deps)).status, 400);
  assert.equal(mixed.votes.size, 0, 'nothing saved from a ballot that names a held-back question');
  const down = await handleBallotPost(post({ q2: 'yes' }), DEF.slug, deps({ now: MID, resolveFails: true }).deps);
  assert.equal(down.status, 503);
  assert.equal((await down.json()).code, 'unavailable');
});

test('API GET: held-back questions with reasons and the votable keys are public; no account ids', async () => {
  const body = await (await handleBallotGet(DEF.slug, deps({ now: MID, rows: HELD_Q5, viewer: () => null }).deps)).json();
  assert.equal(body.ballot.status, 'open');
  assert.deepEqual(body.ballot.questions, ['q1', 'q2', 'q3', 'q4', 'q6', 'q7', 'q8', 'q9']);
  assert.deepEqual(body.ballot.heldBack.map((h) => [h.key, h.n, h.objections[0].name]), [['q5', 5, 'Leandra Preston']]);
  assert.ok(!JSON.stringify(body).includes('gh-a'));
  const before = await (await handleBallotGet(DEF.slug, deps({ now: BEFORE }).deps)).json();
  assert.equal(before.ballot.status, 'not_open');
  assert.deepEqual(before.ballot.heldBack, []);
});

/* ---------------- counting ---------------- */

test('two-tier rule (16 Nov, question 4): 60% or more Yes passes, 50% to under 60% stays open for review, under 50% fails', () => {
  assert.equal(twoTierResult(3, 2), 'passed'); // 60%
  assert.equal(twoTierResult(59, 41), 'open_for_review');
  assert.equal(twoTierResult(1, 1), 'open_for_review'); // 50%
  assert.equal(twoTierResult(49, 51), 'not_passed');
  assert.equal(twoTierResult(0, 0), 'not_passed');
});

test('published results: two-tier for Yes/No, most votes for multiple choice, draft numbers kept with a held-back question', async () => {
  const d = deps({ now: new Date('2026-12-01T00:00:00Z'), rows: HELD_Q5, override: { status: 'published', publishedAt: '2026-11-30T18:00:00Z' } });
  // q2: 3 Yes 2 No (60%) passes; q3: 11 Yes 9 No (55%) open; q4: 2 Yes 3 No fails; q1: plurality; q9: a tie.
  const cast = { q2: ['yes', 'yes', 'yes', 'no', 'no'], q4: ['yes', 'yes', 'no', 'no', 'no'], q1: ['d', 'd', 'a', 'abstain'], q9: ['a', 'b'] };
  for (const [q, opts] of Object.entries(cast)) opts.forEach((o, i) => d.votes.set(`v${i}|${q}`, o));
  for (let i = 0; i < 20; i++) d.votes.set(`w${i}|q3`, i < 11 ? 'yes' : 'no');
  const body = await (await handleBallotGet(DEF.slug, d.deps)).json();
  const by = Object.fromEntries(body.results.questions.map((q) => [q.key, q]));
  assert.equal(by.q5, undefined, 'a held-back question has no result');
  assert.equal(by.q6.n, 6, 'draft number, not the renumbered 5');
  assert.equal(by.q2.outcome.result, 'passed');
  assert.equal(by.q3.outcome.result, 'open_for_review');
  assert.equal(outcomeText(by.q3), 'Kept open for review (11 Yes, 9 No)');
  assert.equal(by.q4.outcome.result, 'not_passed');
  assert.deepEqual(by.q1.outcome, { result: 'winner', option: 'd', label: '25% of the active voting body' });
  assert.equal(by.q9.outcome.result, 'tie');
});

test('a store that counts by plurality (Gov Hub) is re-read with the two-tier rule; 16 Nov stays plurality', () => {
  const r = tallyBallot(DEF, [
    { question_key: 'q2', option_key: 'yes', user_id: 'a' },
    { question_key: 'q2', option_key: 'no', user_id: 'b' },
  ]);
  assert.equal(r.questions.find((q) => q.key === 'q2').outcome.result, 'open_for_review');
  const plurality = { slug: DEF.slug, voters: 2, questions: [{ ...r.questions[1], outcome: { result: 'passed', yes: 1, no: 1 } }] };
  assert.equal(applyApproval(DEF, plurality).questions[0].outcome.result, 'open_for_review');
  assert.equal(applyApproval(BALLOT_2026_11_16, plurality).questions[0].outcome.result, 'passed');
});

/* ---------------- phase pill, banner and call to action follow the clock ---------------- */

const clockAt = (iso) => {
  const now = new Date(iso);
  const { current } = phaseRows(SESSION, now);
  const clock = { now, screeningClosesAt: SCREENING.closesAt, votingClosesAt: DEF.closesAt };
  return {
    current,
    pill: phasePillLabel(current, clock),
    now: phaseNowLabel(current, clock),
    cta: phaseCallToAction(current, { closesLabel: 'Sun 29 Nov', ...clock }),
    banner: draftBallotBanner(current, clock, { reviewHours: 48, votingHours: 72 }),
  };
};

test('phases: screening until the close, then voting open until Sun 29 Nov 8:00 PM PT, then closed', () => {
  assert.equal(clockAt('2026-11-26T12:00:00Z').pill, 'Council screening until Thu, Nov 26, 8:00 PM PT');
  const open = clockAt('2026-11-27T04:00:00Z');
  assert.equal(open.current, 'Voting open');
  assert.equal(open.pill, 'Voting open until Sun, Nov 29, 8:00 PM PT');
  assert.equal(open.cta.anchor, 'vote');
  assert.match(open.cta.text, /^Voting is open until/);
  assert.match(open.banner, /^Voting is open until Sunday 29 November, 8:00 PM Pacific\./);
  const closed = clockAt('2026-11-30T04:00:00Z');
  assert.equal(closed.current, 'Voting open', '"Decision recorded" needs an entry when the results are published');
  assert.equal(closed.pill, 'Voting closed: results to follow');
  // The tracker's "Now:" line reads "Now: Voting closed. Results to follow.", never "Voting open. Voting has closed."
  assert.equal(`Now: ${closed.now}. ${closed.cta.text}`, 'Now: Voting closed. Results to follow.');
  assert.equal(`Now: ${open.now}.`, 'Now: Voting open.');
  assert.equal(phaseNowLabel('Council screening', { now: CLOSE, votingClosesAt: DEF.closesAt }), 'Council screening');
  assert.match(closed.banner, /^Voting closed Sunday 29 November, 8:00 PM Pacific/);
  const entries = SESSION.phaseHistory.filter((e) => ['Ready for voting', 'Voting open'].includes(e.phase));
  assert.deepEqual(entries.map((e) => [e.phase, new Date(e.at).toISOString(), e.scheduled]), [
    ['Ready for voting', DEF.opensAt, true],
    ['Voting open', DEF.opensAt, true],
  ]);
});

test('the menu points at the 23 Nov page while its vote is open, not before it opens', () => {
  assert.equal(currentSession(new Date('2026-11-26T12:00:00Z')).href, '/roundups/2026-11-30');
  assert.equal(currentSession(new Date('2026-11-27T04:00:00Z')).href, DEF.pagePath);
  assert.equal(currentSession(new Date('2026-11-30T03:59:59Z')).href, DEF.pagePath);
  assert.equal(currentSession(new Date('2026-11-30T04:00:00Z')).href, '/roundups/2026-11-30');
});
