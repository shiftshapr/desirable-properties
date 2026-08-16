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
