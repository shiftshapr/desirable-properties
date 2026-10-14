// Signed-out visitors see the public chat teaser (relay spec goal: anyone can read relayed notes).
// Before: GET /api/workgroups/[id]/messages returned [] without a session, wiping the
// server-rendered teaser after hydration.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PUBLIC_TEASER_LIMIT,
  anonymousTeaserResponse,
  publicMessagesRequest,
} from '../src/lib/workgroup-public-teaser.ts';

test('public request: no Authorization header, no full, no before', () => {
  const req = publicMessagesRequest('https://dev.interfacehub.net/', 'a7bc9478-da04-468b-8768-7fee9dc31224');
  assert.equal(req.url, 'https://dev.interfacehub.net/api/workgroups/a7bc9478-da04-468b-8768-7fee9dc31224/messages/');
  assert.deepEqual(Object.keys(req.headers), ['Accept']);
  assert.doesNotMatch(req.url, /before=|full=/);
});

test('signed-out response keeps the public messages, read-only', () => {
  const msgs = [{ id: 'a', body: 'one' }, { id: 'b', body: 'two', source_channel: 'email-relay' }];
  const r = anonymousTeaserResponse(msgs);
  assert.deepEqual(r.messages.map((m) => m.id), ['a', 'b']);
  assert.equal(r.is_member, false);
  assert.equal(r.can_post, false);
  assert.equal(r.teaser, true);
  assert.equal(r.count, 2);
});

test('teaser limit keeps the latest messages', () => {
  const msgs = Array.from({ length: 8 }, (_, i) => ({ id: `m${i + 1}` }));
  const r = anonymousTeaserResponse(msgs);
  assert.equal(PUBLIC_TEASER_LIMIT, 5);
  assert.deepEqual(r.messages.map((m) => m.id), ['m4', 'm5', 'm6', 'm7', 'm8']);
});

test('missing or bad upstream data gives an empty teaser, not an error', () => {
  assert.deepEqual(anonymousTeaserResponse(null).messages, []);
  assert.deepEqual(anonymousTeaserResponse([null, { body: 'no id' }]).messages, []);
});
