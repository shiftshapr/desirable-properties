// Edition labels on API answers (src/lib/book-editions.ts), against the committed manifest and variants of it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { liveEdition, resolveEdition } from '../src/lib/book-editions.ts';

const MANIFEST = JSON.parse(fs.readFileSync(new URL('../../desirableproperties-book/json/editions.json', import.meta.url), 'utf8'));
const clone = () => JSON.parse(JSON.stringify(MANIFEST));

test('live text of an unchanged chapter is labelled Version 1.0, released', () => {
  const f = liveEdition(MANIFEST, 'ML-Draft-008');
  assert.equal(f.edition, '1.0');
  assert.equal(f.editionStatus, 'released');
  assert.equal(f.revision, '06');
});

test('a post-1.0 revision is labelled Version 1.1, in progress', () => {
  const m = clone();
  const cur = m.editions.find((e) => e.status === 'in_progress');
  Object.assign(cur.rails.find((r) => r.railKey === 'dp01'), { submissionId: 'new', revision: '07', revisionEdition: '1.1' });
  const f = liveEdition(m, 'ML-Draft-008');
  assert.deepEqual([f.edition, f.editionStatus, f.editionLabel], ['1.1', 'in_progress', 'Version 1.1, in progress']);
  const r = resolveEdition(m, 'ML-Draft-008', '1.0');
  assert.equal(r.ok, true);
  assert.equal(r.isLive, false);
  assert.equal(r.fields.revision, '06');
});

test('?edition=0.77 resolves the inscribed draft and is not the live text', () => {
  const r = resolveEdition(MANIFEST, 'ML-Draft-008', '0.77');
  assert.equal(r.ok, true);
  assert.equal(r.isLive, false);
  assert.equal(r.fields.revisionEdition, '0.77');
});

test('unknown edition, chapter outside an edition, and no manifest', () => {
  assert.equal(resolveEdition(MANIFEST, 'ML-Draft-008', '9.9').status, 404);
  assert.equal(resolveEdition(MANIFEST, 'ML-Draft-057', '0.77').status, 404);
  assert.equal(resolveEdition(null, 'ML-Draft-008', null), null);
  assert.equal(resolveEdition(null, 'ML-Draft-008', '1.0').status, 404);
  assert.equal(resolveEdition(MANIFEST, 'ML-Draft-999', null), null);
});

