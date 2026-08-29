import assert from 'node:assert/strict';
import test from 'node:test';

/** Mirrors HermesChat loadThread message apply guard. */
function shouldApplyThreadMessages({
  threadId,
  displayedThreadId,
  nextFingerprint,
  currentFingerprint,
  preserveSelection,
}) {
  if (threadId !== displayedThreadId) return true;
  if (preserveSelection) return false;
  return nextFingerprint !== currentFingerprint;
}

test('always applies messages when switching threads', () => {
  assert.equal(
    shouldApplyThreadMessages({
      threadId: 'b',
      displayedThreadId: 'a',
      nextFingerprint: 'b|',
      currentFingerprint: 'a|',
      preserveSelection: true,
    }),
    true,
  );
});

test('skips refresh while chat text is selected on the same thread', () => {
  assert.equal(
    shouldApplyThreadMessages({
      threadId: 'a',
      displayedThreadId: 'a',
      nextFingerprint: 'a|turn-2',
      currentFingerprint: 'a|turn-1',
      preserveSelection: true,
    }),
    false,
  );
});

test('applies same-thread refresh when selection is clear and fingerprint changed', () => {
  assert.equal(
    shouldApplyThreadMessages({
      threadId: 'a',
      displayedThreadId: 'a',
      nextFingerprint: 'a|turn-2',
      currentFingerprint: 'a|turn-1',
      preserveSelection: false,
    }),
    true,
  );
});

test('skips redundant same-thread refresh when fingerprint is unchanged', () => {
  assert.equal(
    shouldApplyThreadMessages({
      threadId: 'a',
      displayedThreadId: 'a',
      nextFingerprint: 'a|turn-1',
      currentFingerprint: 'a|turn-1',
      preserveSelection: false,
    }),
    false,
  );
});
