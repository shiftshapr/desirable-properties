// Proposals for the next session: anyone signed in proposes with a real name, others support (not their own),
// the proposer withdraws, a council member hides with a reason, and everything closes when the session starts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  handleProposalsGet,
  handleProposalsPost,
  nextSession,
  parseName,
  parseProposal,
  prefillName,
  toPublic,
} from '../src/lib/next-proposals/core.ts';

const S30 = { date: '2026-11-30', title: 'Book club', startsAt: '2026-11-30T18:00:00Z', href: '/roundups/2026-11-30' };
const S07 = { date: '2026-12-07', title: 'Next', startsAt: '2026-12-07T18:00:00Z', href: '/roundups/2026-12-07' };
const BEFORE = () => new Date('2026-11-29T12:00:00Z');
const AFTER = () => new Date('2026-11-30T18:00:01Z');
const COUNCIL = [{ userId: 'u-leandra', name: 'Leandra Preston' }];

function fakeDeps(viewer, now = BEFORE) {
  const proposals = [];
  const supports = [];
  let n = 0;
  const open = (s) => now().getTime() < Date.parse(s.startsAt);
  const find = (s, id) => proposals.find((p) => p.id === id && p.session_date === s.date);
  return {
    proposals,
    supports,
    readSession: async () => viewer(),
    sessions: () => [S30, S07],
    members: () => COUNCIL,
    rows: async (date) => ({ proposals: proposals.filter((p) => p.session_date === date), supports }),
    add: async (s, v, p) => {
      if (!open(s)) return { ok: false, code: 'closed' };
      if (proposals.filter((x) => x.user_id === v.userId && x.session_date === s.date && !x.withdrawn_at && !x.hidden_at).length >= 3)
        return { ok: false, code: 'too_many' };
      n += 1;
      proposals.push({
        id: `00000000-0000-0000-0000-00000000000${n}`, session_date: s.date, user_id: v.userId, name: p.name, title: p.title, body: p.text,
        created_at: new Date(Date.parse('2026-11-29T00:00:00Z') + n * 1000).toISOString(),
        withdrawn_at: null, hidden_at: null, hidden_by_name: null, hidden_reason: null,
      });
      return { ok: true };
    },
    support: async (s, v, id, name, on) => {
      const p = find(s, id);
      if (!p) return { ok: false, code: 'not_found' };
      if (p.withdrawn_at || p.hidden_at) return { ok: false, code: 'gone' };
      if (p.user_id === v.userId) return { ok: false, code: 'own' };
      const i = supports.findIndex((x) => x.proposal_id === id && x.user_id === v.userId);
      if (on) {
        if (i >= 0) return { ok: false, code: 'already' };
        supports.push({ proposal_id: id, user_id: v.userId, name, created_at: now().toISOString() });
      } else {
        if (i < 0) return { ok: false, code: 'already' };
        supports.splice(i, 1);
      }
      return { ok: true };
    },
    withdraw: async (s, v, id) => {
      const p = find(s, id);
      if (!p) return { ok: false, code: 'not_found' };
      if (p.user_id !== v.userId) return { ok: false, code: 'not_yours' };
      p.withdrawn_at = now().toISOString();
      return { ok: true };
    },
    hide: async (s, m, id, reason) => {
      const p = find(s, id);
      if (!p) return { ok: false, code: 'not_found' };
      Object.assign(p, { hidden_at: now().toISOString(), hidden_by_name: m.name, hidden_reason: reason });
      return { ok: true };
    },
    allowHit: () => true,
    now,
  };
}

