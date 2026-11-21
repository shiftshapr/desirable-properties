// Invite others on every pad: ref links (channel only, no personal data), the mailto and share links, the invite
// copy for proposals and sessions, and "Send from the site" (signed in, 5 per send, 20 a day, opted-out and
// recently invited addresses skipped, only hashes recorded, a footer and opt-out link in every email).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  INVITE_LIMITS,
  handleInviteGet,
  handleInviteSend,
  inviteMessage,
  inviteUrl,
  mailtoHref,
  parseNote,
  parsePadRef,
  parseRecipients,
  parseRef,
  proposalInvite,
  qrPath,
  sendResultLine,
  sessionInvite,
  shareLinks,
  shorten,
  signalMessage,
  siteInviteEmail,
} from '../src/lib/pads/pad-invite-core.ts';
import { decodeOptOutToken, encodeOptOutToken, hashInviteEmail } from '../src/lib/pads/pad-invite-token.ts';

const BASE = 'https://desirableproperties.org';
const ID = '3275bc04-4415-467d-9b6a-f9ef7dfffcb8';

const PROPOSAL = proposalInvite({
  id: ID,
  path: '/pads/proposals/3275bc04',
  title: 'Privacy-preserving community discovery',
  summary: 'Adds a section so people can find communities without exposing who they are. It sits after section 7.',
  where: 'DP1',
  status: 'pending',
});

const EVENT = {
  date: '2026-11-23',
  startsAt: '2026-11-23T10:00:00-08:00',
  endsAt: '2026-11-23T11:30:00-08:00',
  meetingTitle: 'Ballot results and the first weekly cycle',
  title: 'DP Listening Experiment 1/4',
  seriesTitle: 'DP Listening Experiment 1/4',
  objective: 'Results of the 16 November ballot and the first weekly cycle.',
  thisWeek: 'This week: results and the first cycle.',
  clockShort: '10–11:30 AM PT',
  pageHref: null,
  href: '/roundups/2026-11-23',
};

test('ref links name the channel only and round-trip', () => {
  assert.equal(inviteUrl(BASE, '/pads/proposals/3275bc04', 'whatsapp'), `${BASE}/pads/proposals/3275bc04?ref=inv-whatsapp`);
  assert.equal(inviteUrl(`${BASE}/`, '/x?a=1#vote', 'qr'), `${BASE}/x?a=1&ref=inv-qr#vote`);
  assert.equal(parseRef('inv-signal'), 'signal');
  assert.equal(parseRef('INV-X'), 'x');
  assert.equal(parseRef('inv-daveed@bridgit.io'), null);
  assert.equal(parseRef('newsletter'), null);
});

test('proposal copy: plain title, short summary, action by status', () => {
  assert.equal(PROPOSAL.kind, 'proposal');
  assert.equal(PROPOSAL.key, ID);
  assert.match(PROPOSAL.action, /add your view/);
  assert.match(PROPOSAL.subject, /^A proposed change to DP1: /);
  const closed = proposalInvite({ id: ID, path: '/p', title: 'T', summary: null, where: 'DP1', status: 'incorporated' });
  assert.match(closed.action, /how it was decided/);
  assert.match(closed.summary, /DP1/);
  const long = proposalInvite({ id: ID, path: '/p', title: 'T', summary: 'Word '.repeat(200), where: 'DP1', status: 'pending' });
  assert.ok(long.summary.length <= 241);
});

test('session copy: join before, vote while open, record after', () => {
  const before = sessionInvite({ event: EVENT, path: EVENT.href, now: new Date('2026-11-21T12:00:00Z') });
  assert.match(before.action, /^Join us on Monday 23 November, 10–11:30 AM PT/);
  assert.match(before.subject, /^Join me: Ballot results/);
  assert.equal(before.key, '/roundups/2026-11-23');
  const voting = sessionInvite({
    event: EVENT,
    path: '/events/x',
    now: new Date('2026-11-24T12:00:00Z'),
    ballot: { status: 'open', closesLabel: 'Sun 29 Nov' },
  });
  assert.match(voting.action, /^Vote .* open until Sun 29 Nov/);
  const after = sessionInvite({ event: EVENT, path: EVENT.href, now: new Date('2026-11-30T12:00:00Z') });
  assert.match(after.action, /Read the record/);
  const live = sessionInvite({ event: EVENT, path: EVENT.href, now: new Date('2026-11-23T18:30:00Z') });
  assert.match(live.action, /Join now/);
});

