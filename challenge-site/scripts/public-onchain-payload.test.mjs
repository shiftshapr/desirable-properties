import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const onchainPage = readFileSync(
  join(__dirname, '../src/app/onchain/page.tsx'),
  'utf8',
);
const publicPayload = readFileSync(
  join(__dirname, '../src/lib/public-payload.ts'),
  'utf8',
);

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

function publicDisplayName(raw, opts = {}) {
  const fallback = opts.fallback ?? 'Member';
  const primary = String(raw ?? '').trim();
  const alt = String(opts.alt ?? '').trim();
  if (primary && !isEmailLike(primary)) return primary;
  if (alt && !isEmailLike(alt)) return alt;
  if (primary && isEmailLike(primary)) {
    const local = primary.split('@')[0] ?? '';
    const normalized = local.replace(/[._-]+/g, ' ').trim();
    if (!normalized || /^[\d]+$/.test(normalized)) return 'Member';
    return normalized
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  return fallback;
}

function toPublicOnchainSubmissions(submissions) {
  return submissions.map((submission) => ({
    source_file: submission.source_file,
    file_number: submission.file_number,
    title: submission.title,
    dp_count: submission.dp_count,
    author: publicDisplayName(submission.author, {
      alt: submission.email,
      fallback: 'Unknown',
    }),
  }));
}

test('onchain page uses public serializers', () => {
  assert.match(onchainPage, /toPublicOnchainPciEmails/);
  assert.match(onchainPage, /toPublicOnchainSubmissions/);
  assert.match(onchainPage, /toPublicOnchainPciEmails\(articlesData\.pci_emails\)/);
  assert.match(onchainPage, /toPublicOnchainSubmissions\(submissionIndex\.submissions\)/);
  assert.match(onchainPage, /pciEmails=\{pciEmails\}/);
  assert.match(onchainPage, /submissions=\{submissions\}/);
});

test('public onchain submissions omit email field', () => {
  assert.match(publicPayload, /export function toPublicOnchainSubmissions/);
  const rows = toPublicOnchainSubmissions([
    {
      source_file: '1.json',
      title: 'Example',
      author: 'Javier',
      email: 'Jamagax@gmail.com',
      dp_count: 3,
    },
  ]);
  assert.deepEqual(Object.keys(rows[0]).sort(), [
    'author',
    'dp_count',
    'file_number',
    'source_file',
    'title',
  ]);
  assert.equal(rows[0].author, 'Javier');
});
