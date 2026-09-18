import assert from 'node:assert/strict';
import test from 'node:test';

// Minimal mirrors of revision fingerprint + markdown parse (keep in sync with hermesContribution.ts)
function proposalFingerprintContent(proposal, revisionOfMessageId = null) {
  let content = '';
  if (proposal.kind === 'patch') {
    const p = proposal.payload;
    content = [
      String(p.original_text || '').trim(),
      String(p.proposed_text || '').trim(),
      String(p.patch_mode || 'replace').toLowerCase(),
    ].join('|');
  } else {
    content = String(proposal.payload.text || '').trim();
  }
  if (revisionOfMessageId) content = `${content}|rev:${revisionOfMessageId}`;
  return content;
}

function normalizeLedgerLabel(label) {
  const lower = String(label || '').trim().toLowerCase();
  if (lower.includes('insert')) return 'Insert';
  if (lower.includes('patch')) return 'Patch';
  if (lower.includes('comment')) return 'Comment';
  return String(label || '').trim();
}

function proposalLabelsSignature(proposals) {
  const labels = proposals.map((p) => {
    if (p.label) return normalizeLedgerLabel(p.label);
    if (p.kind === 'comment') return 'Comment';
    const mode = String(p.payload?.patch_mode || 'replace').toLowerCase();
    return mode === 'insert' ? 'Insert' : 'Patch';
  });
  return labels.sort().join('|');
}

function isDraftDuplicateOfLedgerByLabels(draft, sets, sourceTurnId) {
  const ref = String(draft.draftRef || '').trim().toUpperCase();
  if (!ref) return false;
  const draftProposals = draft.proposals?.length
    ? draft.proposals
    : [{ id: 'p0', kind: draft.kind, payload: draft.payload }];
  const draftSig = proposalLabelsSignature(draftProposals);
  const candidates = sets.filter((s) => {
    if (String(s.draftRef || '').trim().toUpperCase() !== ref) return false;
    if (s.status !== 'complete' && s.status !== 'partial') return false;
    if (sourceTurnId && s.sourceTurnId !== sourceTurnId) return false;
    return true;
  });
  return candidates.some(
    (s) => proposalLabelsSignature(s.proposals || []) === draftSig
      && (s.proposals?.length || 0) === draftProposals.length,
  );
}

function parseContributionRecordProposals(markdown) {
  const text = String(markdown || '');
  const sectionRe = /^###\s+\d+\.\s+(.+)$/gm;
  const matches = [...text.matchAll(sectionRe)];
  const proposals = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const block = text.slice(start, end).trim();
    const label = String(matches[i][1] || '').trim().toLowerCase();
    const kind = label === 'comment' ? 'comment' : 'patch';
    const field = (name) => {
      if (name === 'Proposed text') {
        const match = block.match(
          /\*\*Proposed text\*\*\s*(?:\([^)]+\))?\s*\n+([\s\S]*?)(?:\n\n\*\*|$)/i,
        );
        return match?.[1]?.trim() || '';
      }
      const re = new RegExp(`\\*\\*${name}\\*\\*\\s*\\n+([\\s\\S]*?)(?:\\n\\n\\*\\*|$)`, 'i');
      return block.match(re)?.[1]?.trim() || '';
    };
    if (kind === 'comment') {
      proposals.push({ kind, payload: { text: field('Comment') } });
    } else {
      const proposedHeader = block.match(/\*\*Proposed text\*\*\s*\(([^)]+)\)/i);
      const patchMode = proposedHeader?.[1]?.trim().toLowerCase() === 'insert' ? 'insert' : 'replace';
      proposals.push({
        kind,
        payload: {
          original_text: field('Anchor passage'),
          proposed_text: field('Proposed text'),
          rationale: field('Rationale'),
          patch_mode: patchMode,
        },
      });
    }
  }
  return proposals;
}

test('revision fingerprint differs from original filing', () => {
  const proposal = {
    kind: 'patch',
    payload: {
      original_text: 'foo',
      proposed_text: 'bar',
      patch_mode: 'replace',
    },
  };
  const base = proposalFingerprintContent(proposal);
  const rev = proposalFingerprintContent(proposal, 'msg-123');
  assert.notEqual(base, rev);
  assert.match(rev, /rev:msg-123/);
});

