import assert from 'node:assert/strict';
import test from 'node:test';
import sanitizeHtml from 'sanitize-html';

function mergeInlineStyle(existing, extra) {
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

const sanitizeDefaults = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'style'],
    p: ['style'],
    h1: ['style'],
    h2: ['style'],
    ul: ['style'],
    ol: ['style'],
    li: ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    p: (_tagName, attribs) => ({
      tagName: 'p',
      attribs: { ...attribs, style: mergeInlineStyle(attribs.style, BLOCK_SPACING_STYLE) },
    }),
  },
};

function sanitizeBroadcastHtml(html) {
  return sanitizeHtml(String(html || ''), sanitizeDefaults);
}

test('sanitizeBroadcastHtml preserves inline margin:0 on paragraphs (regression for ed8713d)', () => {
  const input = '<p>First</p><p><br></p><p>Second</p>';
  const out = sanitizeBroadcastHtml(input);
  assert.match(out, /margin:0/);
  assert.match(out, /padding:0/);
  assert.match(out, /line-height:1\.6/);
  assert.doesNotMatch(out, /<p>First<\/p>/, 'bare p without style should not remain');
});

test('empty Quill paragraph keeps br but inherits zero margin', () => {
  const out = sanitizeBroadcastHtml('<p><br></p>');
  assert.match(out, /<p style="[^"]*margin:0[^"]*"><br \/><\/p>/);
});
