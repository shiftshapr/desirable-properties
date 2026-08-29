import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Mirrors src/lib/hermesComposerCaret.ts – keep in sync when editing caret logic.
 */

function normalizeComposerSelectionAfterEdit(selection) {
  if (selection.start === selection.end) return selection;
  return { start: selection.start, end: selection.start };
}

function clampComposerSelection(selection, maxLen) {
  const len = Math.max(0, maxLen);
  return {
    start: Math.max(0, Math.min(selection.start, len)),
    end: Math.max(0, Math.min(selection.end, len)),
  };
}

function composerSelectionAtEnd(textLen) {
  const end = Math.max(0, textLen);
  return { start: end, end: end };
}

function deleteComposerSelection(value, selection) {
  const { start, end } = selection;
  if (start === end) return null;
  return {
    value: value.slice(0, start) + value.slice(end),
    selection: { start, end: start },
  };
}

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

test('deleteComposerSelection removes highlighted range in one step', () => {
  const result = deleteComposerSelection('hello world', { start: 5, end: 11 });
  assert.deepEqual(result, {
    value: 'hello',
    selection: { start: 5, end: 5 },
  });
});

test('deleteComposerSelection returns null when caret is collapsed', () => {
  assert.equal(deleteComposerSelection('hello', { start: 2, end: 2 }), null);
});

test('normalizeComposerSelectionAfterEdit collapses stale highlight after bulk delete', () => {
  const normalized = normalizeComposerSelectionAfterEdit({ start: 5, end: 11 });
  assert.deepEqual(normalized, { start: 5, end: 5 });
});

test('bulk delete caret restore does not re-expand highlight from onSelect ref', () => {
  const deleted = deleteComposerSelection('abcdef', { start: 2, end: 5 });
  assert.ok(deleted);
  const result = resolveComposerSelection({
    pendingRef: normalizeComposerSelectionAfterEdit(deleted.selection),
    domSelection: { start: 2, end: 5 },
    isFocused: true,
  });
  assert.equal(result.start, 2);
  assert.equal(result.end, 2);
});

test('clampComposerSelection caps indices after maxLength truncate', () => {
  const clamped = clampComposerSelection({ start: 50_000, end: 50_000 }, 48_000);
  assert.deepEqual(clamped, { start: 48_000, end: 48_000 });
});

test('programmatic clear uses end caret instead of stale highlight ref', () => {
  const staleHighlight = { start: 5, end: 11 };
  const capped = 'hello';
  const nextRef = composerSelectionAtEnd(capped.length);
  assert.notDeepEqual(nextRef, staleHighlight);
  const result = resolveComposerSelection({
    pendingRef: nextRef,
    domSelection: staleHighlight,
    isFocused: true,
  });
  assert.equal(result.start, 5);
  assert.equal(result.end, 5);
});
