// Proposal pads: id matching, the change in its chapter, history, related items, and the community layer handlers
// (sign-in, one stance per account, no other account's stance or id returned, names only when chosen).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  approvalsLine,
  buildProposalPad,
  fallbackTitle,
  locateChange,
  normalizePadId,
  padChatContext,
  padHref,
  padIdMatches,
} from '../src/lib/pads/proposal-pad-core.ts';
import {
  followEmail,
  handleAdvisoryPost,
  handleCommunityGet,
  handleFollowPost,
  parseAdvisory,
  statusChanges,
  tallyAdvisory,
} from '../src/lib/pads/pad-community-core.ts';
import { DECISION_RULE_COPY, padDecisionRule, padFollowEmailsOn } from '../src/lib/pads/pad-settings.ts';

const ID = '3275bc04-4415-467d-9b6a-f9ef7dfffcb8';
const PASSAGES = [
  '# DP1 – Federated Authentication & Accountability',
  '## 7. Sociotechnical Zones',
  'Zones set their own trust conditions.',
  'By treating proof of humanity as an enduring capability, DP1 enables long-term defense.',
  '## 8. Next',
];
const BASE = {
  id: ID,
  status: 'pending',
  patch_mode: 'insert_after',
  original_text: 'By treating proof of humanity as an enduring capability, DP1 enables long-term defense.',
  proposed_text: '### 7.5 Privacy-preserving community discovery\n\nParticipants should be able to discover communities.',
  rationale: 'Reconciles two proposals.',
  author_name: 'Liz Sweigart',
  created_at: '2026-10-20T00:06:41',
  review_note: 'Reopened for Version 1.1 (co-editors decide; carried by the steering committee on 11 to 12 Nov 2026)',
  applicability: 'applies',
  anchor_hash: 'abc',
  approvals: [{ user_name: 'Daveed', created_at: '2026-11-01T17:29:01' }],
};
const STEERING = [
  {
    stageKey: 'stage-1',
    stageTitle: 'Steering, Proposal review',
    analysis: {
      recommendation: 'defer',
      summary: 'Sound, but belongs elsewhere.',
      reasons: ['DP2 §7.1 already owns it.'],
      conflicts: [{ ml_number: 'ML-Draft-009' }],
      evidence: [{ doc: 'DP8' }],
    },
    outcome: { decision: 'defer', executed_at: '2026-11-11T02:27:45' },
    votes: [{ voter_name: 'Leandra Preston', decision: 'defer', created_at: '2026-11-11T02:27:29' }],
  },
];

function pad(overrides = {}, all) {
  const proposal = { ...BASE, ...overrides };
  return buildProposalPad({
    proposal,
    all: all || [proposal],
    passages: PASSAGES,
    steering: STEERING,
    dpId: 'DP1',
    docLabel: 'DP1 – Federated Authentication & Accountability',
    mlNumber: 'ML-Draft-008',
    approvalsNeeded: 2,
    mlToDp: { 'ML-Draft-009': 'DP2' },
  });
}

test('pad ids: 8-character prefix or full id; anything else is refused', () => {
  assert.equal(normalizePadId('3275BC04'), '3275bc04');
  assert.equal(normalizePadId(ID), ID);
  assert.equal(normalizePadId('3275bc'), null);
  assert.equal(normalizePadId('../etc'), null);
  assert.ok(padIdMatches('3275bc04', ID));
  assert.ok(padIdMatches(ID, ID));
  assert.ok(!padIdMatches('3275bc05', ID));
  assert.equal(padHref(ID), '/pads/proposals/3275bc04');
});

test('header: reopened marker, status and "1 of 2 co-editor approvals"', () => {
  const p = pad();
  assert.equal(p.statusLabel, 'Open');
  assert.equal(p.marker, 'reopened_v11');
  assert.equal(approvalsLine(p.approvals.length, p.approvalsNeeded), '1 of 2 co-editor approvals');
  assert.equal(fallbackTitle(p), '7.5 Privacy-preserving community discovery');
});

test('the change is placed in its chapter passage, with the section and context around it', () => {
  const p = pad();
  const loc = p.changes[0].location;
  assert.ok(loc);
  assert.equal(p.changes[0].mode, 'insert_after');
  assert.equal(loc.start, 3);
  assert.equal(loc.section, '7. Sociotechnical Zones');
  assert.equal(loc.contextBefore, 'Zones set their own trust conditions.');
  assert.equal(loc.exact.match, BASE.original_text);
  assert.equal(p.anchorGone, false);
  const inBlock = locateChange(PASSAGES, 'their own trust');
  assert.deepEqual(inBlock.exact, { pre: 'Zones set ', match: 'their own trust', post: ' conditions.' });
});

