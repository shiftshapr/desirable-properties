// Broadcast unsubscribe: account tokens set do_not_send, email-only tokens opt the email out, nothing else succeeds.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeOptOutEmail, planUnsubscribe } from '../src/lib/dp-broadcast-unsubscribe-plan.ts';
import { parseInput } from './broadcast-tokens.mjs';

const UID = '372e5bbb-794d-4612-bed6-d6cf8bb75535';

test('a token linked to an account opts the account out', () => {
  assert.deepEqual(planUnsubscribe({ userId: UID, email: ' A@Example.org ' }), { kind: 'user', userId: UID, email: 'a@example.org' });
  assert.deepEqual(planUnsubscribe({ userId: UID, email: null }), { kind: 'user', userId: UID, email: null });
});

test('a token with an email and no user id opts the email out', () => {
  assert.deepEqual(planUnsubscribe({ userId: '', email: 'Luma.Person@Example.org' }), { kind: 'email', email: 'luma.person@example.org' });
  assert.deepEqual(planUnsubscribe({ userId: null, email: 'x@y.co' }), { kind: 'email', email: 'x@y.co' });
  assert.deepEqual(planUnsubscribe({ userId: 'not-a-uuid', email: 'x@y.co' }), { kind: 'email', email: 'x@y.co' });
});

test('unknown tokens and rows with neither do nothing', () => {
  assert.deepEqual(planUnsubscribe(null), { kind: 'none' });
  assert.deepEqual(planUnsubscribe(undefined), { kind: 'none' });
  assert.deepEqual(planUnsubscribe({ userId: '', email: '' }), { kind: 'none' });
  assert.deepEqual(planUnsubscribe({ userId: '', email: 'not an email' }), { kind: 'none' });
});

test('emails are normalized', () => {
  assert.equal(normalizeOptOutEmail('  Foo@Bar.ORG '), 'foo@bar.org');
  assert.equal(normalizeOptOutEmail('foo'), null);
});

test('broadcast-tokens input: one entry per email, user id kept when given', () => {
  const m = parseInput(`a@x.org\nA@X.org\t${UID}\nb@x.org,not-a-uuid\n\njunk\nc@x.org,${UID}\n`);
  assert.deepEqual([...m.entries()], [['a@x.org', UID], ['b@x.org', null], ['c@x.org', UID]]);
});
