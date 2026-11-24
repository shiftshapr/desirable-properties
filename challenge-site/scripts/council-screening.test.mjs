// Council screening, per question: only council members object, a reason is required, the window opens and locks,
// a member withdraws their own objection (the record is kept), and the outcome per question at the close.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SESSION_2026_11_23 as SESSION } from '../src/data/sessions/2026-11-23.ts';
import {
  handleScreeningGet,
  handleScreeningPost,
  outcomeLabel,
  parseReason,
  screenQuestions,
  screeningDefinition,
  screeningStatus,
} from '../src/lib/screening/screening-core.ts';
import { SCREENING_HOURS, SCREENING_RULE } from '../src/lib/sessions/session-rules.ts';

const reviewClose = SESSION.phaseHistory.find((e) => e.phase === 'Community verification closed');
const DEF = screeningDefinition({
  slug: SESSION.slug,
  draftVisibleAt: SESSION.draftVisibleAt,
  reviewClosesAt: reviewClose.at,
  hours: SCREENING_HOURS,
  questions: [
    { n: 1, question: 'Quorum?' },
    { n: 2, question: 'Seconds?' },
    { n: 3, question: 'Plain English?' },
  ],
});
const SLUG = DEF.slug;

const LEANDRA = { userId: 'gh-leandra', name: 'Leandra Preston' };
const PHAHSA = { userId: 'gh-bitracer1', name: 'Phahsa' };
const MEMBERS = [LEANDRA, PHAHSA];

const REVIEW = () => new Date('2026-11-25T12:00:00Z');
const WINDOW = () => new Date('2026-11-26T12:00:00Z');
const AFTER = () => new Date('2026-11-27T04:00:00Z');

test('rule text and window: per question, on the session page, with a reason; 26 Nov 04:00 to 27 Nov 04:00 UTC', () => {
  assert.match(SCREENING_RULE, /per question/);
  assert.match(SCREENING_RULE, /on the session page/);
  assert.match(SCREENING_RULE, /with a reason/);
  assert.equal(DEF.opensAt, '2026-11-24T04:00:00.000Z');
  assert.equal(DEF.windowStartsAt, '2026-11-26T04:00:00.000Z');
  assert.equal(DEF.closesAt, '2026-11-27T04:00:00.000Z');
  assert.deepEqual(DEF.questions.map((q) => q.key), ['q1', 'q2', 'q3']);
});

test('status: not open before the draft is visible; objections during review and the window; closed at the close', () => {
  assert.equal(screeningStatus(DEF, new Date('2026-11-24T03:59:59Z')), 'not_open');
  assert.equal(screeningStatus(DEF, new Date('2026-11-24T04:00:00Z')), 'review');
  assert.equal(screeningStatus(DEF, new Date('2026-11-26T03:59:59Z')), 'review');
  assert.equal(screeningStatus(DEF, new Date('2026-11-26T04:00:00Z')), 'screening');
  assert.equal(screeningStatus(DEF, new Date('2026-11-27T03:59:59Z')), 'screening');
  assert.equal(screeningStatus(DEF, new Date('2026-11-27T04:00:00Z')), 'closed');
});

test('a reason is required', () => {
  assert.equal(parseReason('').ok, false);
  assert.equal(parseReason('   ').ok, false);
  assert.equal(parseReason(undefined).ok, false);
  assert.equal(parseReason('too short').ok, false);
  assert.equal(parseReason('x'.repeat(2001)).ok, false);
  assert.deepEqual(parseReason('  Two questions   in one. '), { ok: true, reason: 'Two questions in one.' });
});