test('isDraftDuplicateOfLedgerByLabels matches backfilled link-id fingerprints', () => {
  const draft = {
    kind: 'patch',
    draftRef: 'ML-5',
    title: 'Test',
    summary: '',
    payload: {},
    proposals: [
      { id: 'p1', kind: 'patch', payload: { original_text: 'a', proposed_text: 'b', patch_mode: 'replace' } },
      { id: 'p2', kind: 'patch', payload: { original_text: 'c', proposed_text: 'd', patch_mode: 'insert' } },
    ],
  };
  const sets = [{
    id: 'set-1',
    threadId: 't1',
    sourceTurnId: 'turn-18',
    draftRef: 'ML-5',
    mode: 'publish',
    status: 'complete',
    createdAt: '2026-08-15T06:00:00Z',
    proposals: [
      { proposalId: 'p1', kind: 'patch', label: 'Patch', status: 'published', fingerprint: 'link-id-hash-1' },
      { proposalId: 'p2', kind: 'patch', label: 'Insert', status: 'published', fingerprint: 'link-id-hash-2' },
    ],
  }];
  assert.equal(isDraftDuplicateOfLedgerByLabels(draft, sets, 'turn-18'), true);
  assert.equal(isDraftDuplicateOfLedgerByLabels(draft, sets, 'turn-17'), false);

  const backfillSets = [{
    ...sets[0],
    proposals: [
      { proposalId: 'p1', kind: 'patch', label: 'View post: Patch', status: 'published', fingerprint: 'x' },
      { proposalId: 'p2', kind: 'patch', label: 'View post: Insert', status: 'published', fingerprint: 'y' },
    ],
  }];
  assert.equal(isDraftDuplicateOfLedgerByLabels(draft, backfillSets, 'turn-18'), true);
});

test('shouldBlockDraftRestore matches when assistantMessageId differs from ledger sourceTurnId', async () => {
  const draft = {
    kind: 'patch',
    draftRef: 'ML-5',
    title: 'Test',
    summary: '',
    payload: {},
    proposals: [
      { id: 'p1', kind: 'patch', payload: { original_text: 'a', proposed_text: 'b', patch_mode: 'replace' } },
      { id: 'p2', kind: 'patch', payload: { original_text: 'c', proposed_text: 'd', patch_mode: 'insert' } },
    ],
  };
  const sets = [{
    id: 'set-1',
    threadId: 't1',
    sourceTurnId: 'hermes:memory:turn-18',
    draftRef: 'ML-5',
    mode: 'publish',
    status: 'complete',
    createdAt: '2026-08-15T06:00:00Z',
    proposals: [
      { proposalId: 'p1', kind: 'patch', label: 'View post: Patch', status: 'published', fingerprint: 'x' },
      { proposalId: 'p2', kind: 'patch', label: 'View post: Insert', status: 'published', fingerprint: 'y' },
    ],
  }];
  // Pending draft saved with wrong assistant turn — thread-level label match must still block.
  assert.equal(isDraftDuplicateOfLedgerByLabels(draft, sets, 'hermes:memory:turn-17'), false);
  assert.equal(isDraftDuplicateOfLedgerByLabels(draft, sets), true);
});

test('parseContributionRecordProposals extracts patch fields', () => {
  const md = [
    '## Contribution published to Canopi Discuss',
    '',
    '**Title**',
    '',
    '**Target:** ML-5',
    '',
    '### 1. Patch',
    '',
    '**Anchor passage**',
    '',
    'original line',
    '',
    '**Proposed text** (replace)',
    '',
    'new line',
    '',
    '**Rationale**',
    '',
    'because',
  ].join('\n');

  const rows = parseContributionRecordProposals(md);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'patch');
  assert.equal(rows[0].payload.original_text, 'original line');
  assert.equal(rows[0].payload.proposed_text, 'new line');
  assert.equal(rows[0].payload.rationale, 'because');
});

function proposalsToStage(draft, proposals) {
  const dirty = new Set(draft.dirtyProposalIds || []);
  if (!dirty.size) return proposals;
  return proposals.filter((p) => dirty.has(p.id));
}

