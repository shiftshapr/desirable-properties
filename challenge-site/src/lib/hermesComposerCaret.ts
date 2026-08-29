export type ComposerSelection = { start: number; end: number };

/** After any edit, caret must be collapsed – expanded ranges are stale highlight state. */
export function normalizeComposerSelectionAfterEdit(
  selection: ComposerSelection,
): ComposerSelection {
  if (selection.start === selection.end) return selection;
  return { start: selection.start, end: selection.start };
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
