// MTP tab: the chapter's MTP lines and the record of MTP proposals.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentMtpFromPassages, isMtpText, mtpHistory, parseMtp } from '../src/lib/dp-mtp.ts';

test('reads the MTP and plain-words lines from chapter passages', () => {
  const passages = [
    '# DP23 – Universal Participation',
    '*The Conditions for Shared Global Sensemaking*',
    '**MTP:** Every voice understood, no voice erased.',
    '**In plain words:** You can take part in your own language.',
    '![Illustration](/content/local/assets/dp/DP23.webp)',
  ];
  assert.deepEqual(currentMtpFromPassages(passages), {
    mtp: 'Every voice understood, no voice erased.',
    plain: 'You can take part in your own language.',
  });
  assert.equal(currentMtpFromPassages(passages.filter((p) => !p.includes('MTP'))), null);
});

test('recognises MTP proposals and builds the history newest first', () => {
  const block = '**MTP:** One web.\n\n**In plain words:** Move freely.';
  assert.ok(isMtpText(block));
  assert.ok(!isMtpText('A normal proposal.'));
  assert.deepEqual(parseMtp(block), { mtp: 'One web.', plain: 'Move freely.' });
  const history = mtpHistory([
    { id: 'a', status: 'accepted', proposed_text: block, reviewed_at: '2026-11-05T10:00:00', approvals: [{ user_id: 'u1', user_name: 'Ana' }, { user_id: 'u2', user_name: 'Ben' }] },
    { id: 'b', status: 'pending', proposed_text: block },
    { id: 'c', status: 'declined', proposed_text: '**MTP:** Islands.', reviewed_at: '2026-11-06T10:00:00', review_note: 'Too narrow' },
    { id: 'd', status: 'accepted', proposed_text: 'Not an MTP.' },
  ]);
  assert.deepEqual(history.map((h) => h.proposalId), ['c', 'a']);
  assert.deepEqual(history[1].approvers, ['Ana', 'Ben']);
  assert.equal(history[0].note, 'Too narrow');
});