function mergeContributionSetForPartialSave(existingSet, dirtyProposalsWithFp) {
  const dirtyById = new Map(dirtyProposalsWithFp.map((p) => [p.id, p]));
  return {
    ...existingSet,
    proposals: existingSet.proposals.map((row) => {
      const dirty = dirtyById.get(row.proposalId);
      if (!dirty) return row;
      return { ...row, fingerprint: dirty.fingerprint, status: 'pending' };
    }),
  };
}

test('proposalsToStage sends only dirty proposals on partial re-save', () => {
  const draft = {
    draftRef: 'ML-5',
    dirtyProposalIds: ['p1'],
    proposals: [
      { id: 'p1', kind: 'patch', payload: { original_text: 'a', proposed_text: 'b' } },
      { id: 'p2', kind: 'patch', payload: { original_text: 'c', proposed_text: 'd', patch_mode: 'insert' } },
    ],
  };
  const staged = proposalsToStage(draft, draft.proposals);
  assert.equal(staged.length, 1);
  assert.equal(staged[0].id, 'p1');
});

test('mergeContributionSetForPartialSave keeps sibling proposals in ledger set', () => {
  const existingSet = {
    id: 'set-1',
    draftRef: 'ML-5',
    mode: 'draft',
    status: 'complete',
    proposals: [
      { proposalId: 'p1', label: 'Patch', status: 'draft', fingerprint: 'fp1', canopiDraftId: 'd1' },
      { proposalId: 'p2', label: 'Insert', status: 'draft', fingerprint: 'fp2', canopiDraftId: 'd2' },
    ],
  };
  const merged = mergeContributionSetForPartialSave(existingSet, [
    { id: 'p1', fingerprint: 'fp1-edited' },
  ]);
  assert.equal(merged.proposals.length, 2);
  assert.equal(merged.proposals[0].fingerprint, 'fp1-edited');
  assert.equal(merged.proposals[0].status, 'pending');
  assert.equal(merged.proposals[1].proposalId, 'p2');
  assert.equal(merged.proposals[1].canopiDraftId, 'd2');
  assert.equal(merged.proposals[1].fingerprint, 'fp2');
});

// Thread-scoped pending + staged storage (keep in sync with hermesContribution.ts)
const STAGED_KEY = 'hermes-staged-proposals-v1';
const PENDING_DRAFT_KEY = 'hermes-pending-contribution-draft-v1';
const PENDING_DRAFT_KEY_PREFIX = `${PENDING_DRAFT_KEY}:`;

function makeMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

let sessionStorage;
let localStorage;

function pendingDraftStorageKey(threadId) {
  const id = String(threadId || '').trim();
  if (!id) return null;
  return `${PENDING_DRAFT_KEY_PREFIX}${id}`;
}

function saveStagedProposal(draft, threadId) {
  const sourceThreadId = String(threadId || draft.sourceThreadId || '').trim() || null;
  const existing = loadStagedProposals();
  const next = [
    {
      ...draft,
      sourceThreadId,
      title: draft.title || 'Staged proposals',
      savedAt: new Date().toISOString(),
    },
    ...existing.filter((row) => {
      if (!sourceThreadId) return true;
      return String(row.sourceThreadId || '').trim() !== sourceThreadId
        || String(row.draftRef || '').trim().toUpperCase()
          !== String(draft.draftRef || '').trim().toUpperCase();
    }),
  ].slice(0, 20);
  localStorage.setItem(STAGED_KEY, JSON.stringify(next));
}

