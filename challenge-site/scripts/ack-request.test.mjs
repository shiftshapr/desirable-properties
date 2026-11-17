// Acknowledgements adjustment request form: field rules, the payload sent to Gov Hub, client IP.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ACK_IMAGE_MAX_BYTES,
  EMPTY_ACK_REQUEST,
  ackFieldsFor,
  ackRequestPayload,
  checkAckImage,
  checkAckRequest,
  clientIpFromHeaders,
  sniffAckImage,
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


test('images: JPEG, PNG or WebP up to 5 MB; HEIC gets its own message', () => {
  const file = (name, type, size = 1000) => ({ name, type, size });
  assert.equal(checkAckImage(file('a.jpg', 'image/jpeg')), null);
  assert.equal(checkAckImage(file('a.png', 'image/png')), null);
  assert.equal(checkAckImage(file('a.webp', 'image/webp')), null);
  assert.equal(checkAckImage(file('a.jpg', '')), null); // some pickers give no type
  assert.match(checkAckImage(file('a.jpg', 'image/jpeg', ACK_IMAGE_MAX_BYTES + 1)), /5 MB/);
  assert.match(checkAckImage(file('a.jpg', 'image/jpeg', 0)), /empty/);
  assert.match(checkAckImage(file('IMG_1.HEIC', 'image/heic')), /HEIC/);
  assert.match(checkAckImage(file('IMG_1.heic', '')), /HEIC/);
  assert.match(checkAckImage(file('a.gif', 'image/gif')), /JPEG, PNG or WebP/);
  assert.match(checkAckImage(file('a.svg', 'image/svg+xml')), /JPEG, PNG or WebP/);
  assert.match(checkAckImage(file('a.pdf', 'application/pdf')), /JPEG, PNG or WebP/);
});

test('images are recognised by their first bytes, not their names', () => {
  const bytes = (...parts) => new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
  assert.equal(sniffAckImage(bytes([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(sniffAckImage(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(sniffAckImage(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ')), 'image/webp');
  assert.equal(sniffAckImage(bytes([0, 0, 0, 0x18], 'ftypheic', [0, 0, 0, 0])), 'heic');
  assert.equal(sniffAckImage(bytes('GIF89a')), null);
  assert.equal(sniffAckImage(bytes('<svg xmlns=')), null);
  assert.equal(sniffAckImage(bytes('%PDF-1.7')), null);
  assert.equal(sniffAckImage(new Uint8Array()), null);
});

// Seeing your own requests (owner, 2026-11-17)
import {
  cleanViewToken,
  isUuid,
  linkTokenFromHash,
  normalizeAckReference,
  viewTokenFromCookieHeader,
} from '../src/lib/ack-request.ts';

const TOKEN = 'abcDEF123_-abcDEF123_-abcDEF123_-abcDEF12';

test('reference codes are normalised and junk refused', () => {
  assert.equal(normalizeAckReference('ack-q4r4zz'), 'ACK-Q4R4ZZ');
  assert.equal(normalizeAckReference(' ACK Q4R4ZZ '), 'ACK-Q4R4ZZ');
  assert.equal(normalizeAckReference('q4r4zz'), 'ACK-Q4R4ZZ');
  for (const bad of ['', 'ACK-Q4R4Z', 'ACK-Q4R4ZZZ', 'ACK-O0I1LU', '<b>x</b>']) assert.equal(normalizeAckReference(bad), null, bad);
});

test('view and link tokens: only Gov Hub-shaped values are accepted', () => {
  assert.equal(cleanViewToken(TOKEN), TOKEN);
  assert.equal(cleanViewToken('short'), null);
  assert.equal(cleanViewToken('has space in it and is long enough'), null);
  assert.equal(cleanViewToken('a'.repeat(201)), null);
  assert.equal(viewTokenFromCookieHeader(`x=1; dp_ack_view=${TOKEN}; y=2`, 'dp_ack_view'), TOKEN);
  assert.equal(viewTokenFromCookieHeader('dp_ack_view=%E0%A4%A', 'dp_ack_view'), null);
  assert.equal(viewTokenFromCookieHeader('other=1', 'dp_ack_view'), null);
  assert.equal(linkTokenFromHash(`#token=${TOKEN}`), TOKEN);
  assert.equal(linkTokenFromHash(`#a=1&token=${TOKEN}`), TOKEN);
  assert.equal(linkTokenFromHash('#token=<script>'), null);
  assert.equal(linkTokenFromHash(''), null);
});

test('ids must be UUIDs before an upstream path is built', () => {
  assert.ok(isUuid('3f2c1a9e-1b2c-4d5e-8f90-0123456789ab'));
  assert.ok(!isUuid('../../admin'));
  assert.ok(!isUuid('3f2c1a9e-1b2c-4d5e-8f90-0123456789ab/../x'));
});

import { ackRequestSummary, ackStatusInfo } from '../src/lib/ack-request.ts';

test('summaries say what was asked for', () => {
  const base = { requested_name: null, current_name: null, affiliation: null, target_list_label: null, note: null };
  assert.equal(ackRequestSummary({ ...base, kind: 'add', requested_name: 'Ada Lovelace' }), 'Add “Ada Lovelace” to the Acknowledgements');
  assert.equal(ackRequestSummary({ ...base, kind: 'correct_name', current_name: 'Ada L', requested_name: 'Ada Lovelace' }), 'Change “Ada L” to “Ada Lovelace”');
  assert.equal(ackRequestSummary({ ...base, kind: 'move', current_name: 'Ada', target_list_label: 'Editors' }), 'Move “Ada” to Editors');
  assert.equal(ackRequestSummary({ ...base, kind: 'remove', current_name: 'Ada' }), 'Remove “Ada”');
  assert.equal(ackRequestSummary({ ...base, kind: 'other', note: 'x'.repeat(200) }).length, 140);
  for (const kind of ['add', 'correct_name', 'affiliation', 'move', 'remove', 'other']) {
    assert.ok(!ackRequestSummary({ ...base, kind }).includes('\u2014'));
  }
});

test('statuses are the review decisions, never ticket states', () => {
  assert.deepEqual(['new', 'accepted', 'declined', 'done'].map((s) => ackStatusInfo(s).label), ['New', 'Accepted', 'Declined', 'Done']);
  assert.equal(ackStatusInfo('weird', 'Weird').label, 'Weird');
  for (const s of ['new', 'accepted', 'declined', 'done']) {
    assert.ok(!/ticket|triaged|closed/i.test(ackStatusInfo(s).meaning));
  }
});
