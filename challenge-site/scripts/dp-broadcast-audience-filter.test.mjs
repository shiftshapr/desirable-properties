import assert from 'node:assert/strict';

function extractDpId(name) {
  const match = String(name || '').match(/^DP(\d+)\b/i);
  return match ? `DP${match[1]}` : null;
}

function cohortUsesDpChallengeFilters(cohort) {
  return cohort === 'dp_challenge';
}

function normalizeBroadcastEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function cohortRecipientKeyForEmail(email) {
  return `cohort:${normalizeBroadcastEmail(email)}`;
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
  const cohort = opts.cohort || 'all';
  const patchFilter = cohortUsesDpChallengeFilters(cohort) ? opts.patchFilter || 'all' : 'all';
  const dpScope = cohortUsesDpChallengeFilters(cohort) ? opts.dpScope || 'all' : 'all';
  const dpId = dpScope === 'specific' ? String(opts.dpId || '').trim().toUpperCase() || null : null;

  if (dpId && !rowMatchesDpScope(row, dpId)) return false;
  if (patchFilter === 'submitted' && !rowHasPatchForFilter(row, dpId)) return false;
  if (patchFilter === 'not_submitted' && rowHasPatchForFilter(row, dpId)) return false;
  return true;
}

function syntheticCohortRow(email, cohort) {
  const normalized = normalizeBroadcastEmail(email);
  return {
    key: cohortRecipientKeyForEmail(normalized),
    userId: null,
    userName: normalized,
    email: normalized,
    workgroups: [],
    cohortOnly: true,
    cohortSource: cohort,
  };
}

const CFI2_SUBMITTER_EMAILS = [
  'alex.nassarius@gmail.com',
  'sfghoagland@gmail.com',
];

const COHORT_EMAILS = {
  cfi1_pci: ['kevin@peoplecentered.net'],
  cfi1_zoom: [],
  cfi2_submitters: CFI2_SUBMITTER_EMAILS,
};

function applyBroadcastCohortFilter(audience, cohort) {
  if (cohort === 'all' || cohort === 'dp_challenge') {
    return audience.map((row) => ({ ...row, cohortOnly: false }));
  }

  const cohortEmails = COHORT_EMAILS[cohort] || [];
  if (cohort === 'cfi1_zoom' && cohortEmails.length === 0) return [];

  const emailSet = new Set(cohortEmails.map(normalizeBroadcastEmail));
  const matched = [];
  const matchedEmails = new Set();

  for (const row of audience) {
    const email = normalizeBroadcastEmail(row.email);
    if (!email || !emailSet.has(email)) continue;
    matched.push({ ...row, cohortOnly: false, cohortSource: cohort });
    matchedEmails.add(email);
  }

  for (const email of cohortEmails) {
    const normalized = normalizeBroadcastEmail(email);
    if (!normalized.includes('@') || matchedEmails.has(normalized)) continue;
    matched.push(syntheticCohortRow(normalized, cohort));
  }

  return matched;
}

const rowDp1 = {
  userId: 'u1',
  email: 'alice@example.com',
  workgroups: ['DP1 Federated Auth'],
  hasSubmittedPatch: true,
  patchDpIds: ['DP1'],
};

const rowDp2NoPatch = {
  userId: 'u2',
  email: 'bob@example.com',
  workgroups: ['DP2 Discovery'],
  hasSubmittedPatch: false,
  patchDpIds: [],
};

assert.equal(
  broadcastAudienceMatchesFilters(rowDp1, {
    cohort: 'dp_challenge',
    patchFilter: 'submitted',
    dpScope: 'all',
  }),
  true,
);
assert.equal(
  broadcastAudienceMatchesFilters(rowDp2NoPatch, {
    cohort: 'dp_challenge',
    patchFilter: 'submitted',
    dpScope: 'all',
  }),
  false,
);
assert.equal(
  broadcastAudienceMatchesFilters(rowDp2NoPatch, {
    cohort: 'dp_challenge',
    patchFilter: 'not_submitted',
    dpScope: 'all',
  }),
  true,
);
assert.equal(
  broadcastAudienceMatchesFilters(rowDp1, {
    cohort: 'dp_challenge',
    patchFilter: 'all',
    dpScope: 'specific',
    dpId: 'DP1',
  }),
  true,
);
assert.equal(
  broadcastAudienceMatchesFilters(rowDp1, {
    cohort: 'dp_challenge',
    patchFilter: 'all',
    dpScope: 'specific',
    dpId: 'DP2',
  }),
  false,
);

assert.equal(
  broadcastAudienceMatchesFilters(rowDp1, {
    cohort: 'cfi1_pci',
    patchFilter: 'submitted',
    dpScope: 'specific',
    dpId: 'DP1',
  }),
  true,
  'non-dp_challenge cohort ignores patch/dp filters',
);

const audience = [
  { key: 'u-pat', email: 'sfghoagland@gmail.com', userName: 'Pat Hoagland', workgroups: ['DP3'] },
  { key: 'u-other', email: 'other@example.com', userName: 'Other', workgroups: [] },
];

const cfi2 = applyBroadcastCohortFilter(audience, 'cfi2_submitters');
assert.ok(cfi2.some((r) => r.email === 'sfghoagland@gmail.com' && !r.cohortOnly));
assert.ok(cfi2.some((r) => r.cohortOnly && r.email === 'alex.nassarius@gmail.com'));

const zoom = applyBroadcastCohortFilter(audience, 'cfi1_zoom');
assert.equal(zoom.length, 0);

console.log('dp broadcast audience filter tests: ok');
