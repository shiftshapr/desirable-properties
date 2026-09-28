// Review hole: Canopi book patches must become promotable Gov Hub proposals.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildGovHubPatchPayload,
  locateAnchorInMarkdown,
  parseCanopiAnchor,
} from '../src/lib/canopi-patch-to-govhub.ts';

const MD = [
  '## 13. Stewardship',
  '',
  '### 13.3 We engage differently',
  '',
  'Knowing that ideas may become part of **humanity\'s enduring memory** encourages stewardship.',
  '',
  '### 14. Next',
].join('\n');

test('locates rendered quote across collapsed newlines and stripped emphasis', () => {
  const exact = "### 13.3 We engage differently Knowing that ideas may become part of humanity's enduring memory encourages stewardship.";
  const span = locateAnchorInMarkdown(MD, exact);
  assert.equal(
    span,
    "### 13.3 We engage differently\n\nKnowing that ideas may become part of **humanity's enduring memory** encourages stewardship.",
  );
  assert.ok(MD.includes(span), 'span must be a verbatim substring for Gov Hub splice');
});

test('returns null when the passage is gone', () => {
  assert.equal(locateAnchorInMarkdown(MD, 'text that was edited away'), null);
});

test('parses JSON-string contextAnchor, payload insertPosition and rationale', () => {
  const info = parseCanopiAnchor({
    contextAnchor: JSON.stringify({ anchorType: 'text', textQuote: { exact: 'Hello world' } }),
    payload: { insertPosition: 'below', aiAssist: { patchRationale: 'Why it fits: x' } },
  });
  assert.deepEqual(info, { exact: 'Hello world', insertPosition: 'below', patchRationale: 'Why it fits: x' });
});

test('insert below encodes as anchor + text replace; above as text + anchor', () => {
  const base = {
    kind: 'insert',
    content: '### 13.4 New',
    anchorMarkdown: '### 13.3 Old',
    canopiMessageId: 'm1',
    canopiAuthorName: 'Ada',
    patchRationale: null,
    referenceUrl: null,
  };
  const below = buildGovHubPatchPayload({ ...base, insertPosition: 'below' });
  assert.equal(below.patch_mode, 'replace');
  assert.equal(below.original_text, '### 13.3 Old');
  assert.equal(below.proposed_text, '### 13.3 Old\n\n### 13.4 New');
  assert.match(below.rationale, /Canopi book insert m1 by Ada/);
  const above = buildGovHubPatchPayload({ ...base, insertPosition: 'above' });
  assert.equal(above.proposed_text, '### 13.4 New\n\n### 13.3 Old');
  const dflt = buildGovHubPatchPayload({ ...base, insertPosition: null });
  assert.equal(dflt.proposed_text, below.proposed_text, 'Canopi UI default is insert below');
});

test('patch replaces anchor with content', () => {
  const p = buildGovHubPatchPayload({
    kind: 'patch', content: 'New sentence.', anchorMarkdown: 'Old sentence.', insertPosition: null,
    canopiMessageId: 'm2', canopiAuthorName: null, patchRationale: 'Clearer.', referenceUrl: 'https://x.test',
  });
  assert.equal(p.original_text, 'Old sentence.');
  assert.equal(p.proposed_text, 'New sentence.');
  assert.equal(p.rationale, 'Clearer.\n\nFiled from Canopi book patch m2.');
});
