// Review tab: where a passage sits in the chapter, and Deepi's split of one proposal into several.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPassageIndex, sectionLabelFor, sectionTrail } from '../src/lib/chapter-sections.ts';
import { readSplitMark, splitDraftFrom } from '../src/lib/review-split.ts';

const CHAPTER = [
  '# DP11 – Safe and Ethical AI',
  'Intro paragraph.',
  '## 5. Primary Mechanisms',
  '### 5.13 Ethical Failure Cascade',
  '#### 5.13.1 Escalation Thresholds',
  '- **user distress indicators:** language or behavior suggesting vulnerability or harm',
  '### 5.14 Risk-Tiered Enforcement',
  'Higher-risk contexts should require stronger disclosure.',
  '**Why this matters:** Uniform rules cannot adequately govern unequal stakes.',
  '## 9. Foresight and Failure Design',
  '- pre-mortems for manipulation and misuse\n- red-team exercises',
];

test('the trail runs from the section down to the nearest subsection', () => {
  assert.deepEqual(sectionTrail(CHAPTER, 8), ['5. Primary Mechanisms', '5.14 Risk-Tiered Enforcement']);
  assert.deepEqual(sectionTrail(CHAPTER, 5), [
    '5. Primary Mechanisms', '5.13 Ethical Failure Cascade', '5.13.1 Escalation Thresholds',
  ]);
  assert.deepEqual(sectionTrail(CHAPTER, 9), ['9. Foresight and Failure Design']);
  assert.deepEqual(sectionTrail(CHAPTER, 1), []);
});

test('anchors are found as Markdown, as rendered text, and part-way into a block', () => {
  assert.equal(findPassageIndex(CHAPTER, CHAPTER[8]), 8);
  assert.equal(findPassageIndex(CHAPTER, 'Why this matters: Uniform rules cannot adequately govern unequal stakes.'), 8);
  assert.equal(findPassageIndex(CHAPTER, 'user distress indicators'), 5);
  assert.equal(findPassageIndex(CHAPTER, 'Not in the chapter.'), -1);
  assert.equal(sectionLabelFor(CHAPTER, 'pre-mortems for manipulation'), '9. Foresight and Failure Design');
  assert.equal(sectionLabelFor(CHAPTER, 'Not in the chapter.'), null);
});

test('the split marker is removed from the answer and flagged', () => {
  assert.deepEqual(readSplitMark('Split it in two.\n\n[offer-split]'), { answer: 'Split it in two.', offersSplit: true });
  assert.deepEqual(readSplitMark('Fine as it is.'), { answer: 'Fine as it is.', offersSplit: false });
  assert.deepEqual(readSplitMark(null), { answer: null, offersSplit: false });
  // Answers from before the marker are read by their wording (DP11 proposal 93474b85).
  assert.equal(readSplitMark('The profiling sentence works better as a separate proposal. It is a second idea.').offersSplit, true);
  assert.equal(readSplitMark('I would split this into two proposals.').offersSplit, true);
  assert.equal(readSplitMark('The style guide asks for one idea per proposal.').offersSplit, false);
  assert.equal(readSplitMark('It fits in Section 9 as a fourth item.').offersSplit, false);
});

test('drafted parts land on real blocks; bad blocks and placements are dropped', () => {
  const draft = splitDraftFrom({
    note: ' Two ideas, two places. ',
    parts: [
      { block: 10, placement: 'replace', text: '- pre-mortems\n- red-team exercises\n- group-sensitive thresholds', why: 'Testing list.' },
      { block: 5, placement: 'insert_after', text: 'Indicators come from the interaction.', why: 'Next to distress.' },
      { block: 99, placement: 'insert', text: 'Nowhere.', why: '' },
      { block: 2, placement: 'sideways', text: 'Bad mode.', why: '' },
      { block: 3, placement: 'insert', text: '  ', why: '' },
    ],
  }, CHAPTER);
  assert.equal(draft.note, 'Two ideas, two places.');
  assert.deepEqual(draft.parts.map((p) => [p.passageIndex, p.patchMode]), [[10, 'replace'], [5, 'insert_after']]);
  assert.equal(draft.parts[1].passage, CHAPTER[5]);
  assert.deepEqual(splitDraftFrom(null, CHAPTER), { parts: [], note: '' });
});
