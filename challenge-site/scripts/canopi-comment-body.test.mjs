// Canopi spec §G: comments drafted with Deepi post as the person, AI-assisted, never as Deepi.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCanopiCommentBody, MAX_COMMENT_CHARS } from '../src/lib/canopi-comment-body.ts';

const defaults = { pageId: 'book_desirableproperties_org_viewer_dp04', communityId: 'c0f30bc5-de17-4328-80d9-ff8f364907da' };
const MID = '44444444-4444-4444-4444-444444444444';

test('page comment with AI-assisted provenance', () => {
  const r = buildCanopiCommentBody({ content: '  My comment.  ', perspective: 'steward', edited: true }, defaults);
  assert.deepEqual(r, { body: { content: 'My comment.', ...defaults, sourceApp: 'deepi-comment', aiAssist: { assisted: true, action: 'deepi_comment_steward', edited: true } } });
});

test('reply and quote targets need a message id', () => {
  assert.equal(buildCanopiCommentBody({ content: 'x', target: { kind: 'reply', messageId: MID } }, defaults).body.parentId, MID);
  assert.equal(buildCanopiCommentBody({ content: 'x', target: { kind: 'quote', messageId: MID } }, defaults).body.quoteId, MID);
  assert.deepEqual(buildCanopiCommentBody({ content: 'x', target: { kind: 'reply', messageId: 'nope' } }, defaults), { error: 'target_message_required' });
});

test('rejects empty and too-long content; unknown perspective is custom', () => {
  assert.deepEqual(buildCanopiCommentBody({ content: '   ' }, defaults), { error: 'content_required' });
  assert.deepEqual(buildCanopiCommentBody({ content: 'a'.repeat(MAX_COMMENT_CHARS + 1) }, defaults), { error: 'content_too_long' });
  assert.equal(buildCanopiCommentBody({ content: 'x', perspective: 'evil' }, defaults).body.aiAssist.action, 'deepi_comment_custom');
});
