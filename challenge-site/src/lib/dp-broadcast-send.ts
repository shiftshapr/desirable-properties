import sanitizeHtml from 'sanitize-html';

export const BROADCAST_DEFAULT_BODY_FONT =
  'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif';

export const BROADCAST_FONT_OPTIONS = [
  { id: 'default', label: 'Default (Georgia, serif)', stack: BROADCAST_DEFAULT_BODY_FONT },
  {
    id: 'georgia',
    label: 'Georgia (classic serif)',
    stack: 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif',
  },
  {
    id: 'palatino',
    label: 'Palatino (book serif)',
    stack: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  },
  { id: 'times', label: 'Times New Roman (newspaper)', stack: '"Times New Roman", Times, serif' },
  { id: 'helvetica', label: 'Helvetica (clean sans)', stack: 'Helvetica, Arial, sans-serif' },
  { id: 'arial', label: 'Arial (universal sans)', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'verdana', label: 'Verdana (high-readability sans)', stack: 'Verdana, Geneva, sans-serif' },
  {
    id: 'trebuchet',
    label: 'Trebuchet (humanist sans)',
    stack: '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", sans-serif',
  },
  { id: 'tahoma', label: 'Tahoma (compact sans)', stack: 'Tahoma, Geneva, sans-serif' },
  {
    id: 'courier',
    label: 'Courier New (monospace)',
    stack: '"Courier New", Courier, monospace',
  },
  {
    id: 'charter',
    label: 'Charter (modern serif, falls back to Georgia)',
    stack: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif',
  },
  {
    id: 'inter',
    label: 'Inter (modern sans, falls back to Helvetica)',
    stack: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  {
    id: 'source-serif',
    label: 'Source Serif (modern reading serif, falls back to Georgia)',
    stack: '"Source Serif Pro", "Source Serif", Cambria, Georgia, serif',
  },
] as const;

const BROADCAST_FONT_BY_ID = new Map(BROADCAST_FONT_OPTIONS.map((o) => [o.id, o]));

export function resolveBroadcastFontFamily(fontId: string | null | undefined) {
  const id = String(fontId || 'default').trim().toLowerCase();
  const opt = BROADCAST_FONT_BY_ID.get(id as (typeof BROADCAST_FONT_OPTIONS)[number]['id']);
  return opt?.stack || BROADCAST_DEFAULT_BODY_FONT;
}

/** Match Quill editor spacing (margin:0 on block elements) so sent mail matches the composer. */
function mergeInlineStyle(existing: string | undefined, extra: string) {
  const style = String(existing || '').trim();
  if (!style) return extra;
  const parts = extra
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  let next = style;
  for (const part of parts) {
    const prop = part.split(':')[0]?.trim().toLowerCase();
    if (prop && !next.toLowerCase().includes(`${prop}:`)) {
      next = next.endsWith(';') ? `${next}${part};` : `${next};${part};`;
    }
  }
  return next;
}

const BLOCK_SPACING_STYLE = 'margin:0;padding:0;line-height:1.6;';

const sanitizeDefaults: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'style'],
    // transformTags injects inline spacing styles – must allow style or sanitize-html strips them.
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    ul: ['style'],
    ol: ['style'],
    li: ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    p: (_tagName, attribs) => ({
      tagName: 'p',
      attribs: { ...attribs, style: mergeInlineStyle(attribs.style, BLOCK_SPACING_STYLE) },
    }),
    h1: (_tagName, attribs) => ({
      tagName: 'h1',
      attribs: { ...attribs, style: mergeInlineStyle(attribs.style, BLOCK_SPACING_STYLE) },
    }),
    h2: (_tagName, attribs) => ({
      tagName: 'h2',
      attribs: { ...attribs, style: mergeInlineStyle(attribs.style, BLOCK_SPACING_STYLE) },
    }),
    ul: (_tagName, attribs) => ({
      tagName: 'ul',
      attribs: {
        ...attribs,
        style: mergeInlineStyle(attribs.style, 'margin:0;padding:0 0 0 1.5em;line-height:1.6;'),
      },
    }),
    ol: (_tagName, attribs) => ({
      tagName: 'ol',
      attribs: {
        ...attribs,
        style: mergeInlineStyle(attribs.style, 'margin:0;padding:0 0 0 1.5em;line-height:1.6;'),
      },
    }),
    li: (_tagName, attribs) => ({
      tagName: 'li',
      attribs: { ...attribs, style: mergeInlineStyle(attribs.style, 'margin:0;padding:0;line-height:1.6;') },
    }),
    img: (_tagName, attribs) => {
      const next = { ...attribs };
      const extra = 'max-width:100%;height:auto;display:block;';
      const style = String(next.style || '').trim();
      next.style = style && !style.includes('max-width') ? `${style};${extra}` : style || extra;
      return { tagName: 'img', attribs: next };
    },
  },
};

export function sanitizeBroadcastHtml(html: string) {
  return sanitizeHtml(String(html || ''), sanitizeDefaults);
}

export function wrapBroadcastBodyHtml(bodyHtml: string, fontId?: string | null) {
  const fontStack = resolveBroadcastFontFamily(fontId);
  const escaped = fontStack.replace(/"/g, '\\"');
  const sanitized = sanitizeBroadcastHtml(bodyHtml);
  return `<body style="font-family:${escaped};line-height:1.6;color:#111;">${sanitized}</body>`;
}

export function stripHtml(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}
