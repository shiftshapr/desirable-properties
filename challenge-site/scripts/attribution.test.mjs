// How people arrive: message tags (?ref=em-1122-closes, inv-<channel>) and Canopi referrals (ref_token, ch, utm_*,
// referralCode) on any page go into the dp_arrival cookie (first and last touch, nothing about the visitor), are
// stored once with a first ballot submission, and are passed to Canopi's sign-up.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ARRIVAL_COOKIE,
  ARRIVAL_MAX_AGE_S,
  canopiSignupFields,
  decodeArrival,
  encodeArrival,
  mergeArrival,
  parseReferralCode,
  parseReferrer,
  parseRefToken,
  parseTag,
  referralLabel,
  touchFromParams,
  voteAttribution,
} from '../src/lib/attribution/attribution-core.ts';
import { BALLOT_SCHEMA_SQL } from '../src/lib/ballots/ballot-schema.ts';

const p = (q) => new URLSearchParams(q);
const T0 = new Date('2026-11-22T18:00:00Z');
const T1 = new Date('2026-11-22T20:00:00Z');
// Shape of a Canopi share token: base64url(JSON payload) "." base64url(HMAC-SHA256).
const TOKEN = `${Buffer.from(JSON.stringify({ v: 1, referrerUserId: '3275bc04-4415-467d-9b6a-f9ef7dfffcb8', entityType: 'profile' })).toString('base64url')}.${'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v'}`;
const EMBED = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c';

test('message tags: the README scheme and pad invites, lower-cased; anything else is dropped', () => {
  assert.equal(parseTag('em-1122-closes'), 'em-1122-closes');
  assert.equal(parseTag('WA-1122-LastCall'), 'wa-1122-lastcall');
  assert.equal(parseTag('sig-1122-lastcall'), 'sig-1122-lastcall');
  assert.equal(parseTag('lu-1201-week-3'), 'lu-1201-week-3');
  assert.equal(parseTag('inv-email'), 'inv-email');
  assert.equal(parseTag('inv-whatsapp'), 'inv-whatsapp');
  for (const bad of ['', 'inv-nowhere', 'em-1322-closes', 'em-1100-x', 'em-112-closes', 'em-1122-', 'em-1122-a b', 'dave@example.com', `em-1122-${'x'.repeat(60)}`, null, undefined]) {
    assert.equal(parseTag(bad), null, String(bad));
  }
});

test('Canopi referral params: ref_token, legacy referralCode, ?ref=ref_... and a referrer UUID', () => {
  assert.equal(parseRefToken(TOKEN), TOKEN);
  assert.equal(parseRefToken('not-a-token'), null);
  assert.equal(parseRefToken('a.b'), null);
  assert.equal(parseReferralCode('ref_7f3e9a2b1c4d'), 'ref_7f3e9a2b1c4d');
  assert.equal(parseReferralCode('ref_dp_book_7f3e'), 'ref_dp_book_7f3e');
  assert.equal(parseReferralCode('3275BC04-4415-467D-9B6A-F9EF7DFFFCB8'), null, 'a UUID is a person, never an embed code');
  assert.equal(parseReferrer('3275BC04-4415-467D-9B6A-F9EF7DFFFCB8'), '3275bc04-4415-467d-9b6a-f9ef7dfffcb8');
  assert.equal(parseReferrer('bitracer1'), null);
  assert.equal(parseReferralCode('<script>'), null);

  const t = touchFromParams(p(`ref_token=${TOKEN}&ch=email&utm_source=canopi&utm_medium=profile_referral&utm_campaign=get_canopi&utm_content=3275bc04-4415-467d-9b6a-f9ef7dfffcb8`));
  assert.deepEqual(t, { tag: null, referralCode: null, refToken: TOKEN, referrer: null, channel: 'email', utmSource: 'canopi', utmMedium: 'profile_referral', utmCampaign: 'get_canopi' });
  assert.equal(touchFromParams(p('referralCode=ref_7f3e9a2b1c4d')).referralCode, 'ref_7f3e9a2b1c4d');
  assert.equal(touchFromParams(p('ref=ref_7f3e9a2b1c4d')).referralCode, 'ref_7f3e9a2b1c4d');
  assert.equal(touchFromParams(p('ref=ref_7f3e9a2b1c4d')).tag, null);
  // A tag is never read as a referral code, and utm fields alone (no referral) are not kept.
  assert.deepEqual(touchFromParams(p('ref=em-1122-closes&utm_campaign=x')), { tag: 'em-1122-closes', referralCode: null, refToken: null, referrer: null, channel: null, utmSource: null, utmMedium: null, utmCampaign: null });
  assert.equal(touchFromParams(p('utm_source=newsletter')), null);
  assert.equal(touchFromParams(p('ref=junk value')), null);
  assert.equal(touchFromParams(p('')), null);
});

