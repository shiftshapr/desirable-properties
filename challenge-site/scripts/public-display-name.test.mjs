import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../src/lib/public-display-name.ts'), 'utf8');

function isEmailLike(raw) {
  const value = String(raw ?? '').trim();
  if (!value.includes('@')) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at >= value.length - 1) return false;
  const domain = value.slice(at + 1);
  if (!domain || domain.includes('@')) return false;
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

function titleCaseWords(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function labelFromEmailLocalPart(email) {
  const local = email.split('@')[0] ?? '';
  const normalized = local.replace(/[._-]+/g, ' ').trim();
  if (!normalized || /^[\d]+$/.test(normalized)) return 'Member';
  return titleCaseWords(normalized);
}

function publicDisplayName(raw, opts = {}) {
  const fallback = opts.fallback ?? 'Member';
  const primary = String(raw ?? '').trim();
  const alt = String(opts.alt ?? '').trim();

  if (primary && !isEmailLike(primary)) return primary;
  if (alt && !isEmailLike(alt)) return alt;
  if (primary && isEmailLike(primary)) return labelFromEmailLocalPart(primary);
  if (alt && isEmailLike(alt)) return labelFromEmailLocalPart(alt);
  return fallback;
}

test('source exports public display helpers', () => {
  assert.match(src, /export function isEmailLike/);
  assert.match(src, /export function publicDisplayName/);
});

test('isEmailLike detects common addresses', () => {
  assert.equal(isEmailLike('person@example.com'), true);
  assert.equal(isEmailLike('person@example'), false);
  assert.equal(isEmailLike('not-an-email'), false);
  assert.equal(isEmailLike(''), false);
});

test('publicDisplayName never returns raw email', () => {
  const masked = publicDisplayName('alex.nassarius@example.com');
  assert.ok(!masked.includes('@'));
  assert.equal(masked, 'Alex Nassarius');
});

test('publicDisplayName keeps real names', () => {
  assert.equal(publicDisplayName('Chris Santos-Lang'), 'Chris Santos-Lang');
});

test('publicDisplayName prefers alt human name over email primary', () => {
  assert.equal(
    publicDisplayName('admin@example.com', { alt: 'Anon' }),
    'Anon',
  );
});

test('publicDisplayName empty input uses fallback', () => {
  assert.equal(publicDisplayName(''), 'Member');
  assert.equal(publicDisplayName(null, { fallback: 'Unknown member' }), 'Unknown member');
});

test('publicDisplayName handles useless local parts', () => {
  assert.equal(publicDisplayName('123@example.com'), 'Member');
});
