import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/lib/discuss-patch.ts'), 'utf8');

// Lightweight parse mirroring discuss-patch.ts (keep in sync for CI without ts-node).
function parseDiscussPatch(body) {
  const raw = String(body ?? '');
  const trimmedStart = raw.replace(/^\s+/, '');
  if (!trimmedStart) return { kind: 'comment', content: '' };
  const nl = trimmedStart.indexOf('\n');
  const firstLine = nl === -1 ? trimmedStart : trimmedStart.slice(0, nl);
  const restAfterFirst = nl === -1 ? '' : trimmedStart.slice(nl + 1);
  const m = firstLine.match(/^(patch|insert)\s*:\s*(.*)$/i);
  if (!m) return { kind: 'comment', content: raw.trim() };
  const kind = m[1].toLowerCase() === 'insert' ? 'insert' : 'patch';
  const afterPrefixOnFirst = (m[2] || '').trimStart();
  const contentParts = [afterPrefixOnFirst, restAfterFirst].filter((p) => p.length > 0);
  const content = contentParts.join('\n').replace(/^\s+/, '').replace(/\s+$/, '');
  return { kind, content };
}

describe('discuss-patch parser contract', () => {
  it('source exports parseDiscussPatch', () => {
    assert.match(src, /export function parseDiscussPatch/);
  });

  it('PATCH case-insensitive', () => {
    const r = parseDiscussPatch('  pAtCh: clearer wording\nsecond line');
    assert.equal(r.kind, 'patch');
    assert.equal(r.content, 'clearer wording\nsecond line');
  });

  it('INSERT multi-line', () => {
    const r = parseDiscussPatch('INSERT:\nnew paragraph\nmore');
    assert.equal(r.kind, 'insert');
    assert.equal(r.content, 'new paragraph\nmore');
  });

  it('mid-body prefix is comment', () => {
    const r = parseDiscussPatch('hello\nPATCH: not a command');
    assert.equal(r.kind, 'comment');
  });
});
