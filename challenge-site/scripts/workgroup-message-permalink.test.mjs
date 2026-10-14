// DP workgroup relay spec B.1 and B.3: chat message permalinks and activity links.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_PERMALINK_PAGES,
  loadOlderUntilMessage,
  mergeOlderMessages,
  normalizeWorkgroupMessageParam,
  workgroupChatMessagePath,
  workgroupMessageAnchorId,
  workgroupMessageEventHref,
} from '../src/lib/workgroup-message-permalink.ts';

const MID = '9b2f4c1e-0a7d-4e2b-8c3f-5d6e7f8a9b0c';

test('permalink path and anchor id', () => {
  assert.equal(workgroupChatMessagePath('dp13-wg', MID), `/workgroups/dp13-wg?tab=chat&m=${MID}`);
  assert.equal(workgroupChatMessagePath('a b', 'x1'), '/workgroups/a%20b?tab=chat&m=x1');
  assert.equal(workgroupMessageAnchorId(MID), `m-${MID}`);
});

test('m param accepts ids, rejects junk', () => {
  assert.equal(normalizeWorkgroupMessageParam(` ${MID} `), MID);
  assert.equal(normalizeWorkgroupMessageParam(''), null);
  assert.equal(normalizeWorkgroupMessageParam(null), null);
  assert.equal(normalizeWorkgroupMessageParam('"><script>'), null);
  assert.equal(normalizeWorkgroupMessageParam('../../etc'), null);
  assert.equal(normalizeWorkgroupMessageParam('x'.repeat(65)), null);
});

test('activity href: message_id links to the message', () => {
  const href = workgroupMessageEventHref({
    slug: 'dp13-wg',
    payload: { message_id: MID, body_preview: 'hi' },
    collabEnabled: true,
    fallbackHref: '/workgroups/dp13-wg',
  });
  assert.equal(href, `/workgroups/dp13-wg?tab=chat&m=${MID}`);
});

test('activity href: without message_id (or slug, or collab page) unchanged', () => {
  const base = { slug: 'dp13-wg', collabEnabled: true, fallbackHref: '/workgroups/dp13-wg' };
  assert.equal(workgroupMessageEventHref({ ...base, payload: { body_preview: 'hi' } }), '/workgroups/dp13-wg');
  assert.equal(workgroupMessageEventHref({ ...base, payload: undefined }), '/workgroups/dp13-wg');
  assert.equal(workgroupMessageEventHref({ ...base, payload: { message_id: 'bad id!' } }), '/workgroups/dp13-wg');
  assert.equal(
    workgroupMessageEventHref({ ...base, slug: '', payload: { message_id: MID }, fallbackHref: '/workgroups' }),
    '/workgroups',
  );
  assert.equal(
    workgroupMessageEventHref({
      ...base,
      collabEnabled: false,
      payload: { message_id: MID },
      fallbackHref: 'https://interfacehub.net/workgroups/dp13-wg/',
    }),
    'https://interfacehub.net/workgroups/dp13-wg/',
  );
});

const msgs = (...ids) => ids.map((id) => ({ id }));

/** Fake server: 30 messages m01..m30, pages of 5 older than `before`. */
function fakeOlder(all, calls) {
  return async (before) => {
    calls.push(before);
    const idx = all.findIndex((m) => m.id === before);
    return all.slice(Math.max(0, idx - 5), idx);
  };
}
const ALL = Array.from({ length: 30 }, (_, i) => ({ id: `m${String(i + 1).padStart(2, '0')}` }));

test('deep link: message already on the latest page needs no fetch', async () => {
  const calls = [];
  const r = await loadOlderUntilMessage({ targetId: 'm28', current: ALL.slice(25), fetchOlder: fakeOlder(ALL, calls) });
  assert.deepEqual(r, { older: [], found: true, pages: 0 });
  assert.equal(calls.length, 0);
});

test('deep link: loads older pages until the message is present', async () => {
  const calls = [];
  const r = await loadOlderUntilMessage({ targetId: 'm12', current: ALL.slice(25), fetchOlder: fakeOlder(ALL, calls) });
  assert.equal(r.found, true);
  assert.deepEqual(calls, ['m26', 'm21', 'm16']);
  assert.deepEqual(r.older.map((m) => m.id), ALL.slice(10, 25).map((m) => m.id));
});

test('deep link: stops when a page adds nothing (server ignores before)', async () => {
  const calls = [];
  const latest = ALL.slice(25);
  const r = await loadOlderUntilMessage({
    targetId: 'm02',
    current: latest,
    fetchOlder: async (b) => { calls.push(b); return latest; },
  });
  assert.deepEqual(r, { older: [], found: false, pages: 1 });
});

test('deep link: bounded by maxPages', async () => {
  const calls = [];
  const many = Array.from({ length: 500 }, (_, i) => ({ id: `x${i}` }));
  const r = await loadOlderUntilMessage({ targetId: 'missing', current: many.slice(495), fetchOlder: fakeOlder(many, calls) });
  assert.equal(r.found, false);
  assert.equal(calls.length, MAX_PERMALINK_PAGES);
});

test('older pages survive a refresh of the latest page', () => {
  const merged = mergeOlderMessages(msgs('a', 'b', 'c'), msgs('c', 'd'));
  assert.deepEqual(merged.map((m) => m.id), ['a', 'b', 'c', 'd']);
});
