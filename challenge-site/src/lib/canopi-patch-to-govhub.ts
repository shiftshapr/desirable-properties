/**
 * Turn a Canopi book Discuss patch/insert into a Gov Hub dp_proposal payload (pure; no I/O).
 *
 * Canopi quotes the rendered book text (newlines collapsed, inline markdown stripped); Gov Hub
 * promote splices the raw markdown body. So the anchor is first located in the chapter markdown
 * and that exact span is filed as `original_text`.
 *
 * Inserts are encoded as an exact replace (anchor → anchor + text, or text + anchor). Prod Gov Hub
 * only has insert-before, and its Canopi intake drops patch_mode, so replace is the one encoding
 * that splices correctly on promote everywhere.
 */

export type CanopiAnchorInfo = {
  exact: string | null;
  insertPosition: 'above' | 'below' | null;
  patchRationale: string | null;
};

function asObject(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function parseCanopiAnchor(message: Record<string, unknown>): CanopiAnchorInfo {
  const anchor = asObject(message.contextAnchor ?? message.context_anchor);
  const quote = asObject(anchor?.textQuote);
  const exact = typeof quote?.exact === 'string' && quote.exact.trim() ? quote.exact : null;
  const payload = asObject(message.payload);
  const ai = asObject(message.aiAssist) ?? asObject(payload?.aiAssist);
  const pos = String(payload?.insertPosition ?? anchor?.insertPosition ?? '').toLowerCase();
  const rationale = ai?.patchRationale;
  return {
    exact,
    insertPosition: pos === 'above' || pos === 'below' ? pos : null,
    patchRationale: typeof rationale === 'string' && rationale.trim() ? rationale.trim() : null,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Markdown noise that rendering removes between words: whitespace, emphasis, code ticks. */
const GAP = '[\\s*_`]+';
const EDGE = '[*_`]*';

/**
 * Find the markdown span whose rendered words equal `exact`. Returns the raw markdown
 * substring, or null when the passage is not present (moved/edited).
 */
export function locateAnchorInMarkdown(markdown: string, exact: string): string | null {
  const tokens = String(exact || '')
    .replace(/ /g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[*_`]+|[*_`]+$/g, ''))
    .filter(Boolean);
  if (!tokens.length || !markdown) return null;
  const pattern = new RegExp(EDGE + tokens.map(escapeRegExp).join(GAP) + EDGE);
  const m = pattern.exec(markdown.replace(/\r\n/g, '\n'));
  return m ? m[0].trim() : null;
}

export type GovHubPatchPayload = {
  original_text: string;
  proposed_text: string;
  patch_mode: 'replace';
  rationale: string;
  reference_url: string | null;
  context_anchor: Record<string, unknown> | null;
};

export function buildGovHubPatchPayload(opts: {
  kind: 'patch' | 'insert';
  content: string;
  anchorMarkdown: string;
  insertPosition: 'above' | 'below' | null;
  canopiMessageId: string;
  canopiAuthorName: string | null;
  patchRationale: string | null;
  referenceUrl: string | null;
  contextAnchor?: Record<string, unknown> | null;
}): GovHubPatchPayload {
  const text = opts.content.trim();
  const anchor = opts.anchorMarkdown.trim();
  let proposed = text;
  if (opts.kind === 'insert') {
    proposed = opts.insertPosition === 'above' ? `${text}\n\n${anchor}` : `${anchor}\n\n${text}`;
  }
  const credit =
    `Filed from Canopi book ${opts.kind} ${opts.canopiMessageId}` +
    (opts.canopiAuthorName ? ` by ${opts.canopiAuthorName}` : '') +
    (opts.kind === 'insert' ? ` (insert ${opts.insertPosition === 'above' ? 'above' : 'below'} the anchor, encoded as replace).` : '.');
  const rationale = [opts.patchRationale, credit].filter(Boolean).join('\n\n').slice(0, 3900);
  return {
    original_text: anchor,
    proposed_text: proposed,
    patch_mode: 'replace',
    rationale,
    reference_url: opts.referenceUrl,
    context_anchor: opts.contextAnchor ?? null,
  };
}