test('?ref= is split: a slug is a message tag, a UUID is a Canopi referrer, ref_... an embed code', () => {
  const UUID = '3275bc04-4415-467d-9b6a-f9ef7dfffcb8';
  const asTag = touchFromParams(p('ref=em-1122-closes'));
  assert.equal(asTag.tag, 'em-1122-closes');
  assert.equal(asTag.referrer, null);
  assert.equal(asTag.referralCode, null);

  const asReferrer = touchFromParams(p(`ref=${UUID.toUpperCase()}`));
  assert.equal(asReferrer.tag, null);
  assert.equal(asReferrer.referrer, UUID);
  assert.equal(asReferrer.referralCode, null);

  assert.equal(touchFromParams(p(`canopi_ref=${UUID}`)).referrer, UUID);
  assert.equal(touchFromParams(p('canopi_ref=not-a-uuid')), null);
  assert.equal(touchFromParams(p(`canopi_ref_token=${TOKEN}`)).refToken, TOKEN);

  // A tag and a referrer together: the tag from ?ref=, the referrer from canopi_ref.
  const both = touchFromParams(p(`ref=wa-1122-lastcall&canopi_ref=${UUID}&canopi_ref_token=${TOKEN}`));
  assert.equal(both.tag, 'wa-1122-lastcall');
  assert.equal(both.referrer, UUID);
  assert.equal(both.refToken, TOKEN);

  const code = touchFromParams(p('ref=ref_dp_book_7f3e'));
  assert.equal(code.referralCode, 'ref_dp_book_7f3e');
  assert.equal(code.referrer, null);
  assert.equal(code.tag, null);

  // The cookie keeps them apart, and Canopi gets ref (UUID) and refToken (verbatim) next to the embed fields.
  let a = mergeArrival(null, asTag, T0);
  a = mergeArrival(a, asReferrer, T1);
  a = mergeArrival(a, touchFromParams(p('ref=3275bc04-0000-4000-8000-000000000000')), T1);
  assert.equal(a.ft, 'em-1122-closes');
  assert.equal(a.lt, 'em-1122-closes', 'a referrer visit does not move the latest tag');
  assert.equal(a.rr, UUID, 'first referrer wins');
  assert.deepEqual(decodeArrival(encodeArrival(a)), a);
  assert.deepEqual(canopiSignupFields(a, EMBED), { canopiId: EMBED, ref: UUID });
  assert.equal(voteAttribution(a).referralCode, `referrer:${UUID}`);
  assert.equal(voteAttribution(a).firstRef, 'em-1122-closes');
  const forged = decodeArrival(encodeURIComponent(JSON.stringify({ v: 1, rr: 'dave@example.com', lt: 'em-1122-closes' })));
  assert.equal(forged.rr, null);
});

test('first touch is kept, last touch replaced, the first referral kept; the cookie round-trips', () => {
  let a = mergeArrival(null, touchFromParams(p('ref=wa-1122-lastcall')), T0);
  assert.equal(a.ft, 'wa-1122-lastcall');
  assert.equal(a.fa, T0.toISOString());
  a = mergeArrival(a, touchFromParams(p('ref=em-1122-closes&referralCode=ref_aaaaaaaaaaaa')), T1);
  assert.equal(a.ft, 'wa-1122-lastcall');
  assert.equal(a.lt, 'em-1122-closes');
  assert.equal(a.la, T1.toISOString());
  assert.equal(a.rc, 'ref_aaaaaaaaaaaa');
  a = mergeArrival(a, touchFromParams(p('referralCode=ref_bbbbbbbbbbbb')), T1);
  assert.equal(a.rc, 'ref_aaaaaaaaaaaa', 'first referral wins');
  assert.equal(a.at, T0.toISOString());

  const back = decodeArrival(encodeArrival(a));
  assert.deepEqual(back, a);
  assert.ok(encodeArrival(mergeArrival(a, touchFromParams(p(`ref_token=${TOKEN}`)), T1)).length < 3000);
});

