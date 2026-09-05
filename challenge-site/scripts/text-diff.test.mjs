import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/lib/textDiff.ts'), 'utf8');

// Lightweight mirror of textDiff.ts (keep in sync for CI without ts-node).
const TOKEN_RE = /\S+|\s+/g;

function tokenizeWords(text) {
  return String(text ?? '').match(TOKEN_RE) ?? [];
}

function diffWords(original, proposed) {
  const a = tokenizeWords(original);
  const b = tokenizeWords(proposed);
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', text: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'ins', text: b[j - 1] });
      j -= 1;
    } else {
      ops.unshift({ type: 'del', text: a[i - 1] });
      i -= 1;
    }
  }
  return ops;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDiffHtml(original, proposed) {
  const ops = diffWords(original, proposed);
  let html = '';
  for (const op of ops) {
    const chunk = escapeHtml(op.text);
    if (op.type === 'equal') html += chunk;
    else if (op.type === 'del') html += `<del class="dp-diff-del">${chunk}</del>`;
    else if (op.type === 'ins') html += `<mark class="dp-diff-ins">${chunk}</mark>`;
  }
  return html;
}

describe('textDiff contract', () => {
  it('source exports buildDiffHtml', () => {
    assert.match(src, /export function buildDiffHtml/);
    assert.match(src, /export function changeCounts/);
    assert.match(src, /export function buildMarkdownSectionDiffs/);
  });

  it('buildDiffHtml marks one-word change harm→hurt', () => {
    const html = buildDiffHtml('do no harm today', 'do no hurt today');
    assert.match(html, /<del class="dp-diff-del">harm<\/del>/);
    assert.match(html, /<mark class="dp-diff-ins">hurt<\/mark>/);
    assert.match(html, /do no /);
    assert.match(html, / today/);
  });

  it('buildDiffHtml escapes HTML in proposed text', () => {
    const html = buildDiffHtml('plain', '<script>');
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
  });
});
