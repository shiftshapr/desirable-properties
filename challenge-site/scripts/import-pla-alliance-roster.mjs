/**
 * Scrape Project Liberty Alliance logo grid and write src/data/alliance-roster.json.
 *
 * Usage: node scripts/import-pla-alliance-roster.mjs [html-path]
 * Default HTML source: curl https://www.projectliberty.io/alliance/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../src/data/alliance-roster.json');

function normalizeToSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractHostname(raw) {
  let candidate = raw.trim();
  if (!candidate.includes('://')) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }
  try {
    return new URL(candidate).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function nameFromAlt(alt) {
  if (!alt) return null;
  return alt.replace(/^Logo for\s+/i, '').replace(/\s+logo$/i, '').trim() || null;
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function nameFromDomain(domain) {
  const label = domain.split('.')[0];
  if (!label || label.length < 2) return domain;
  return titleCase(label.replace(/-/g, ' '));
}

function looksLikeHash(value) {
  return /^[a-f0-9]{24,}$/i.test(value);
}

function nameFromFilename(src) {
  const file = src.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
  if (looksLikeHash(file)) return null;
  const cleaned = file
    .replace(/_BW.*$/i, '')
    .replace(/[-_]600x600.*$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  if (!cleaned || looksLikeHash(cleaned.replace(/\s/g, ''))) return null;
  return titleCase(cleaned);
}

function normalizeWebsite(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function parseLogoGrid(html) {
  const re =
    /<figure class="wp-block-image[^"]*"><a href="([^"]+)"><img[^>]*src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*\/>/g;
  const byDomain = new Map();
  const slugCounts = new Map();
  let match;

  while ((match = re.exec(html)) !== null) {
    const website = match[1].trim();
    const src = match[2];
    const alt = (match[3] || '').trim();
    if (!website || website.includes('projectliberty.io')) continue;

    const domain = extractHostname(website);
    if (!domain || byDomain.has(domain)) continue;

    const name = nameFromAlt(alt) || nameFromFilename(src) || nameFromDomain(domain);
    let baseSlug = normalizeToSlug(domain.split('.')[0]);
    if (!baseSlug) baseSlug = normalizeToSlug(name);
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    const slug = count > 1 ? `${baseSlug}-${count}` : baseSlug;

    byDomain.set(domain, { slug, name, domain, website: normalizeWebsite(website) });
  }

  return [...byDomain.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function loadHtml(sourcePath) {
  if (sourcePath) {
    return fs.readFileSync(sourcePath, 'utf8');
  }
  const response = await fetch('https://www.projectliberty.io/alliance/');
  if (!response.ok) {
    throw new Error(`Failed to fetch alliance page: ${response.status}`);
  }
  return response.text();
}

async function main() {
  const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : null;
  const html = await loadHtml(sourcePath);
  const orgs = parseLogoGrid(html);

  const roster = {
    cohort: 'project-liberty-alliance',
    sourceUrl: 'https://www.projectliberty.io/alliance/',
    importedAt: new Date().toISOString().slice(0, 10),
    rosterNote:
      'Prework roster from the public PLA alliance logo grid. Used for pad lookup before a full directory packet exists.',
    orgs,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(roster, null, 2)}\n`);
  console.log(`Wrote ${orgs.length} roster orgs to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
