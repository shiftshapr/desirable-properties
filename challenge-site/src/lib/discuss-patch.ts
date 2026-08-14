/**
 * Read-only Canopi Discuss patch/insert classifier (challenge-site only).
 * Prefers API `tag_type` (patch | insert); falls back to legacy PATCH:/INSERT: first-line prefixes.
 * Does not mutate Canopi storage.
 */

export type DiscussPatchKind = 'patch' | 'insert' | 'comment';

export type ParsedDiscussPatch = {
  kind: DiscussPatchKind;
  /** Body after the command line (replacement / insertion text), or full body for comments. */
  content: string;
  /** Original first-line command when kind is patch|insert via legacy prefix (e.g. "PATCH:"). */
  commandLine?: string;
};

const COMMAND_RE = /^(patch|insert)\s*:\s*(.*)$/i;
const RATIONALE_SECTION_RE = /^\s*(Why it fits|Why it is|Pre-flight|Rationale)\b/i;

function stripHermesRationale(body: string): string {
  const idx = body.indexOf('\n\n');
  if (idx > 0 && RATIONALE_SECTION_RE.test(body.slice(idx + 2))) {
    return body.slice(0, idx).trim();
  }
  return body.trim();
}

function classifyFromTagType(tagType: string | null | undefined): DiscussPatchKind | null {
  const t = String(tagType || '').trim().toLowerCase();
  if (t === 'patch') return 'patch';
  if (t === 'insert') return 'insert';
  return null;
}

/**
 * Classify a Canopi Discuss post. Pass `tagType` from API when available.
 */
export function classifyDiscussPost(opts: {
  body: string;
  tagType?: string | null;
}): ParsedDiscussPatch {
  const fromTag = classifyFromTagType(opts.tagType);
  if (fromTag) {
    return {
      kind: fromTag,
      content: stripHermesRationale(String(opts.body ?? '').trim()),
    };
  }
  return parseDiscussPatch(opts.body);
}

/**
 * Strip leading whitespace; first line matching PATCH:|INSERT: (case-insensitive)
 * is the command. Remainder (including rest of first line after prefix) is content.
 * Prefix mid-body is not a command.
 */
export function parseDiscussPatch(body: string): ParsedDiscussPatch {
  const raw = String(body ?? '');
  const trimmedStart = raw.replace(/^\s+/, '');
  if (!trimmedStart) {
    return { kind: 'comment', content: '' };
  }

  const nl = trimmedStart.indexOf('\n');
  const firstLine = nl === -1 ? trimmedStart : trimmedStart.slice(0, nl);
  const restAfterFirst = nl === -1 ? '' : trimmedStart.slice(nl + 1);

  const m = firstLine.match(COMMAND_RE);
  if (!m) {
    return { kind: 'comment', content: raw.trim() };
  }

  const kind = m[1].toLowerCase() === 'insert' ? 'insert' : 'patch';
  const afterPrefixOnFirst = (m[2] || '').trimStart();
  const contentParts = [afterPrefixOnFirst, restAfterFirst].filter((p) => p.length > 0);
  const content = contentParts.join('\n').replace(/^\s+/, '').replace(/\s+$/, '');

  return {
    kind,
    content,
    commandLine: `${m[1].toUpperCase()}:`,
  };
}

export function discussPatchBadgeLabel(kind: DiscussPatchKind): string | null {
  if (kind === 'patch') return 'Patch';
  if (kind === 'insert') return 'Insert';
  return null;
}

/** Short activity-feed copy for a classified Canopi discuss post. */
export function discussPatchActivityText(opts: {
  authorName?: string | null;
  pageId?: string | null;
  body: string;
  tagType?: string | null;
}): { kind: DiscussPatchKind; text: string; badge: string | null } {
  const parsed = classifyDiscussPost({ body: opts.body, tagType: opts.tagType });
  const who = (opts.authorName || 'Someone').trim() || 'Someone';
  const chapter = opts.pageId ? ` (${opts.pageId})` : '';
  const snippetSource = parsed.kind === 'comment' ? opts.body : parsed.content || opts.body;
  const snippet = snippetSource.replace(/\s+/g, ' ').trim().slice(0, 80);
  const ellipsis = snippetSource.replace(/\s+/g, ' ').trim().length > 80 ? '…' : '';

  if (parsed.kind === 'patch') {
    return {
      kind: 'patch',
      badge: 'Patch',
      text: `${who} suggested a patch on the book${chapter}: ${snippet}${ellipsis}`,
    };
  }
  if (parsed.kind === 'insert') {
    return {
      kind: 'insert',
      badge: 'Insert',
      text: `${who} suggested an insert on the book${chapter}: ${snippet}${ellipsis}`,
    };
  }
  return {
    kind: 'comment',
    badge: null,
    text: `${who} discussed on the book${chapter}: ${snippet}${ellipsis}`,
  };
}
