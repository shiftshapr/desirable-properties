// Review tab: Canopi inserts filed into Gov Hub as a replace are shown as inserts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodedInsertOf } from '../src/lib/encoded-insert.ts';

const MARK = 'Filed from Canopi book insert ab9afc58 (insert below the anchor, encoded as replace).';

test('anchor first is an insert below; only the new text is returned', () => {
  const got = encodedInsertOf({ patch_mode: 'replace', rationale: MARK, original_text: 'Anchor.', proposed_text: 'Anchor.\n\nNew para.' });
  assert.deepEqual(got, { position: 'below', text: 'New para.' });
});

test('anchor last is an insert above, even when the rationale said below (re-anchored)', () => {
  const got = encodedInsertOf({ patch_mode: 'replace', rationale: MARK, original_text: '## 4. Core', proposed_text: '### 3.12 New\n\nBody.\n\n## 4. Core' });
  assert.deepEqual(got, { position: 'above', text: '### 3.12 New\n\nBody.' });
});

test('real replaces and real inserts are left alone', () => {
  assert.equal(encodedInsertOf({ patch_mode: 'replace', rationale: 'Tighten wording.', original_text: 'A.', proposed_text: 'A.\n\nB.' }), null);
  assert.equal(encodedInsertOf({ patch_mode: 'replace', rationale: MARK, original_text: 'Old text.', proposed_text: 'New text.' }), null);
  assert.equal(encodedInsertOf({ patch_mode: 'insert_after', rationale: MARK, original_text: 'A.', proposed_text: 'B.' }), null);
});
