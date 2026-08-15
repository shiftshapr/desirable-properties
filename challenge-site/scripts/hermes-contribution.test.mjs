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
