// Session chat API: sign-in on read and post, display names only, its own thread, limits.
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  SESSION_CHAT_LIMITS,
  SESSION_CHAT_MAX_BODY,
  handleSessionChatGet,
  handleSessionChatPatch,
  handleSessionChatPost,
  publicAuthorName,
  sessionChatThreadKey,
} from '../src/lib/sessions/session-chat-core.ts';

const SLUG = 'meta-governance-2026-11-16';
const KEY = 'session:meta-governance-2026-11-16';
const ADA = { userId: 'u-ada', username: 'ada@example.com', displayName: 'Ada Lovelace', email: 'ada@example.com' };
const BOB = { userId: 'u-bob', username: 'bob', displayName: null, email: 'bob@example.com' };

/** In-memory stand-in for dp_community_chat_message, with a workgroup-like and a Hermes thread already in it. */
function fakeDeps(viewer) {
  const rows = [
    { id: '00000000-0000-4000-8000-000000000001', community_thread_id: 'wg-dp13', author_user_id: 'u-x', author_name: 'X', body: 'workgroup secret', source: 'human', created_at: '2026-11-16T10:00:00.000Z', edited_at: null },
    { id: '00000000-0000-4000-8000-000000000002', community_thread_id: 'hermes-thread-abc', author_user_id: 'u-y', author_name: 'Y', body: 'community secret', source: 'human', created_at: '2026-11-16T10:01:00.000Z', edited_at: null },
  ];
  const calls = { list: [], create: [], update: [] };
  const hits = new Map();
  let n = 10;
  const deps = {
    readSession: async () => viewer(),
    list: async (threadKey, limit) => {
      calls.list.push(threadKey);
      return rows.filter((r) => r.community_thread_id === threadKey).slice(-limit);
    },
    create: async ({ threadKey, authorUserId, authorName, body }) => {
      calls.create.push(threadKey);
      const row = {
        id: `00000000-0000-4000-8000-0000000000${n++}`, community_thread_id: threadKey, author_user_id: authorUserId,
        author_name: authorName, body, source: 'human', created_at: new Date().toISOString(), edited_at: null,
      };
      rows.push(row);
      return row;
    },
    update: async ({ threadKey, messageId, authorUserId, body }) => {
      calls.update.push(threadKey);
      const row = rows.find((r) => r.id === messageId && r.community_thread_id === threadKey && r.author_user_id === authorUserId);
      if (!row) return null;
      row.body = body;
      row.edited_at = new Date().toISOString();
      return row;
    },
    allowHit: (key, max) => {
      const c = (hits.get(key) ?? 0) + 1;
      hits.set(key, c);
      return c <= max;
    },
  };
  return { deps, rows, calls };
}

const post = (body, headers = {}) =>
  new Request('https://dp.test/api/sessions/x/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'dp.test', origin: 'https://dp.test', ...headers },
    body: JSON.stringify({ body }),
  });

// The handlers must never call out (no Gov Hub, no Hermes): any fetch fails the test.
beforeEach(() => {
  globalThis.fetch = async (url) => {
    throw new Error(`unexpected fetch ${url}`);
  };
});

test('signed out: read gets 401 and no messages, and the store is never read', async () => {
  const { deps, calls } = fakeDeps(() => null);
  await deps.create({ threadKey: KEY, authorUserId: 'u-ada', authorName: 'Ada', body: 'hello' });
  const res = await handleSessionChatGet(SLUG, deps);
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const data = await res.json();
  assert.equal(data.messages, undefined);
  assert.ok(!JSON.stringify(data).includes('hello'));
  assert.deepEqual(calls.list, []);
});

test('signed out: posting and editing get 401 and nothing is written', async () => {
  const { deps, calls } = fakeDeps(() => null);
  assert.equal((await handleSessionChatPost(post('hi'), SLUG, deps)).status, 401);
  const patch = new Request('https://dp.test/x', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{"body":"x"}' });
  assert.equal((await handleSessionChatPatch(patch, SLUG, '00000000-0000-4000-8000-000000000001', deps)).status, 401);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.update, []);
});

test('a session reader that throws counts as signed out', async () => {
  const { deps } = fakeDeps(() => {
    throw new Error('bad cookie');
  });
  assert.equal((await handleSessionChatGet(SLUG, deps)).status, 401);
});

