// Acknowledgements adjustment request form: field rules, the payload sent to Gov Hub, client IP.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EMPTY_ACK_REQUEST,
  ackFieldsFor,
  ackRequestPayload,
  checkAckRequest,
  clientIpFromHeaders,
} from '../src/lib/ack-request.ts';

const form = (over) => ({ ...EMPTY_ACK_REQUEST, ...over });

test('a removal needs only the current name and an email', () => {
  assert.deepEqual(checkAckRequest(form({ kind: 'remove', currentName: 'Ada Lovelace', email: 'ada@example.com' })), {});
  const errors = checkAckRequest(form({ kind: 'remove', email: '' }));
  assert.ok(errors.currentName && errors.email);
  assert.equal(errors.requestedName, undefined);
});

test('each kind asks for what it needs', () => {
  assert.ok(checkAckRequest(form({})).kind);
  assert.ok(checkAckRequest(form({ kind: 'add', requestedName: 'Ada', email: 'a@b.org' })).contribution);
  assert.deepEqual(checkAckRequest(form({ kind: 'add', requestedName: 'Ada', email: 'a@b.org', callForInput: 'first_2024' })), {});
  assert.ok(checkAckRequest(form({ kind: 'correct_name', requestedName: 'Ada King', email: 'a@b.org' })).currentName);
  assert.ok(checkAckRequest(form({ kind: 'affiliation', requestedName: 'Ada', email: 'a@b.org' })).affiliation);
  assert.ok(checkAckRequest(form({ kind: 'move', requestedName: 'Ada', email: 'a@b.org' })).targetList);
  assert.ok(checkAckRequest(form({ kind: 'other', requestedName: 'Ada', email: 'a@b.org' })).note);
  assert.ok(checkAckRequest(form({ kind: 'add', requestedName: 'Ada', email: 'nope', role: 'x' })).email);
  assert.ok(checkAckRequest(form({ kind: 'add', requestedName: 'Ada', email: 'a@b.org', contributionUrl: 'javascript:x' })).contributionUrl);
  assert.ok(checkAckRequest(form({ kind: 'add', requestedName: 'x'.repeat(81), email: 'a@b.org', role: 'x' })).requestedName);
});

test('the payload leaves out fields hidden for the kind and carries the honeypot and timing', () => {
  const f = form({
    kind: 'remove', requestedName: 'Prefilled Name', currentName: ' Ada Lovelace ', email: ' ada@example.com ',
    contribution: 'hidden', affiliation: 'hidden', website: '',
  });
  const p = ackRequestPayload(f, 4321.6);
  assert.equal(p.kind, 'remove');
  assert.equal(p.requested_name, '');
  assert.equal(p.current_name, 'Ada Lovelace');
  assert.equal(p.contribution, '');
  assert.equal(p.affiliation, '');
  assert.equal(p.email, 'ada@example.com');
  assert.equal(p.website, '');
  assert.equal(p.elapsed_ms, 4322);
  assert.deepEqual(ackFieldsFor('add'), { requestedName: true, currentName: false, contribution: true, affiliation: false, targetList: false });
});

test('client IP comes from X-Real-IP, else the last forwarded hop', () => {
  const h = (o) => ({ get: (n) => o[n] ?? null });
  assert.equal(clientIpFromHeaders(h({ 'x-real-ip': '203.0.113.5', 'x-forwarded-for': '1.1.1.1' })), '203.0.113.5');
  assert.equal(clientIpFromHeaders(h({ 'x-forwarded-for': '6.6.6.6, 198.51.100.2' })), '198.51.100.2');
  assert.equal(clientIpFromHeaders(h({})), '');
});