test('mailto, share links and the Signal message carry the pad text and a per-channel ref', () => {
  const mail = decodeURIComponent(mailtoHref(PROPOSAL, BASE));
  assert.match(mail, /^mailto:\?subject=A proposed change to DP1/);
  assert.match(mail, /Privacy-preserving community discovery/);
  assert.match(mail, /Read it and add your view .*: https:\/\/desirableproperties\.org\/pads\/proposals\/3275bc04\?ref=inv-email/);
  const links = shareLinks(PROPOSAL, BASE);
  assert.deepEqual(links.map((l) => l.key), ['whatsapp', 'telegram', 'linkedin', 'x', 'bluesky']);
  for (const l of links) {
    assert.ok(l.href.startsWith('https://'), l.key);
    assert.match(decodeURIComponent(l.href), new RegExp(`ref=inv-${l.key}`));
  }
  assert.ok(decodeURIComponent(links.find((l) => l.key === 'x').href).length < 600);
  assert.match(signalMessage(PROPOSAL, BASE), /ref=inv-signal$/);
  assert.equal(inviteMessage(PROPOSAL, 'U', { short: true }), `${PROPOSAL.title}. ${PROPOSAL.action}: U`);
});

test('shorten cuts at a sentence or a word', () => {
  assert.equal(shorten('One two. Three four five.', 14), 'One two.');
  assert.equal(shorten('alpha beta gamma delta', 12), 'alpha beta…');
  assert.equal(shorten('  a   b ', 10), 'a b');
});

test('recipients: up to 5 valid addresses, deduplicated and lowercased', () => {
  assert.deepEqual(parseRecipients('A@x.org, a@x.org\nb@y.io'), { ok: true, emails: ['a@x.org', 'b@y.io'] });
  assert.equal(parseRecipients('').ok, false);
  assert.equal(parseRecipients('not-an-email').ok, false);
  assert.equal(parseRecipients('a@b.co,c@d.co,e@f.co,g@h.co,i@j.co,k@l.co').ok, false);
  assert.equal(parseRecipients(['a@b.co', 'c@d.co']).ok, true);
});

test('note: optional, short, no links', () => {
  assert.deepEqual(parseNote(''), { ok: true, note: null });
  assert.deepEqual(parseNote('  You would like   this. '), { ok: true, note: 'You would like this.' });
  assert.equal(parseNote('see https://spam.example').ok, false);
  assert.equal(parseNote('go to www.spam.example').ok, false);
  assert.equal(parseNote('visit cheap.xyz now').ok, false);
  assert.equal(parseNote('x'.repeat(INVITE_LIMITS.noteMax + 1)).ok, false);
  assert.equal(parseNote('The co-editors decide, e.g. Liz.').ok, true);
});

test('pad refs: proposal ids and site paths only', () => {
  assert.deepEqual(parsePadRef({ kind: 'proposal', key: ID }), { kind: 'proposal', key: ID });
  assert.deepEqual(parsePadRef({ kind: 'session', key: '/roundups/2026-11-23' }), { kind: 'session', key: '/roundups/2026-11-23' });
  assert.equal(parsePadRef({ kind: 'proposal', key: '../x' }), null);
  assert.equal(parsePadRef({ kind: 'session', key: 'https://evil.example/' }), null);
  assert.equal(parsePadRef({ kind: 'other', key: '/x' }), null);
});

test('the email names the sender, carries the note, the link, why they got it and an opt-out', () => {
  const m = siteInviteEmail({
    content: PROPOSAL,
    url: `${BASE}/pads/proposals/3275bc04?ref=inv-site`,
    sender: 'Liliana <b>',
    note: 'You know DP1 well.',
    optOutUrl: `${BASE}/api/pads/invite/opt-out?t=abc`,
  });
  assert.match(m.subject, /^Liliana <b> invited you: Privacy-preserving/);
  assert.match(m.text, /Liliana <b> invited you to a page on Desirable Properties/);
  assert.match(m.text, /"You know DP1 well\." \(Liliana <b>\)/);
  assert.match(m.text, /ref=inv-site/);
  assert.match(m.text, /You got this because Liliana <b> typed your address/);
  assert.match(m.text, /not been added to any list/);
  assert.match(m.text, /Stop all email from Desirable Properties: https:\/\/desirableproperties\.org\/api\/pads\/invite\/opt-out\?t=abc/);
  assert.match(m.html, /Liliana &lt;b&gt;/);
  assert.doesNotMatch(m.html, /<b>/);
  assert.match(m.html, /href="https:\/\/desirableproperties\.org\/api\/pads\/invite\/opt-out\?t=abc"/);
});