test('signed in: any account can post (no membership) and read the thread back', async () => {
  const { deps } = fakeDeps(() => BOB);
  const created = await handleSessionChatPost(post('  First question about the ballot  '), SLUG, deps);
  assert.equal(created.status, 201);
  const { message } = await created.json();
  assert.equal(message.body, 'First question about the ballot');
  assert.equal(message.community_thread_id, KEY);
  const res = await handleSessionChatGet(SLUG, deps);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.can_post, true);
  assert.deepEqual(data.messages.map((m) => m.body), ['First question about the ballot']);
});

test('the thread is its own: workgroup and community threads never show, and only session slugs map to a key', async () => {
  const { deps, calls } = fakeDeps(() => ADA);
  const data = await (await handleSessionChatGet(SLUG, deps)).json();
  assert.deepEqual(data.messages, []);
  assert.deepEqual(calls.list, [KEY]);
  assert.equal(sessionChatThreadKey(SLUG), KEY);
  for (const other of ['wg-dp13', 'hermes-thread-abc', 'session:meta-governance-2026-11-16', '', 'meta-governance-2026-11-23']) {
    assert.equal(sessionChatThreadKey(other), null, other);
    assert.equal((await handleSessionChatGet(other, deps)).status, 404, other);
    assert.equal((await handleSessionChatPost(post('x'), other, deps)).status, 404, other);
  }
  assert.deepEqual(calls.create, []);
});

test('messages carry the display name, never an email', async () => {
  assert.equal(publicAuthorName(ADA), 'Ada Lovelace');
  assert.equal(publicAuthorName({ displayName: 'ada@example.com', username: 'ada' }), 'ada');
  assert.equal(publicAuthorName({ displayName: null, username: 'ada@example.com' }), 'Member');
  assert.equal(publicAuthorName({ displayName: ' ', username: '' }), 'Member');

  const { deps, rows } = fakeDeps(() => ({ ...ADA, displayName: null }));
  const { message } = await (await handleSessionChatPost(post('hello'), SLUG, deps)).json();
  assert.equal(message.author_name, 'Member');
  // An older row stored with an email as the name is masked on the way out.
  rows.push({ ...rows[0], id: '00000000-0000-4000-8000-000000000099', community_thread_id: KEY, author_name: 'old@example.com' });
  const out = JSON.stringify(await (await handleSessionChatGet(SLUG, deps)).json());
  assert.ok(!out.includes('@example.com'), out);
});

test('posting checks origin, JSON, emptiness and the 8,000-character limit', async () => {
  const { deps, calls } = fakeDeps(() => ADA);
  assert.equal((await handleSessionChatPost(post('hi', { origin: 'https://evil.test' }), SLUG, deps)).status, 403);
  const form = new Request('https://dp.test/x', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hi' });
  assert.equal((await handleSessionChatPost(form, SLUG, deps)).status, 415);
  assert.equal((await handleSessionChatPost(post('   '), SLUG, deps)).status, 400);
  assert.equal((await handleSessionChatPost(post('x'.repeat(SESSION_CHAT_MAX_BODY + 1)), SLUG, deps)).status, 400);
  assert.equal((await handleSessionChatPost(post('x'.repeat(SESSION_CHAT_MAX_BODY)), SLUG, deps)).status, 201);
  assert.equal(calls.create.length, 1);
});

test('posting is rate limited per account', async () => {
  const { deps } = fakeDeps(() => ADA);
  for (let i = 0; i < SESSION_CHAT_LIMITS.postsPerMinute; i++) {
    assert.equal((await handleSessionChatPost(post(`m${i}`), SLUG, deps)).status, 201);
  }
  assert.equal((await handleSessionChatPost(post('one more'), SLUG, deps)).status, 429);
});

test('authors edit only their own messages', async () => {
  let viewer = ADA;
  const { deps } = fakeDeps(() => viewer);
  const { message } = await (await handleSessionChatPost(post('typo'), SLUG, deps)).json();
  const patch = (body) =>
    new Request('https://dp.test/x', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) });
  viewer = BOB;
  assert.equal((await handleSessionChatPatch(patch('hijack'), SLUG, message.id, deps)).status, 404);
  viewer = ADA;
  const res = await handleSessionChatPatch(patch('fixed'), SLUG, message.id, deps);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).message.body, 'fixed');
  assert.equal((await handleSessionChatPatch(patch('x'), SLUG, 'not-an-id', deps)).status, 404);
});
