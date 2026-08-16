#!/usr/bin/env node
/**
 * Parse ISOC Nevada.md (name + email) and write isoc-nevada-members.json.
 *
 * Usage:
 *   node scripts/import-isoc-nevada-members.mjs /path/to/ISOC Nevada.md
 */
import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/import-isoc-nevada-members.mjs <path-to-ISOC Nevada.md>');
  process.exit(1);
}

const text = fs.readFileSync(inputPath, 'utf8');

function normalizeCell(cell) {
  return String(cell || '')
    .replace(/\\\./g, '.')
    .replace(/\\_/g, '_')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}
const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w+/;
const EMAIL_RE_G = /[\w.+-]+@[\w.-]+\.\w+/g;

function emailsInCell(cell) {
  const normalized = normalizeCell(cell);
  const fromText = [...normalized.matchAll(EMAIL_RE_G)].map((m) => m[0]);
  const fromMailto = [...normalized.matchAll(/mailto:([\w.+-]+@[\w.-]+\.\w+)/gi)].map((m) => m[1]);
  return [...fromText, ...fromMailto];
}
const members = [];
const seen = new Set();

function addMember(name, email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@') || seen.has(normalized)) return;
  seen.add(normalized);
  members.push({
    name: String(name || '').trim() || normalized,
    email: normalized,
  });
}

for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  // Markdown table row: | # | Full Name | ISOC # | Email | ...
  if (trimmed.includes('|')) {
    const cells = trimmed
      .split('|')
      .map((c) => normalizeCell(c))
      .filter(Boolean);
    let email = null;
    let emailIdx = -1;
    for (let i = 0; i < cells.length; i += 1) {
      const found = emailsInCell(cells[i]);
      if (found.length) {
        email = found[0];
        emailIdx = i;
        break;
      }
    }
    if (email) {
      // Charter roster: col 1 = Full Name, col 3 = Email (0-based after filter)
      let name = '';
      if (emailIdx >= 3 && cells.length > 1) {
        name = cells[1];
      } else {
        const nameCell = cells.find(
          (c, i) =>
            i !== emailIdx &&
            !emailsInCell(c).length &&
            !/^\d+$/.test(c),
        );
        name = nameCell || '';
      }
      addMember(name, email);
      continue;
    }
  }

  // "Name <email>" or "Name — email"
  const emails = emailsInCell(trimmed);
  if (!emails.length) continue;
  const email = emails[0];
  const name = normalizeCell(trimmed.replace(EMAIL_RE_G, '')).replace(/[<>,—–-]/g, ' ').trim();
  addMember(name, email);
}

if (!members.length) {
  console.error('No members parsed. Check markdown format (name + email per line or table).');
  process.exit(1);
}

const outPath = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '../src/data/isoc-nevada-members.json',
);
const payload = {
  source: path.basename(inputPath),
  members: members.sort((a, b) => a.email.localeCompare(b.email)),
};
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${members.length} member(s) to ${outPath}`);