test('the cookie is client-held: every field is re-checked on the way back', () => {
  assert.equal(decodeArrival(undefined), null);
  assert.equal(decodeArrival('%%%'), null);
  assert.equal(decodeArrival(encodeURIComponent(JSON.stringify({ v: 2, ft: 'em-1122-closes' }))), null);
  const forged = decodeArrival(encodeURIComponent(JSON.stringify({ v: 1, ft: "x'; drop table", lt: 'em-1122-closes', rc: 'a b', at: 'nope', email: 'a@b.c' })));
  assert.equal(forged.ft, null);
  assert.equal(forged.lt, 'em-1122-closes');
  assert.equal(forged.rc, null);
  assert.equal(forged.email, undefined, 'unknown fields are dropped');
  assert.equal(ARRIVAL_COOKIE, 'dp_arrival');
  assert.equal(ARRIVAL_MAX_AGE_S, 30 * 24 * 3600);
});

test('what is stored with a vote: tags, a short referral label (never the token), channel, campaign, landing time', () => {
  assert.deepEqual(voteAttribution(null), { firstRef: null, lastRef: null, referralCode: null, referralChannel: null, utmCampaign: null, landedAt: null });
  const a = mergeArrival(null, touchFromParams(p(`ref=em-1122-closes&ref_token=${TOKEN}&ch=email&utm_campaign=get_canopi`)), T0);
  const v = voteAttribution(a);
  assert.equal(v.firstRef, 'em-1122-closes');
  assert.equal(v.lastRef, 'em-1122-closes');
  assert.equal(v.referralCode, `token:${TOKEN.split('.')[1].slice(0, 12)}`);
  assert.ok(!v.referralCode.includes(TOKEN.split('.')[0]), 'token payload (referrer id) not stored');
  assert.equal(v.referralChannel, 'email');
  assert.equal(v.utmCampaign, 'get_canopi');
  assert.equal(v.landedAt, T0.toISOString());
  assert.equal(referralLabel({ rc: 'ref_aaaaaaaaaaaa', rt: TOKEN, rr: null }), v.referralCode, 'the person (token) before the embed code');
  assert.equal(referralLabel({ rc: 'ref_aaaaaaaaaaaa', rt: null, rr: null }), 'ref_aaaaaaaaaaaa');
});

test("Canopi sign-up gets the DP embed instance and the referral in web3auth.js's field names", () => {
  assert.deepEqual(canopiSignupFields(null, EMBED), { canopiId: EMBED });
  const a = mergeArrival(null, touchFromParams(p(`referralCode=ref_aaaaaaaaaaaa&ref_token=${TOKEN}`)), T0);
  assert.deepEqual(canopiSignupFields(a, EMBED), { canopiId: EMBED, referralCode: 'ref_aaaaaaaaaaaa', refToken: TOKEN });
  const withRef = mergeArrival(a, touchFromParams(p('canopi_ref=3275bc04-4415-467d-9b6a-f9ef7dfffcb8')), T1);
  assert.deepEqual(canopiSignupFields(withRef, EMBED), {
    canopiId: EMBED,
    referralCode: 'ref_aaaaaaaaaaaa',
    refToken: TOKEN,
    ref: '3275bc04-4415-467d-9b6a-f9ef7dfffcb8',
  });
  // A message tag is ours: it is not sent to Canopi as a referral code.
  assert.deepEqual(canopiSignupFields(mergeArrival(null, touchFromParams(p('ref=em-1122-closes')), T0), EMBED), { canopiId: EMBED });
});

test('wiring: middleware sets the cookie on page loads; first submission only; ballot counting untouched', () => {
  const mw = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8');
  assert.match(mw, /touchFromParams\(request\.nextUrl\.searchParams\)/);
  assert.match(mw, /sameSite: 'lax'/);
  assert.match(mw, /httpOnly: true/);
  assert.match(mw, /startsWith\('\/api\/'\)/);
  assert.match(BALLOT_SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS dp_ballot_vote_attribution/);
  assert.match(BALLOT_SCHEMA_SQL, /PRIMARY KEY \(ballot_slug, user_id\)/);
  const store = readFileSync(new URL('../src/lib/ballots/ballot-store.server.ts', import.meta.url), 'utf8');
  assert.match(store, /if \(isFirstSubmission\) await recordVoteAttribution/);
  assert.match(store, /ON CONFLICT \(ballot_slug, user_id\) DO NOTHING/);
  const core = readFileSync(new URL('../src/lib/ballots/ballot-core.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(core, /attribution/i, 'tally code does not read attribution');
  const admin = readFileSync(new URL('./ballot-admin.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(admin.slice(admin.indexOf('/* ---------- attribution')), /display_?name|username|SELECT[^;]*user_id\s+(AS|,)/i, 'readout never selects accounts');
});
