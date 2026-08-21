/**
 * Generate minimal landing pad entries for PLA roster orgs not in alliance-directory.json.
 *
 * Usage: node scripts/generate-roster-pad-entries.mjs
 * Output: src/data/alliance-roster-pads.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rosterPath = path.join(__dirname, '../src/data/alliance-roster.json');
const directoryPath = path.join(__dirname, '../src/data/alliance-directory.json');
const outPath = path.join(__dirname, '../src/data/alliance-roster-pads.json');

const PLA_ALLIANCE_URL = 'https://www.projectliberty.io/alliance/';

const TAG_DPS = {
  identity: ['DP1', 'DP2', 'DP5'],
  privacy: ['DP4', 'DP2', 'DP20'],
  dsnp: ['DP2', 'DP4', 'DP7', 'DP20'],
  policy: ['DP3', 'DP12', 'DP20'],
  governance: ['DP3', 'DP20', 'DP8'],
  research: ['DP10', 'DP22', 'DP14'],
  education: ['DP10', 'DP22'],
  ai: ['DP11', 'DP13', 'DP14'],
  security: ['DP4', 'DP13'],
  data: ['DP2', 'DP4'],
  social: ['DP2', 'DP8'],
  media: ['DP14', 'DP8'],
  health: ['DP12', 'DP4'],
  nonprofit: ['DP8', 'DP20'],
  academic: ['DP10', 'DP22'],
};

const DEFAULT_DPS = ['DP2', 'DP4', 'DP20', 'DP8'];

const DOMAIN_TAG_RULES = [
  { pattern: /privacy|private|confidential/i, tags: ['privacy'] },
  { pattern: /identity|id\.|auth|sso|login/i, tags: ['identity'] },
  { pattern: /policy|gov|regul|law|legal|rights/i, tags: ['policy', 'governance'] },
  { pattern: /research|institute|lab|studies|science/i, tags: ['research'] },
  { pattern: /university|\.edu|college|school|academ/i, tags: ['academic', 'education'] },
  { pattern: /ai|artificial|machine-learning|ml\b/i, tags: ['ai'] },
  { pattern: /security|cyber|trust|safe/i, tags: ['security'] },
  { pattern: /data|analytics|open-data/i, tags: ['data'] },
  { pattern: /social|community|network|connect/i, tags: ['social'] },
  { pattern: /media|news|journal|press|report/i, tags: ['media'] },
  { pattern: /health|medical|clinical|patient/i, tags: ['health'] },
  { pattern: /foundation|nonprofit|\.org$/i, tags: ['nonprofit'] },
  { pattern: /protocol|dsnp|decentral/i, tags: ['dsnp'] },
];

function shortNameFrom(fullName, domain) {
  const trimmed = fullName.trim();
  if (trimmed.length <= 32) return trimmed;
  const label = domain.split('.')[0];
  if (label && label.length >= 2) {
    return label
      .replace(/[-_]/g, ' ')
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return trimmed.slice(0, 32);
}

function inferTags(name, domain) {
  const haystack = `${name} ${domain}`.toLowerCase();
  const tags = new Set(['nonprofit']);
  for (const rule of DOMAIN_TAG_RULES) {
    if (rule.pattern.test(haystack)) {
      for (const tag of rule.tags) tags.add(tag);
    }
  }
  return [...tags];
}

function relatedDpsFromTags(tags) {
  const merged = [];
  for (const tag of tags) {
    merged.push(...(TAG_DPS[tag] || []));
  }
  merged.push(...DEFAULT_DPS);
  return [...new Set(merged)].slice(0, 6);
}

function missionTemplate(name, domain) {
  return `${name} is a Project Liberty Alliance member organization (${domain}). We are inviting them to confirm how their public work connects to a people-centered internet and Desirable Properties Studio.`;
}

function pitchFor(name, shortName) {
  return {
    headline: `We opened a landing pad for ${shortName}. Did we hear your concerns correctly?`,
    lead: `${name} appears on the public Project Liberty Alliance roster. We have not yet built a full briefing from their public corpus. This pad is a working invitation: confirm who you are, add sources, and weigh in on Desirable Properties related to your domain.`,
    ask: `If you represent ${shortName}, tell us what we missed. Open the Desirable Properties section, follow one interest, and leave a patch idea if the text is wrong or incomplete.`,
    captureLine: `Alliance members advance their own goals while strengthening shared objectives. This pad is where ${shortName} can refine how their perspective is captured before Version 1.0 launches.`,
  };
}

function buildEntry(org) {
  const tags = inferTags(org.name, org.domain);
  const shortName = shortNameFrom(org.name, org.domain);
  return {
    slug: org.slug,
    name: org.name,
    shortName,
    domain: org.domain,
    website: org.website,
    tags,
    relatedDps: relatedDpsFromTags(tags),
    mission: missionTemplate(org.name, org.domain),
    pitch: pitchFor(org.name, shortName),
    sources: [
      {
        label: `${org.name} website`,
        url: org.website,
      },
      {
        label: 'Project Liberty Alliance roster',
        url: PLA_ALLIANCE_URL,
      },
    ],
  };
}

function main() {
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  const directory = JSON.parse(fs.readFileSync(directoryPath, 'utf8'));
  const corpusPath = path.join(__dirname, '../src/data/alliance-roster-corpus.json');
  let corpusSlugs = new Set();
  if (fs.existsSync(corpusPath)) {
    const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
    corpusSlugs = new Set(corpus.orgs.map((org) => org.slug));
  }
  const directorySlugs = new Set([...directory.orgs.map((org) => org.slug), ...corpusSlugs]);

  const entries = roster.orgs
    .filter((org) => !directorySlugs.has(org.slug))
    .map(buildEntry)
    .sort((a, b) => a.name.localeCompare(b.name));

  const output = {
    cohort: roster.cohort,
    generatedAt: new Date().toISOString().slice(0, 10),
    generatorNote:
      'Deterministic minimal pad entries for PLA roster orgs without a full alliance-directory packet. Regenerate with node scripts/generate-roster-pad-entries.mjs after roster import.',
    sourceRosterImportedAt: roster.importedAt,
    orgs: entries,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${entries.length} roster pad entries to ${outPath}`);
}

main();