test('an anchor that is not in the chapter, or that Gov Hub flags, reads as needing re-anchoring', () => {
  assert.equal(pad({ original_text: 'Text that was removed in revision 05.' }).anchorGone, true);
  assert.equal(pad({ original_text: 'Text that was removed in revision 05.' }).changes[0].location, null);
  assert.equal(pad({ applicability: 'needs-review' }).anchorGone, true);
});

test('bundles show every edit in its place; a deletion has empty proposed text', () => {
  const p = pad({
    patch_mode: 'dedup_bundle',
    edits: [
      { seq: 2, original_text: 'Zones set their own trust conditions.', proposed_text: '', note: 'Said twice' },
      { seq: 1, original_text: 'Gone text', proposed_text: 'x' },
    ],
  });
  assert.equal(p.bundle, true);
  assert.equal(p.kindLabel, 'Duplicate-text cleanup (2 edits)');
  assert.equal(p.changes[0].original, 'Gone text');
  assert.equal(p.changes[0].location, null);
  assert.equal(p.changes[1].proposed, '');
  assert.equal(p.changes[1].location.start, 2);
  assert.equal(p.anchorGone, true);
});

test('history: filed, approvals, steering votes and outcome, reopen, in date order; the revised_from chain', () => {
  const older = { ...BASE, id: 'aaaaaaaa-0000-4000-8000-000000000000', status: 'considered', created_at: '2026-10-01T00:00:00', approvals: [] };
  const p = pad({ revised_from_id: older.id, revised_by_name: 'Michelle Thuo' }, [older, { ...BASE, revised_from_id: older.id, revised_by_name: 'Michelle Thuo' }]);
  const texts = p.history.map((h) => h.text);
  assert.deepEqual(texts, [
    'Earlier version filed by Liz Sweigart',
    'Revised version filed by Michelle Thuo, credited to Liz Sweigart',
    'Approved by Daveed (co-editor)',
    'Steering, Proposal review: Leandra Preston voted to carry to Version 1.1',
    'Steering committee carried it to Version 1.1',
    'Reopened for Version 1.1: the co-editors decide it',
  ]);
  assert.equal(p.history[0].href, '/pads/proposals/aaaaaaaa');
  assert.equal(p.related[0].relation, 'Earlier version');
});

test('the six re-homed proposals say so; DPs touched come from the steering analysis', () => {
  const p = pad({ id: '981f8156-a8a2-4178-bd0e-18d5feaa1490', review_note: null });
  assert.equal(p.rehomed, true);
  assert.equal(p.marker, null);
  assert.ok(p.history.some((h) => h.text.startsWith('Moved onto the current chapter')));
  assert.deepEqual(pad().dpsTouched, ['DP1', 'DP2', 'DP8']);
  assert.equal(pad().steering.summary, 'Sound, but belongs elsewhere.');
});

test('related: other proposals on the same passage', () => {
  const twin = { ...BASE, id: 'bbbbbbbb-0000-4000-8000-000000000000', status: 'declined', proposed_text: 'Another idea' };
  const p = pad({}, [{ ...BASE }, twin]);
  assert.deepEqual(p.related.map((r) => [r.shortId, r.relation]), [['bbbbbbbb', 'Same passage']]);
});

test('chat context carries the proposal, passage, rationale and record', () => {
  const ctx = padChatContext(pad(), 'Add discovery', 'A summary.');
  for (const s of ['# Proposal pad: Add discovery', 'Inserted below this passage', 'Reconciles two proposals.', 'Sound, but belongs elsewhere.', '1 of 2 co-editor approvals']) {
    assert.ok(ctx.includes(s), s);
  }
});

test('settings: co-editors decide by default; follow emails only when switched on', () => {
  assert.equal(padDecisionRule(undefined), 'co_editors');
  assert.equal(padDecisionRule('community_vote'), 'community_vote');
  assert.equal(DECISION_RULE_COPY.co_editors.badge, 'Advisory: co-editors decide.');
  assert.equal(padFollowEmailsOn(undefined), false);
  assert.equal(padFollowEmailsOn('on'), true);
});

test('advisory input: support, concern or clear; one line, capped', () => {
  assert.deepEqual(parseAdvisory({ stance: 'clear' }), { ok: true, clear: true });
  assert.equal(parseAdvisory({ stance: 'maybe' }).ok, false);
  const r = parseAdvisory({ stance: 'support', reason: ' good\n idea '.repeat(50), showName: 'yes' });
  assert.equal(r.reason.includes('\n'), false);
  assert.ok(r.reason.length <= 200);
  assert.equal(r.showName, false);
});

