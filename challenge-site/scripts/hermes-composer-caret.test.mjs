import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Mirrors HermesChat composer caret preservation: selection ref should drive
 * setSelectionRange after controlled value updates, not a stale rAF read.
 */
function resolveComposerSelection({
  pendingRef,
  domSelection,
  isFocused,
}) {
  const pending = pendingRef;
  const preserveFromDom = !pending
    && isFocused
    && typeof domSelection?.start === 'number'
    && typeof domSelection?.end === 'number';
  const start = pending?.start ?? (preserveFromDom ? domSelection.start : null);
  const end = pending?.end ?? (preserveFromDom ? domSelection.end : null);
  return { start, end, clearRef: Boolean(pending) };
}

test('uses pending ref selection when React resets caret to end', () => {
  const result = resolveComposerSelection({
    pendingRef: { start: 3, end: 3 },
    domSelection: { start: 11, end: 11 },
    isFocused: true,
  });
  assert.equal(result.start, 3);
  assert.equal(result.end, 3);
  assert.equal(result.clearRef, true);
});

test('falls back to DOM selection on resize when no pending ref', () => {
  const result = resolveComposerSelection({
    pendingRef: null,
    domSelection: { start: 5, end: 8 },
    isFocused: true,
  });
  assert.equal(result.start, 5);
  assert.equal(result.end, 8);
  assert.equal(result.clearRef, false);
});

test('does not restore selection when textarea is not focused', () => {
  const result = resolveComposerSelection({
    pendingRef: { start: 2, end: 2 },
    domSelection: { start: 0, end: 0 },
    isFocused: false,
  });
  assert.equal(result.start, 2);
  assert.equal(result.end, 2);
});
