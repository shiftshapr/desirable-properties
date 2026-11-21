import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalFromOverview } from '../src/lib/canonical-account.ts';

const overview = {
  canonical_user_id: 'b',
  accounts: [{ id: 'b', username: 'bitracer1', canonical: true }, { id: 'a', username: 'phahsa' }],
};

test('an alias session moves to the canonical account', () => {
  assert.deepEqual(canonicalFromOverview('a', overview), { userId: 'b', username: 'bitracer1', linkedUserIds: ['b', 'a'] });
});

test('a canonical session is left alone', () => {
  assert.equal(canonicalFromOverview('b', overview), null);
});

test('never moves to an account the session user is not linked to', () => {
  assert.equal(canonicalFromOverview('x', overview), null);
  assert.equal(canonicalFromOverview('a', { canonical_user_id: 'b', accounts: [] }), null);
  assert.equal(canonicalFromOverview('a', null), null);
});
