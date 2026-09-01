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

function applyComposerPaste(value, selection, pasted, maxChars) {
  const { start, end } = selection;
  const merged = value.slice(0, start) + pasted + value.slice(end);
  const capped = merged.length <= maxChars ? merged : merged.slice(0, maxChars);
  const cursor = Math.min(start + pasted.length, capped.length);
  return {
    value: capped,
    selection: clampComposerSelection({ start: cursor, end: cursor }, capped.length),
  };
}

function inferComposerCaretFromDiff(prev, next) {
  if (prev === next) return null;
  let start = 0;
  while (start < prev.length && start < next.length && prev[start] === next[start]) {
    start += 1;
  }
  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
    prevEnd -= 1;
    nextEnd -= 1;
  }
  if (nextEnd > prevEnd) {
    return { start: nextEnd, end: nextEnd };
  }
  if (nextEnd < prevEnd) {
    return { start, end: start };
  }
  if (nextEnd > start) {
    return { start: nextEnd, end: nextEnd };
  }
  return { start, end: start };
}

function resolveCaretAfterNativeEdit(prev, next, reported) {
  const inferred = inferComposerCaretFromDiff(prev, next);
  if (inferred) {
    return clampComposerSelection(inferred, next.length);
  }
  return clampComposerSelection(normalizeComposerSelectionAfterEdit(reported), next.length);
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

// --- Paste scenarios (test matrix) ---

test('paste: empty field without prior keypress', () => {
  const result = applyComposerPaste('', { start: 0, end: 0 }, 'hello world', 48_000);
  assert.equal(result.value, 'hello world');
  assert.deepEqual(result.selection, { start: 11, end: 11 });
});

test('paste: after typing inserts at caret', () => {
  const result = applyComposerPaste('hi ', { start: 3, end: 3 }, 'there', 48_000);
  assert.equal(result.value, 'hi there');
  assert.deepEqual(result.selection, { start: 8, end: 8 });
});

test('paste: replaces highlighted selection', () => {
  const result = applyComposerPaste('hello world', { start: 6, end: 11 }, 'earth', 48_000);
  assert.equal(result.value, 'hello earth');
  assert.deepEqual(result.selection, { start: 11, end: 11 });
});

test('paste: select all + paste replaces entire value', () => {
  const result = applyComposerPaste('old text', { start: 0, end: 8 }, 'new text', 48_000);
  assert.equal(result.value, 'new text');
  assert.deepEqual(result.selection, { start: 8, end: 8 });
});

test('paste then backspace removes last pasted character', () => {
  const pasted = applyComposerPaste('', { start: 0, end: 0 }, 'abc', 48_000);
  const deleted = deleteComposerSelection(pasted.value, {
    start: pasted.selection.start - 1,
    end: pasted.selection.start,
  });
  assert.ok(deleted);
  assert.equal(deleted.value, 'ab');
  assert.deepEqual(deleted.selection, { start: 2, end: 2 });
});

test('paste: long paste truncates at 48k cap', () => {
  const existing = 'x'.repeat(47_990);
  const paste = 'y'.repeat(20);
  const result = applyComposerPaste(existing, { start: 47_990, end: 47_990 }, paste, 48_000);
  assert.equal(result.value.length, 48_000);
  assert.equal(result.value, existing + 'y'.repeat(10));
  assert.deepEqual(result.selection, { start: 48_000, end: 48_000 });
});

test('paste: caret restore after controlled update', () => {
  const pasted = applyComposerPaste('', { start: 0, end: 0 }, 'hello', 48_000);
  const resolved = resolveComposerSelection({
    pendingRef: pasted.selection,
    domSelection: { start: 0, end: 0 },
    isFocused: true,
  });
  assert.equal(resolved.start, 5);
  assert.equal(resolved.end, 5);
  assert.equal(resolved.clearRef, true);
});

test('paste: mid-text insertion preserves prefix and suffix', () => {
  const result = applyComposerPaste('abef', { start: 2, end: 2 }, 'cd', 48_000);
  assert.equal(result.value, 'abcdef');
  assert.deepEqual(result.selection, { start: 4, end: 4 });
});

test('inferComposerCaretFromDiff: mid-field typing keeps caret in place', () => {
  const caret = inferComposerCaretFromDiff('hello world', 'hellox world');
  assert.deepEqual(caret, { start: 6, end: 6 });
});

test('inferComposerCaretFromDiff: Shift+Enter at beginning inserts newline before text', () => {
  const caret = inferComposerCaretFromDiff('hello', '\nhello');
  assert.deepEqual(caret, { start: 1, end: 1 });
});

test('inferComposerCaretFromDiff: append at end', () => {
  const caret = inferComposerCaretFromDiff('hi', 'hi!');
  assert.deepEqual(caret, { start: 3, end: 3 });
});

test('resolveCaretAfterNativeEdit prefers diff over stale DOM at end', () => {
  const caret = resolveCaretAfterNativeEdit(
    'hello world',
    'hellox world',
    { start: 11, end: 11 },
  );
  assert.deepEqual(caret, { start: 6, end: 6 });
});