test('tally: counts and reasons; names only for voters who chose to show them; no user ids', () => {
  const t = tallyAdvisory([
    { user_id: 'u1', stance: 'support', reason: 'Clear win', show_name: true, display_name: 'Ada', updated_at: '2026-11-21T01:00:00Z' },
    { user_id: 'u2', stance: 'concern', reason: 'Belongs in DP2', show_name: false, display_name: 'Bob', updated_at: '2026-11-21T02:00:00Z' },
    { user_id: 'u3', stance: 'support', reason: null, show_name: false, display_name: 'Cy', updated_at: '2026-11-21T03:00:00Z' },
  ]);
  assert.equal(t.support, 2);
  assert.equal(t.concern, 1);
  assert.deepEqual(t.reasons.map((r) => r.name), [null, 'Ada']);
  assert.ok(!JSON.stringify(t).includes('u1') && !JSON.stringify(t).includes('Bob'));
});

function fakeDeps(session) {
  const rows = new Map();
  const follows = new Map();
  return {
    rows,
    follows,
    deps: {
      readSession: async () => session,
      resolvePad: async (raw) => (padIdMatches(raw, ID) ? { id: ID, status: 'pending', mlNumber: 'ML-Draft-008', dpId: 'DP1' } : null),
      advisoryRows: async () => [...rows.values()],
      saveAdvisory: async (_k, _id, s, v) => {
        if (!v) rows.delete(s.userId);
        else rows.set(s.userId, { user_id: s.userId, stance: v.stance, reason: v.reason, show_name: v.showName, display_name: s.displayName, updated_at: new Date().toISOString() });
      },
      isFollowing: async (_k, _id, uid) => follows.has(uid),
      setFollow: async (_k, _p, s, on) => (on ? follows.set(s.userId, true) : follows.delete(s.userId)),
      allowHit: () => true,
    },
  };
}

test('handlers: signed-out readers see counts but cannot vote or follow', async () => {
  const { deps } = fakeDeps(null);
  assert.equal((await handleAdvisoryPost(deps, '3275bc04', { stance: 'support' })).status, 401);
  assert.equal((await handleFollowPost(deps, '3275bc04', {})).status, 401);
  const g = await handleCommunityGet(deps, '3275bc04');
  assert.equal(g.status, 200);
  assert.equal(g.body.signedIn, false);
  assert.equal(g.body.mine, null);
  assert.equal((await handleCommunityGet(deps, 'deadbeef')).status, 404);
});

test('handlers: one stance per account, changeable and removable; follow toggles', async () => {
  const ada = { userId: 'u-ada', displayName: 'Ada', username: 'ada', email: 'ada@example.org' };
  const { deps, rows } = fakeDeps(ada);
  await handleAdvisoryPost(deps, '3275bc04', { stance: 'support', reason: 'Yes' });
  const r = await handleAdvisoryPost(deps, '3275bc04', { stance: 'concern', reason: 'On reflection' });
  assert.equal(rows.size, 1);
  assert.deepEqual(r.body.mine, { stance: 'concern', reason: 'On reflection', showName: false });
  assert.equal(r.body.tally.concern, 1);
  await handleAdvisoryPost(deps, '3275bc04', { stance: 'clear' });
  assert.equal(rows.size, 0);
  assert.equal((await handleFollowPost(deps, '3275bc04', { follow: true })).body.following, true);
  assert.equal((await handleCommunityGet(deps, '3275bc04')).body.following, true);
  assert.equal((await handleFollowPost(deps, '3275bc04', { follow: false })).body.following, false);
  const noEmail = fakeDeps({ ...ada, email: null });
  assert.equal((await handleFollowPost(noEmail.deps, '3275bc04', {})).status, 409);
});

test('follow sweep: only changed statuses; the email carries the unsubscribe link', () => {
  const f = { pad_id: ID, user_id: 'u', email: 'a@b.c', display_name: 'Ada', ml_number: 'ML-Draft-008', dp_id: 'DP1', last_status: 'pending' };
  assert.deepEqual(statusChanges([f], new Map([[ID, { status: 'pending' }]])), []);
  const changes = statusChanges([f], new Map([[ID, { status: 'incorporated' }]]));
  assert.equal(changes.length, 1);
  assert.equal(changes[0].to, 'incorporated');
  const mail = followEmail({
    padUrl: 'https://desirableproperties.org/pads/proposals/3275bc04',
    unsubscribeUrl: 'https://desirableproperties.org/api/broadcast/unsubscribe?token=t0k',
    padTitle: 'Add discovery',
    docLabel: 'DP1',
    to: 'incorporated',
    name: 'Ada',
  });
  assert.match(mail.subject, /now incorporated into the chapter/);
  assert.ok(mail.html.includes('/api/broadcast/unsubscribe?token=t0k'));
  assert.ok(mail.text.includes('/api/broadcast/unsubscribe?token=t0k'));
});