/** In-memory store with the same rules as screening-store.server.ts (window, one standing per member per question). */
function fakeDeps({ viewer = () => LEANDRA, now = WINDOW } = {}) {
  const rows = [];
  let seq = 0;
  const inWindow = () => {
    const t = now().getTime();
    return t >= new Date(DEF.opensAt).getTime() && t < new Date(DEF.closesAt).getTime();
  };
  const deps = {
    readSession: async () => {
      const v = viewer();
      return v ? { userId: v.userId } : null;
    },
    getDefinition: (slug) => (slug === SLUG ? DEF : null),
    members: () => MEMBERS,
    rows: async () => rows.map((r) => ({ ...r })),
    addObjection: async (_def, member, question_key, reason) => {
      if (!inWindow()) return { ok: false, code: 'closed' };
      if (rows.some((r) => r.question_key === question_key && r.member_user_id === member.userId && !r.withdrawn_at)) {
        return { ok: false, code: 'already' };
      }
      rows.push({
        id: `id-${++seq}`,
        question_key,
        member_user_id: member.userId,
        member_name: member.name,
        reason,
        created_at: now().toISOString(),
        withdrawn_at: null,
      });
      return { ok: true };
    },
    withdrawObjection: async (_def, member, id) => {
      const r = rows.find((x) => x.id === id);
      if (!r) return { ok: false, code: 'not_found' };
      if (r.member_user_id !== member.userId) return { ok: false, code: 'not_yours' };
      if (r.withdrawn_at) return { ok: false, code: 'already_withdrawn' };
      if (!inWindow()) return { ok: false, code: 'closed' };
      r.withdrawn_at = now().toISOString();
      return { ok: true };
    },
    allowHit: () => true,
    now,
  };
  return { deps, rows };
}

const post = (body, ctype = 'application/json') =>
  new Request(`http://x/api/sessions/${SLUG}/screening`, { method: 'POST', headers: { 'content-type': ctype }, body: JSON.stringify(body) });
const object = (question, reason = 'This is two questions in one; split it.') => post({ action: 'object', question, reason });

test('only council members can object; signed out is told to sign in', async () => {
  assert.equal((await handleScreeningPost(object('q1'), SLUG, fakeDeps({ viewer: () => null }).deps)).status, 401);
  const stranger = { userId: 'gh-someone', name: 'Someone' };
  const { deps, rows } = fakeDeps({ viewer: () => stranger });
  const res = await handleScreeningPost(object('q1'), SLUG, deps);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'not_member');
  assert.equal(rows.length, 0);
  const ok = await handleScreeningPost(object('q1'), SLUG, fakeDeps().deps);
  assert.equal(ok.status, 200);
});

test('a reason is required by the API, and refusals for bad input', async () => {
  const { deps, rows } = fakeDeps();
  const noReason = await handleScreeningPost(post({ action: 'object', question: 'q1' }), SLUG, deps);
  assert.equal(noReason.status, 400);
  assert.equal((await noReason.json()).code, 'reason');
  assert.equal((await handleScreeningPost(object('q1', '   '), SLUG, deps)).status, 400);
  assert.equal(rows.length, 0);
  assert.equal((await handleScreeningPost(object('q99'), SLUG, deps)).status, 400);
  assert.equal((await handleScreeningPost(post({ action: 'nope' }), SLUG, deps)).status, 400);
  assert.equal((await handleScreeningPost(object('q1'), 'other', deps)).status, 404);
  assert.equal((await handleScreeningPost(post({ action: 'object', question: 'q1', reason: 'a good reason' }, 'text/plain'), SLUG, deps)).status, 415);
});

test('window: objections from the review opening; locked before the draft is visible and after the close', async () => {
  assert.equal((await handleScreeningPost(object('q1'), SLUG, fakeDeps({ now: REVIEW }).deps)).status, 200);
  assert.equal((await handleScreeningPost(object('q1'), SLUG, fakeDeps({ now: WINDOW }).deps)).status, 200);
  const early = await handleScreeningPost(object('q1'), SLUG, fakeDeps({ now: () => new Date('2026-11-24T03:00:00Z') }).deps);
  assert.equal(early.status, 409);
  const late = await handleScreeningPost(object('q1'), SLUG, fakeDeps({ now: AFTER }).deps);
  assert.equal(late.status, 409);
  assert.equal((await late.json()).code, 'closed');
});