test('opt-out tokens hide the address and reject tampering; hashes are keyed', () => {
  const t = encodeOptOutToken('Daveed@Bridgit.io', 's3cret');
  assert.doesNotMatch(t, /daveed|bridgit/i);
  assert.equal(decodeOptOutToken(t, 's3cret'), 'daveed@bridgit.io');
  assert.equal(decodeOptOutToken(t, 'other'), null);
  assert.equal(decodeOptOutToken(`${t.slice(0, -2)}AA`, 's3cret'), null);
  assert.equal(decodeOptOutToken('junk', 's3cret'), null);
  assert.equal(hashInviteEmail('A@b.co', 'k'), hashInviteEmail('a@b.co ', 'k'));
  assert.notEqual(hashInviteEmail('a@b.co', 'k'), hashInviteEmail('a@b.co', 'k2'));
  assert.match(hashInviteEmail('a@b.co', 'k'), /^[0-9a-f]{64}$/);
});

test('qrPath draws one square per dark module inside the quiet zone', () => {
  assert.equal(qrPath(2, (r, c) => r === c), 'M4 4h1v1h-1zM5 5h1v1h-1z');
  assert.equal(qrPath(3, () => false), '');
});

/* ---------- handler ---------- */

function fakeDeps(over = {}) {
  const rows = [];
  const sent = [];
  const deps = {
    readSession: async () => ({ userId: 'u1', displayName: 'Liliana', username: 'lili', email: 'lili@x.org' }),
    resolveContent: async (kind, key) => (kind === 'proposal' && key.startsWith('3275bc04') ? PROPOSAL : null),
    hashEmail: (e) => `h:${e}`,
    isOptedOut: async (e) => e === 'out@x.org',
    senderCount: async (userId) => rows.filter((r) => r.senderId === userId).length,
    recipientCount: async (hash, _ms, pad) =>
      rows.filter((r) => r.hash === hash && r.outcome === 'sent' && (!pad || (r.kind === pad.kind && r.key === pad.key))).length,
    siteCount: async () => rows.filter((r) => r.outcome === 'sent').length,
    record: async (row) => {
      rows.push(row);
    },
    optOutUrl: async (e) => `${BASE}/api/pads/invite/opt-out?t=${encodeURIComponent(`tok-${e.length}`)}`,
    send: async (mail) => {
      sent.push(mail);
      return { ok: true };
    },
    allowHit: () => true,
    base: BASE,
    enabled: true,
    ...over,
  };
  return { deps, rows, sent };
}

const SEND = { kind: 'proposal', key: ID, to: 'a@x.org, b@x.org', note: 'Thought of you.' };

test('send: signed in only, and the server builds the email from the pad (not from the client)', async () => {
  const { deps } = fakeDeps({ readSession: async () => null });
  assert.equal((await handleInviteSend(deps, SEND)).status, 401);
  const { deps: d2, sent, rows } = fakeDeps();
  const r = await handleInviteSend(d2, { ...SEND, title: 'Win a prize', summary: 'click here' });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.sent, r.body.skipped, r.body.failed], [2, 0, 0]);
  assert.equal(sent.length, 2);
  assert.match(sent[0].subject, /^Liliana invited you: Privacy-preserving/);
  assert.doesNotMatch(sent[0].text, /prize|click here/);
  assert.match(sent[0].text, /Thought of you\./);
  assert.ok(sent[0].unsubscribeUrl.includes('/api/pads/invite/opt-out?t='));
  // Only hashes are kept, never the addresses.
  assert.deepEqual(rows.map((x) => x.hash), ['h:a@x.org', 'h:b@x.org']);
  assert.ok(!JSON.stringify(rows).includes('"a@x.org"'));
  assert.equal(r.body.remainingToday, INVITE_LIMITS.perAccountPerDay - 2);
});

