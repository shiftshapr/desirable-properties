import assert from 'node:assert/strict';

function extractDpId(name) {
  const match = String(name || '').match(/^DP(\d+)\b/i);
  return match ? `DP${match[1]}` : null;
}

function rowMatchesDpScope(row, dpId) {
  if (!dpId) return true;
  return row.workgroups.some((name) => extractDpId(name) === dpId);
}

function rowHasPatchForFilter(row, dpId) {
  if (!dpId) return Boolean(row.hasSubmittedPatch);
  return Boolean(row.patchDpIds?.includes(dpId));
}

function broadcastAudienceMatchesFilters(row, opts = {}) {
  const patchFilter = opts.patchFilter || 'all';
  const dpScope = opts.dpScope || 'all';
  const dpId = dpScope === 'specific' ? String(opts.dpId || '').trim().toUpperCase() || null : null;

  if (dpId && !rowMatchesDpScope(row, dpId)) return false;
  if (patchFilter === 'submitted' && !rowHasPatchForFilter(row, dpId)) return false;
  if (patchFilter === 'not_submitted' && rowHasPatchForFilter(row, dpId)) return false;
  return true;
}

const rowDp1 = {
  userId: 'u1',
  workgroups: ['DP1 Federated Auth'],
  hasSubmittedPatch: true,
  patchDpIds: ['DP1'],
};

const rowDp2NoPatch = {
  userId: 'u2',
  workgroups: ['DP2 Discovery'],
  hasSubmittedPatch: false,
  patchDpIds: [],
};

assert.equal(broadcastAudienceMatchesFilters(rowDp1, { patchFilter: 'submitted', dpScope: 'all' }), true);
assert.equal(broadcastAudienceMatchesFilters(rowDp2NoPatch, { patchFilter: 'submitted', dpScope: 'all' }), false);
assert.equal(
  broadcastAudienceMatchesFilters(rowDp2NoPatch, { patchFilter: 'not_submitted', dpScope: 'all' }),
  true,
);
assert.equal(
  broadcastAudienceMatchesFilters(rowDp1, { patchFilter: 'all', dpScope: 'specific', dpId: 'DP1' }),
  true,
);
assert.equal(
  broadcastAudienceMatchesFilters(rowDp1, { patchFilter: 'all', dpScope: 'specific', dpId: 'DP2' }),
  false,
);
assert.equal(rowHasPatchForFilter(rowDp1, 'DP1'), true);
assert.equal(rowHasPatchForFilter(rowDp1, 'DP2'), false);

console.log('dp broadcast audience filter tests: ok');