test('one standing objection per member per question; withdraw own only, before the close; record kept', async () => {
  let t = WINDOW();
  const clock = () => t;
  let who = LEANDRA;
  const { deps, rows } = fakeDeps({ viewer: () => who, now: clock });
  assert.equal((await handleScreeningPost(object('q2'), SLUG, deps)).status, 200);
  assert.equal((await handleScreeningPost(object('q2'), SLUG, deps)).status, 409, 'second standing objection refused');
  const id = rows[0].id;

  who = PHAHSA;
  const notYours = await handleScreeningPost(post({ action: 'withdraw', id }), SLUG, deps);
  assert.equal(notYours.status, 403);

  who = LEANDRA;
  const res = await handleScreeningPost(post({ action: 'withdraw', id }), SLUG, deps);
  assert.equal(res.status, 200);
  const body = await res.json();
  const q2 = body.questions.find((q) => q.key === 'q2');
  assert.equal(q2.standing.length, 0);
  assert.equal(q2.withdrawn.length, 1);
  assert.equal(q2.withdrawn[0].name, 'Leandra Preston');
  assert.ok(q2.withdrawn[0].withdrawnAt);
  assert.equal(rows.length, 1, 'the row is kept, not deleted');
  assert.equal((await handleScreeningPost(post({ action: 'withdraw', id }), SLUG, deps)).status, 409);

  // Object again, then try to withdraw after the close.
  assert.equal((await handleScreeningPost(object('q2', 'Still unclear after the edit.'), SLUG, deps)).status, 200);
  t = AFTER();
  assert.equal((await handleScreeningPost(post({ action: 'withdraw', id: rows[1].id }), SLUG, deps)).status, 409);
});

test('outcome: no objection goes to the ballot; a standing objection holds it back with reasons; nobody acts, all go', () => {
  const rows = [
    { id: 'a', question_key: 'q1', member_user_id: 'gh-leandra', member_name: 'Leandra Preston', reason: 'Split it.', created_at: '2026-11-25T10:00:00Z', withdrawn_at: null },
    { id: 'b', question_key: 'q1', member_user_id: 'gh-bitracer1', member_name: 'Phahsa', reason: 'Options overlap.', created_at: '2026-11-26T10:00:00Z', withdrawn_at: null },
    { id: 'c', question_key: 'q2', member_user_id: 'gh-leandra', member_name: 'Leandra Preston', reason: 'Wrong context.', created_at: '2026-11-25T10:00:00Z', withdrawn_at: '2026-11-26T08:00:00Z' },
  ];
  const during = screenQuestions(DEF, rows, WINDOW(), 'gh-leandra');
  assert.deepEqual(during.map((q) => q.outcome), ['pending', 'pending', 'pending']);
  assert.equal(outcomeLabel(during[0]), '2 objections');
  assert.equal(outcomeLabel(during[2]), 'No objections yet');
  assert.equal(during[0].standing[0].mine, true);
  assert.equal(during[0].standing[1].mine, false);

  const final = screenQuestions(DEF, rows, AFTER());
  assert.deepEqual(final.map((q) => q.outcome), ['held_back', 'goes_to_ballot', 'goes_to_ballot']);
  assert.deepEqual(final[0].standing.map((o) => o.reason), ['Split it.', 'Options overlap.']);
  assert.equal(outcomeLabel(final[0]), 'Held back (2 objections)');
  assert.equal(outcomeLabel(final[1]), 'Goes to the ballot');
  assert.equal(final[1].withdrawn.length, 1);

  const nobody = screenQuestions(DEF, [], AFTER());
  assert.ok(nobody.every((q) => q.outcome === 'goes_to_ballot'));
});

test('GET: public objections with names and reasons, never account ids; viewer role', async () => {
  const { deps } = fakeDeps();
  await handleScreeningPost(object('q3'), SLUG, deps);
  const anon = await (await handleScreeningGet(SLUG, fakeDeps({ viewer: () => null }).deps)).json();
  assert.deepEqual(anon.viewer, { signedIn: false, member: false, name: null });
  const pub = await (await handleScreeningGet(SLUG, { ...deps, readSession: async () => null })).json();
  assert.equal(pub.questions[2].standing[0].name, 'Leandra Preston');
  assert.equal(pub.questions[2].standing[0].mine, false);
  assert.ok(!JSON.stringify(pub).includes('gh-leandra'));
  const me = await (await handleScreeningGet(SLUG, deps)).json();
  assert.deepEqual(me.viewer, { signedIn: true, member: true, name: 'Leandra Preston' });
  assert.equal(me.questions[2].standing[0].mine, true);
});
