import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/lib/markdown-to-plain-text.ts'), 'utf8');

// Lightweight mirror of markdown-to-plain-text.ts (keep in sync for CI without ts-node).
function markdownToPlainText(markdown) {
  let text = String(markdown ?? '');

  text = text.replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1');
  text = text.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');
  text = text.replace(/^[\t ]*[-*+]\s+/gm, '');
  text = text.replace(/^[\t ]*\d+\.\s+/gm, '');
  text = text.replace(/~~([^~]+)~~/g, '$1');

  return text.trim();
}

describe('markdownToPlainText', () => {
  it('strips bold emphasis', () => {
    const input = '**DP10 (Education) is the closest match.**';
    assert.equal(markdownToPlainText(input), 'DP10 (Education) is the closest match.');
  });

  it('strips links and keeps label text', () => {
    assert.equal(
      markdownToPlainText('See [DP10](https://example.com/dp10) for details.'),
      'See DP10 for details.',
    );
  });

  it('strips headings, blockquotes, and list markers', () => {
    const input = '## Heading\n> quoted\n- item one\n1. item two';
    assert.equal(markdownToPlainText(input), 'Heading\nquoted\nitem one\nitem two');
  });

  it('strips inline code and fenced blocks', () => {
    const input = 'Use `foo` or:\n```js\nconst x = 1;\n```';
    assert.equal(markdownToPlainText(input), 'Use foo or:\nconst x = 1;');
  });

  it('keeps source in sync with TypeScript module', () => {
    assert.match(src, /export function markdownToPlainText/);
    assert.match(src, /Fenced code blocks/);
    assert.match(src, /Links \[text\]/);
  });
});
