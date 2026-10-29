/**
 * Canopi inserts filed into Gov Hub as a replace (anchor + new text, or new text + anchor).
 * Approving applies them correctly; this recovers the insert so the review tab can label and
 * show it as one. Position comes from where the anchor sits in the proposed text, so a later
 * re-anchor is read correctly. Null for real replaces.
 */
export function encodedInsertOf(proposal: {
  patch_mode?: string | null;
  rationale?: string | null;
  original_text?: string | null;
  proposed_text?: string | null;
}): { position: 'above' | 'below'; text: string } | null {
  if (String(proposal.patch_mode || 'replace').toLowerCase() !== 'replace') return null;
  if (!/encoded as replace/i.test(proposal.rationale || '')) return null;
  const anchor = String(proposal.original_text || '').trim();
  const proposed = String(proposal.proposed_text || '').trim();
  if (!anchor || proposed.length <= anchor.length) return null;
  if (proposed.startsWith(anchor)) return { position: 'below', text: proposed.slice(anchor.length).trim() };
  if (proposed.endsWith(anchor)) return { position: 'above', text: proposed.slice(0, -anchor.length).trim() };
  return null;
}
