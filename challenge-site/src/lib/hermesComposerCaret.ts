export type ComposerSelection = { start: number; end: number };

/** After any edit, caret must be collapsed – expanded ranges are stale highlight state. */
export function normalizeComposerSelectionAfterEdit(
  selection: ComposerSelection,
): ComposerSelection {
  if (selection.start === selection.end) return selection;
  return { start: selection.start, end: selection.start };
}

/** Keep caret indices valid after capComposerText truncates pasted or typed input. */
export function clampComposerSelection(
  selection: ComposerSelection,
  maxLen: number,
): ComposerSelection {
  const len = Math.max(0, maxLen);
  return {
    start: Math.max(0, Math.min(selection.start, len)),
    end: Math.max(0, Math.min(selection.end, len)),
  };
}

export function composerSelectionAtEnd(textLen: number): ComposerSelection {
  const end = Math.max(0, textLen);
  return { start: end, end: end };
}

/**
 * Infer collapsed caret after a native edit by diffing prev/next strings.
 * Works for mid-field typing, Shift+Enter newlines, and single-character deletes.
 */
export function inferComposerCaretFromDiff(
  prev: string,
  next: string,
): ComposerSelection | null {
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

/** Prefer diff-inferred caret; fall back to the browser-reported selection. */
export function resolveCaretAfterNativeEdit(
  prev: string,
  next: string,
  reported: ComposerSelection,
): ComposerSelection {
  const inferred = inferComposerCaretFromDiff(prev, next);
  if (inferred) {
    return clampComposerSelection(inferred, next.length);
  }
  return clampComposerSelection(
    normalizeComposerSelectionAfterEdit(reported),
    next.length,
  );
}

/** Apply clipboard text at the current selection on a controlled composer. */
export function applyComposerPaste(
  value: string,
  selection: ComposerSelection,
  pasted: string,
  maxChars: number,
): { value: string; selection: ComposerSelection } {
  const { start, end } = selection;
  const merged = value.slice(0, start) + pasted + value.slice(end);
  const capped = merged.length <= maxChars ? merged : merged.slice(0, maxChars);
  const cursor = Math.min(start + pasted.length, capped.length);
  return {
    value: capped,
    selection: clampComposerSelection({ start: cursor, end: cursor }, capped.length),
  };
}

/** Remove highlighted range; returns null when there is no selection to delete. */
export function deleteComposerSelection(
  value: string,
  selection: ComposerSelection,
): { value: string; selection: ComposerSelection } | null {
  const { start, end } = selection;
  if (start === end) return null;
  return {
    value: value.slice(0, start) + value.slice(end),
    selection: { start, end: start },
  };
}

/** Drives setSelectionRange after controlled value updates in HermesChat. */
export function resolveComposerSelection({
  pendingRef,
  domSelection,
  isFocused,
}: {
  pendingRef: ComposerSelection | null;
  domSelection: ComposerSelection | null;
  isFocused: boolean;
}): { start: number | null; end: number | null; clearRef: boolean } {
  const pending = pendingRef;
  const preserveFromDom = !pending
    && isFocused
    && typeof domSelection?.start === 'number'
    && typeof domSelection?.end === 'number';
  const start = pending?.start ?? (preserveFromDom ? domSelection!.start : null);
  const end = pending?.end ?? (preserveFromDom ? domSelection!.end : null);
  return { start, end, clearRef: Boolean(pending) };
}
