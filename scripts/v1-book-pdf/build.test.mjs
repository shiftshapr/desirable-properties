// Edition builds from the list (build.mjs): structure, names and the sha256 stop. No Chrome, no network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { editionFileNames, fetchListedText, planEdition, splitPassages } from './build.mjs';

const FIX = new URL('../fixtures/edition-pdfs/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX)));
const sat = JSON.parse(fs.readFileSync(new URL('book/json/sources-sat.json', FIX)));

test('the plan follows the list: a new chapter is placed, a removed one is gone, nothing assumes 24 DPs', () => {
  const plan = planEdition(manifest, sat, '9.9');
  assert.deepEqual(plan.chapters.map((c) => c.railKey), ['rights', 'dp01', 'dp02']);
  assert.equal(plan.chapters[0].dp, null);
  assert.equal(plan.chapters[0].kicker, 'Rights');
  assert.equal(plan.intro.railKey, 'ml-draft-026');
  assert.deepEqual(plan.front, []);
  assert.deepEqual(plan.back.map((m) => m.railKey), ['acknowledgements']);
  assert.ok(!plan.rows.some((r) => r.railKey === 'dp24'));
});

test('file names come from the edition id and rail keys only', () => {
  const names = editionFileNames('9.9', ['rights', 'dp01']);
  assert.equal(names.book, 'book.pdf');
  assert.equal(names.bookDownloadName, 'desirable-properties-v9.9.pdf');
  assert.deepEqual(names.chapters, { rights: 'rights.pdf', dp01: 'dp01.pdf' });
  assert.equal(names.chapterDownloadNames.rights, 'rights-v9.9.pdf');
});

test('a source whose sha256 is not the list\'s stops the build', () => {
  const row = manifest.editions[0].rails.find((r) => r.railKey === 'dp01');
  const good = fs.readFileSync(new URL('texts/sub-dp01.txt', FIX));
  const bad = Buffer.concat([good, Buffer.from('\nchanged\n')]);
  const fetcher = (url) => (url.includes('chapter-passages') ? JSON.stringify({ submission_id: row.submissionId, passages: splitPassages(bad.toString()) }) : bad);
  assert.throws(() => fetchListedText(row, { hub: 'https://hub.test', editionId: '9.9', fetcher }), /STOP: dp01 .* has sha256 [0-9a-f]+, but the edition list says/);
  const ok = (url) => (url.includes('chapter-passages') ? JSON.stringify({ submission_id: row.submissionId, passages: splitPassages(good.toString()) }) : good);
  assert.equal(fetchListedText(row, { hub: 'https://hub.test', editionId: '9.9', fetcher: ok }).toString(), good.toString());
  const other = (url) => (url.includes('chapter-passages') ? JSON.stringify({ submission_id: 'someone-else', passages: [] }) : good);
  assert.throws(() => fetchListedText(row, { hub: 'https://hub.test', editionId: '9.9', fetcher: other }), /STOP: Gov Hub's 9.9 text of dp01 is submission someone-else/);
});
