/** True when the user has a non-collapsed text selection inside `root`. */
export function isTextSelectionInElement(root: HTMLElement | null | undefined): boolean {
  if (!root || typeof document === 'undefined') return false;
  const sel = document.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;
  const anchor = sel.anchorNode;
  const focus = sel.focusNode;
  return Boolean(
    (anchor && root.contains(anchor))
    || (focus && root.contains(focus)),
  );
}