const post = (body) =>
  new Request('https://x/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const PROPOSAL = { action: 'propose', name: 'Joel Okomoli', title: 'Book club cadence', body: 'Pick chapters by interest after the front matter.' };

test('names: real names only, no emails, handles or links', () => {
  assert.equal(parseName('Joel Okomoli').ok, true);
  assert.equal(parseName('Phahsa').ok, true);
  assert.equal(parseName('Aldo Velázquez').ok, true);
  for (const bad of ['', 'a', 'joel@example.com', '@bitracer1', 'https://x.y', 'user12345', '1234']) assert.equal(parseName(bad).ok, false, bad);
  assert.equal(prefillName('someone@example.com'), null);
  assert.equal(prefillName('Leandra Preston'), 'Leandra Preston');
});

test('a proposal needs a title and a reason', () => {
  assert.equal(parseProposal({ ...PROPOSAL, title: 'short' }).ok, false);
  assert.equal(parseProposal({ ...PROPOSAL, body: 'too short' }).ok, false);
  assert.equal(parseProposal(PROPOSAL).ok, true);
});

test('the target is the next session that has not started', () => {
  assert.equal(nextSession([S07, S30], BEFORE()).date, '2026-11-30');
  assert.equal(nextSession([S07, S30], AFTER()).date, '2026-12-07');
  assert.equal(nextSession([S30], AFTER()), null);
});

test('sign in first; JSON only; unknown session is 404', async () => {
  const deps = fakeDeps(() => null);
  assert.equal((await handleProposalsPost(post(PROPOSAL), S30.date, deps)).status, 401);
  const form = new Request('https://x', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=1' });
  assert.equal((await handleProposalsPost(form, S30.date, deps)).status, 415);
  assert.equal((await handleProposalsGet('2026-01-01', deps)).status, 404);
});

test('propose, support (not your own), unsupport, withdraw', async () => {
  let who = { userId: 'u-joel', displayName: 'Joel Okomoli' };
  const deps = fakeDeps(() => who);
  let res = await handleProposalsPost(post(PROPOSAL), S30.date, deps);
  assert.equal(res.status, 200);
  let view = await res.json();
  assert.equal(view.proposals.length, 1);
  const id = view.proposals[0].id;
  assert.equal(view.proposals[0].mine, true);
  assert.equal(view.viewer.suggestedName, 'Joel Okomoli');

  res = await handleProposalsPost(post({ action: 'support', id, name: 'Joel Okomoli' }), S30.date, deps);
  assert.equal(res.status, 409, 'cannot support your own');

  who = { userId: 'u-laura', displayName: 'laura@example.com' };
  res = await handleProposalsPost(post({ action: 'support', id, name: 'laura@example.com' }), S30.date, deps);
  assert.equal(res.status, 400, 'support needs a real name');
  res = await handleProposalsPost(post({ action: 'support', id, name: 'Laura Del Campo' }), S30.date, deps);
  view = await res.json();
  assert.deepEqual(view.proposals[0].supporters.map((s) => s.name), ['Laura Del Campo']);
  assert.equal(view.proposals[0].supportedByMe, true);
  assert.equal((await handleProposalsPost(post({ action: 'support', id, name: 'Laura Del Campo' }), S30.date, deps)).status, 409);
  view = await (await handleProposalsPost(post({ action: 'unsupport', id }), S30.date, deps)).json();
  assert.equal(view.proposals[0].supporters.length, 0);

  assert.equal((await handleProposalsPost(post({ action: 'withdraw', id }), S30.date, deps)).status, 403, 'only the proposer withdraws');
  who = { userId: 'u-joel', displayName: 'Joel Okomoli' };
  view = await (await handleProposalsPost(post({ action: 'withdraw', id }), S30.date, deps)).json();
  assert.equal(view.proposals[0].status, 'withdrawn', 'kept on record');
});

test('at most three standing proposals per person per session', async () => {
  const deps = fakeDeps(() => ({ userId: 'u-a', displayName: null }));
  for (let i = 0; i < 3; i += 1) assert.equal((await handleProposalsPost(post(PROPOSAL), S30.date, deps)).status, 200);
  assert.equal((await handleProposalsPost(post(PROPOSAL), S30.date, deps)).status, 409);
});

test('only council members hide, with a reason; the reason stays public and the text is not shown', async () => {
  let who = { userId: 'u-joel', displayName: null };
  const deps = fakeDeps(() => who);
  const id = (await (await handleProposalsPost(post(PROPOSAL), S30.date, deps)).json()).proposals[0].id;
  assert.equal((await handleProposalsPost(post({ action: 'hide', id, reason: 'Off-topic advertising.' }), S30.date, deps)).status, 403);
  who = { userId: 'u-leandra', displayName: null };
  assert.equal((await handleProposalsPost(post({ action: 'hide', id, reason: 'spam' }), S30.date, deps)).status, 400);
  const view = await (await handleProposalsPost(post({ action: 'hide', id, reason: 'Off-topic advertising.' }), S30.date, deps)).json();
  const p = view.proposals[0];
  assert.equal(p.status, 'hidden');
  assert.equal(p.title, '');
  assert.equal(p.body, '');
  assert.deepEqual([p.hidden.by, p.hidden.reason], ['Leandra Preston', 'Off-topic advertising.']);
  assert.equal(view.viewer.member, true);
});

test('closed once the session starts; GET still lists', async () => {
  const deps = fakeDeps(() => ({ userId: 'u-a', displayName: null }), AFTER);
  const res = await handleProposalsPost(post(PROPOSAL), S30.date, deps);
  assert.equal(res.status, 409);
  const view = await (await handleProposalsGet(S30.date, deps)).json();
  assert.equal(view.open, false);
});

test('toPublic: oldest first, viewer flags', () => {
  const rows = [
    { id: 'b', session_date: 'd', user_id: 'u2', name: 'B', title: 't', body: 'x', created_at: '2026-11-29T02:00:00Z', withdrawn_at: null, hidden_at: null, hidden_by_name: null, hidden_reason: null },
    { id: 'a', session_date: 'd', user_id: 'u1', name: 'A', title: 't', body: 'x', created_at: '2026-11-29T01:00:00Z', withdrawn_at: null, hidden_at: null, hidden_by_name: null, hidden_reason: null },
  ];
  const out = toPublic(rows, [{ proposal_id: 'b', user_id: 'u1', name: 'A', created_at: '2026-11-29T03:00:00Z' }], 'u1');
  assert.deepEqual(out.map((p) => p.id), ['a', 'b']);
  assert.equal(out[0].mine, true);
  assert.equal(out[1].supportedByMe, true);
});
