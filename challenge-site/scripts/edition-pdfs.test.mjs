// Edition PDF links (src/lib/edition-pdfs.ts): Gov Hub's record decides the file, the label and "latest".
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chapterPdfLink, downloadName, earlierChapterPdfs, latestUrlFor } from '../src/lib/edition-pdfs.ts';

const f = (url, file) => ({ url, file, sha256: 'a'.repeat(64), pages: 10, bytes: 100 });
const set = (id, label, extra = {}) => ({
  editionId: id, label, fixture: false, state: 'published', reason: null, publishedAt: 'x',
  book: f(`/downloads/${id}/book.pdf`, 'book.pdf'), chapters: { dp07: f(`/downloads/${id}/dp07.pdf`, 'dp07.pdf') }, ...extra,
});
const STATE = { latest: set('1.1', 'Version 1.1'), editions: [set('1.1', 'Version 1.1'), set('1.0', 'Version 1.0'),
  { ...set('1.2', 'Version 1.2'), state: 'failed', book: null, chapters: {} }] };

test('the latest published edition is offered, labelled from the record', () => {
  assert.deepEqual(chapterPdfLink(STATE, 'dp07'), {
    href: '/downloads/1.1/dp07.pdf', filename: 'dp07-v1.1.pdf', label: 'Download PDF · Version 1.1', editionId: '1.1' });
  assert.deepEqual(earlierChapterPdfs(STATE, 'dp07').map((e) => e.href), ['/downloads/1.0/dp07.pdf']);
  assert.equal(latestUrlFor(STATE, 'book.pdf'), '/downloads/1.1/book.pdf');
  assert.equal(latestUrlFor(STATE, 'dp07.pdf'), '/downloads/1.1/dp07.pdf');
  assert.equal(latestUrlFor(STATE, 'rights.pdf'), null);
});

test('without an answer the stable latest address is still offered', () => {
  assert.deepEqual(chapterPdfLink(null, 'dp07'), { href: '/downloads/latest/dp07.pdf', filename: 'dp07.pdf', label: 'Download PDF', editionId: null });
  assert.equal(downloadName('1.0', 'book.pdf'), 'desirable-properties-v1.0.pdf');
});