function loadStagedProposals() {
  const raw = localStorage.getItem(STAGED_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function loadStagedProposalsForThread(threadId) {
  const id = String(threadId || '').trim();
  if (!id) return [];
  return loadStagedProposals().filter((row) => String(row.sourceThreadId || '').trim() === id);
}

function savePendingContributionDraft(draft, threadId, assistantMessageId) {
  const key = pendingDraftStorageKey(threadId);
  if (!key) return;
  const payload = {
    threadId,
    assistantMessageId: assistantMessageId || null,
    draft: {
      ...draft,
      sourceThreadId: threadId || draft.sourceThreadId,
      sourceAssistantMessageId: assistantMessageId || draft.sourceAssistantMessageId || null,
    },
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(key, JSON.stringify(payload));
  const legacyRaw = sessionStorage.getItem(PENDING_DRAFT_KEY);
  if (legacyRaw) {
    const legacy = JSON.parse(legacyRaw);
    if (!legacy?.threadId || legacy.threadId === threadId) {
      sessionStorage.removeItem(PENDING_DRAFT_KEY);
    }
  }
  saveStagedProposal(payload.draft, threadId);
}

function loadPendingContributionDraft(threadId) {
  const key = pendingDraftStorageKey(threadId);
  if (!key) return null;
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    const legacyRaw = sessionStorage.getItem(PENDING_DRAFT_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw);
    if (!legacy?.draft) return null;
    if (!legacy.threadId || legacy.threadId !== threadId) return null;
    return legacy;
  }
  const parsed = JSON.parse(raw);
  if (!parsed?.draft) return null;
  if (threadId && parsed.threadId && parsed.threadId !== threadId) return null;
  return parsed;
}

function sampleDraft(draftRef = 'ML-5', extra = {}) {
  return {
    kind: 'patch',
    draftRef,
    title: 'Thread pin draft',
    summary: 'summary',
    payload: { original_text: 'a', proposed_text: 'b', patch_mode: 'replace' },
    ...extra,
  };
}

test('pending draft saved on thread A does not load on thread B', () => {
  sessionStorage = makeMemoryStorage();
  localStorage = makeMemoryStorage();
  savePendingContributionDraft(sampleDraft(), 'thread-a', 'msg-a');
  assert.equal(loadPendingContributionDraft('thread-b'), null);
  const loaded = loadPendingContributionDraft('thread-a');
  assert.ok(loaded?.draft);
  assert.equal(loaded.threadId, 'thread-a');
  assert.equal(loaded.draft.sourceThreadId, 'thread-a');
});

test('loadStagedProposalsForThread only returns matching sourceThreadId', () => {
  sessionStorage = makeMemoryStorage();
  localStorage = makeMemoryStorage();
  saveStagedProposal(sampleDraft('ML-5'), 'thread-a');
  saveStagedProposal(sampleDraft('ML-6'), 'thread-b');
  saveStagedProposal(sampleDraft('ML-5', { title: 'Unscoped leftover' }), null);

  const forA = loadStagedProposalsForThread('thread-a');
  const forB = loadStagedProposalsForThread('thread-b');
  const forC = loadStagedProposalsForThread('thread-c');

  assert.equal(forA.length, 1);
  assert.equal(forA[0].draftRef, 'ML-5');
  assert.equal(forA[0].sourceThreadId, 'thread-a');
  assert.equal(forB.length, 1);
  assert.equal(forB[0].draftRef, 'ML-6');
  assert.equal(forC.length, 0);
  assert.equal(loadStagedProposals().some((row) => row.title === 'Unscoped leftover'), true);
});

test('legacy unscoped pending still loads when threadIds match', () => {
  sessionStorage = makeMemoryStorage();
  localStorage = makeMemoryStorage();
  const legacy = {
    threadId: 'thread-a',
    assistantMessageId: 'msg-legacy',
    draft: sampleDraft(),
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(legacy));

  const matched = loadPendingContributionDraft('thread-a');
  assert.ok(matched?.draft);
  assert.equal(matched.threadId, 'thread-a');
  assert.equal(matched.assistantMessageId, 'msg-legacy');
  assert.equal(loadPendingContributionDraft('thread-b'), null);
});

test('legacy pending without a threadId does not restore onto another thread', () => {
  sessionStorage = makeMemoryStorage();
  localStorage = makeMemoryStorage();
  sessionStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify({
    threadId: null,
    draft: sampleDraft(),
    savedAt: new Date().toISOString(),
  }));
  assert.equal(loadPendingContributionDraft('thread-a'), null);
});

function contributionSubmitBlockedByJudge(mode, judgeBlocked) {
  if (!judgeBlocked) return false;
  return mode === 'publish' || mode === 'replace';
}

test('publish stays blocked when the judge fails; draft save does not', () => {
  assert.equal(contributionSubmitBlockedByJudge('publish', true), true);
  assert.equal(contributionSubmitBlockedByJudge('replace', true), true);
  assert.equal(contributionSubmitBlockedByJudge('draft', true), false);
  assert.equal(contributionSubmitBlockedByJudge('publish', false), false);
});