test('send: opted-out and recently invited addresses are skipped, counted but not named', async () => {
  const { deps, sent } = fakeDeps();
  await handleInviteSend(deps, { ...SEND, to: 'a@x.org' });
  const r = await handleInviteSend(deps, { ...SEND, to: 'a@x.org, out@x.org, c@x.org' });
  assert.deepEqual([r.body.sent, r.body.skipped], [1, 2]);
  assert.equal(sent.length, 2);
  assert.ok(!sent.some((m) => m.to === 'out@x.org'));
  assert.ok(!JSON.stringify(r.body).includes('out@x.org'));
  assert.match(sendResultLine(r.body), /^Sent 1 invitation\. 2 skipped/);
});

test('send: per-recipient daily cap across pads', async () => {
  const { deps, rows } = fakeDeps();
  for (let i = 0; i < INVITE_LIMITS.perRecipientPerDay; i += 1) rows.push({ senderId: `s${i}`, hash: 'h:a@x.org', kind: 'proposal', key: `other${i}`, outcome: 'sent' });
  const r = await handleInviteSend(deps, { ...SEND, to: 'a@x.org' });
  assert.deepEqual([r.body.sent, r.body.skipped], [0, 1]);
});

test('send: 5 per send, 20 per account per day, burst limit, site cap', async () => {
  const { deps } = fakeDeps();
  const six = Array.from({ length: 6 }, (_, i) => `p${i}@x.org`).join(',');
  assert.equal((await handleInviteSend(deps, { ...SEND, to: six })).status, 400);

  const { deps: d2, rows } = fakeDeps();
  for (let i = 0; i < 18; i += 1) rows.push({ senderId: 'u1', hash: `h${i}`, kind: 'proposal', key: 'k', outcome: 'skipped' });
  const over = await handleInviteSend(d2, { ...SEND, to: 'a@x.org,b@x.org,c@x.org' });
  assert.equal(over.status, 429);
  assert.match(over.body.error, /2 more people today/);
  assert.equal((await handleInviteSend(d2, SEND)).status, 200);
  const done = await handleInviteSend(d2, { ...SEND, to: 'z@x.org' });
  assert.equal(done.status, 429);
  assert.match(done.body.error, /allowed today/);

  const { deps: d3 } = fakeDeps({ allowHit: () => false });
  assert.equal((await handleInviteSend(d3, SEND)).status, 429);

  const { deps: d4 } = fakeDeps({ siteCount: async () => INVITE_LIMITS.sitePerDay - 1 });
  assert.equal((await handleInviteSend(d4, SEND)).status, 429);
});

test('send: bad input, unknown pad, switched off, no display name', async () => {
  const { deps } = fakeDeps();
  assert.equal((await handleInviteSend(deps, { ...SEND, key: 'ffffffff' })).status, 404);
  assert.equal((await handleInviteSend(deps, { ...SEND, kind: 'nope' })).status, 400);
  assert.equal((await handleInviteSend(deps, { ...SEND, note: 'http://x.example' })).status, 400);
  const { deps: off, sent } = fakeDeps({ enabled: false });
  assert.equal((await handleInviteSend(off, SEND)).status, 503);
  assert.equal(sent.length, 0);
  const { deps: anon } = fakeDeps({ readSession: async () => ({ userId: 'u2', displayName: null, username: null, email: null }) });
  assert.equal((await handleInviteSend(anon, SEND)).status, 409);
});

test('send: a failed send is recorded as failed and reported', async () => {
  const { deps, rows } = fakeDeps({ send: async () => ({ ok: false, error: 'resend_500' }) });
  const r = await handleInviteSend(deps, { ...SEND, to: 'a@x.org' });
  assert.deepEqual([r.body.sent, r.body.failed], [0, 1]);
  assert.equal(rows[0].outcome, 'failed');
  assert.match(sendResultLine(r.body), /could not be sent/);
});

test('GET tells the panel who is signed in and what is left today', async () => {
  const { deps } = fakeDeps();
  const r = await handleInviteGet(deps);
  assert.deepEqual(r.body, { signedIn: true, enabled: true, sender: 'Liliana', remainingToday: 20, perSend: 5, perDay: 20 });
  const { deps: anon } = fakeDeps({ readSession: async () => null });
  assert.deepEqual((await handleInviteGet(anon)).body, { signedIn: false, enabled: true });
});
