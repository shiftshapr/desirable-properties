/**
 * Generate full landing-pad corpus briefings for PLA roster orgs that publish
 * citable public work (research papers, reports, policy papers, protocol docs,
 * perspective pieces, and relevant blog posts).
 *
 * Promotion bar: at least one same-domain work page with quotable prose drawn
 * from that work — not from mission/about/tagline pages alone.
 *
 * Usage:
 *   node scripts/generate-roster-corpus-briefings.mjs
 *   node scripts/generate-roster-corpus-briefings.mjs --limit=20
 *   node scripts/generate-roster-corpus-briefings.mjs --slug=consumerreports
 *
 * Output:
 *   src/data/alliance-roster-corpus.json
 *   src/data/alliance-roster-corpus-report.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROBE_PATHS,
  MARKETING_PATH_PATTERNS,
  classifyWorkPage,
  extractLinks,
  extractQuotableSentences,
  extractTextFromHtml,
  extractTitle,
  fetchResource,
  isBlockedUrl,
  isPdfUrl,
  isSameOrgDomain,
  scoreWorkUrl,
} from './lib/corpus-fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rosterPath = path.join(__dirname, '../src/data/alliance-roster.json');
const directoryPath = path.join(__dirname, '../src/data/alliance-directory.json');
const outPath = path.join(__dirname, '../src/data/alliance-roster-corpus.json');
const reportPath = path.join(__dirname, '../src/data/alliance-roster-corpus-report.json');

const PLA_ALLIANCE_URL = 'https://www.projectliberty.io/alliance/';
const MAX_WORK_PAGES = 10;
const MAX_SOURCES_PER_ORG = 8;
const CONCURRENCY = 4;

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
  protocol: ['DP7', 'DP5', 'DP1'],
};

const DEFAULT_DPS = ['DP2', 'DP4', 'DP20', 'DP8'];

const CONTENT_TAG_RULES = [
  { pattern: /\bprivacy\b|\bconfidential\b|\bdata protection\b/i, tags: ['privacy'] },
  { pattern: /\bidentity\b|\bauthentication\b|\bself-sovereign\b/i, tags: ['identity'] },
  { pattern: /\bpolicy\b|\bregulation\b|\bgovernance\b|\blegislation\b/i, tags: ['policy', 'governance'] },
  { pattern: /\bresearch\b|\bstudy\b|\bevidence\b|\bfindings\b/i, tags: ['research'] },
  { pattern: /\buniversity\b|\bacademic\b|\bscholar\b|\b\.edu\b/i, tags: ['academic', 'education'] },
  { pattern: /\bartificial intelligence\b|\bmachine learning\b|\bAI\b|\bLLM\b/i, tags: ['ai'] },
  { pattern: /\bsecurity\b|\bcyber\b|\btrust\b|\bsafety\b/i, tags: ['security'] },
  { pattern: /\bdata\b|\bdataset\b|\banalytics\b/i, tags: ['data'] },
  { pattern: /\bsocial\b|\bcommunity\b|\bnetwork\b/i, tags: ['social'] },
  { pattern: /\bmedia\b|\bjournalism\b|\bnews\b|\bpress\b/i, tags: ['media'] },
  { pattern: /\bhealth\b|\bmedical\b|\bclinical\b|\bpatient\b/i, tags: ['health'] },
  { pattern: /\bprotocol\b|\bstandard\b|\bspecification\b|\bDSNP\b/i, tags: ['protocol', 'dsnp'] },
];

function parseArgs(argv) {
  const args = { limit: 0, slug: null, verbose: false };
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length)) || 0;
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length);
    else if (arg === '--verbose') args.verbose = true;
  }
  return args;
}

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

function inferTagsFromCorpus(text) {
  const tags = new Set(['nonprofit']);
  for (const rule of CONTENT_TAG_RULES) {
    if (rule.pattern.test(text)) {
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

/**
 * @param {string} website
 * @param {string} domain
 * @param {string} homepageHtml
 */
function discoverCandidateUrls(website, domain, homepageHtml) {
  /** @type {Map<string, { url: string; score: number; linkText: string }>} */
  const candidates = new Map();

  function add(url, linkText = '') {
    if (isBlockedUrl(url) || !isSameOrgDomain(url, domain)) return;
    const score = scoreWorkUrl(url, linkText);
    if (score < 0) return;
    const existing = candidates.get(url);
    if (!existing || score > existing.score) {
      candidates.set(url, { url, score, linkText });
    }
  }

  for (const link of extractLinks(homepageHtml, website)) {
    add(link.href, link.text);
  }

  try {
    const base = new URL(website);
    for (const probe of PROBE_PATHS) {
      add(new URL(probe, base).href, probe.replace(/\//g, ' '));
    }
  } catch {
    // skip
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score);
}

/** Index/listing pages — follow child article links. */
const INDEX_PATH_RE =
  /\/(blog|news|articles?|posts?|publications?|research|reports?|insights?|perspectives?|commentary|resources?|library|updates?)\/?$/i;

/**
 * @param {string} html
 * @param {string} baseUrl
 * @param {string} domain
 */
function extractIndexChildLinks(html, baseUrl, domain) {
  /** @type {{ href: string; text: string; score: number }[]} */
  const childLinks = [];
  for (const link of extractLinks(html, baseUrl)) {
    if (!isSameOrgDomain(link.href, domain)) continue;
    try {
      const path = new URL(link.href).pathname;
      if (INDEX_PATH_RE.test(path)) continue;
      if (MARKETING_PATH_PATTERNS.some((re) => re.test(path))) continue;
      const score = scoreWorkUrl(link.href, link.text);
      if (score >= 0 && link.text.length >= 8) {
        childLinks.push({ href: link.href, text: link.text, score: score + 4 });
      }
    } catch {
      // skip
    }
  }
  return childLinks.sort((a, b) => b.score - a.score).slice(0, 12);
}

/**
 * @param {{ url: string; title: string; quotes: string[]; excerpt: string; kind: string }} page
 */
function sourceLabel(page) {
  if (page.title && page.title.length <= 80) return page.title;
  try {
    const path = new URL(page.url).pathname.replace(/\/$/, '') || '/';
    return path.slice(1).replace(/\//g, ' · ') || page.url;
  } catch {
    return page.url;
  }
}

function pitchFor(org, workPages) {
  const shortName = org.shortName;
  const primary = workPages[0];
  const workLabel = sourceLabel(primary);
  return {
    headline: `We opened a landing pad for ${shortName} from public work, not a mission paraphrase.`,
    lead: `${org.name} publishes citable work we could quote (${workLabel}). This briefing is a hypothesis built from those sources. Tell us if we misread the research, add papers we missed, and weigh in on Desirable Properties tied to that work.`,
    ask: `If you represent ${shortName}, confirm the source URLs, then open the Desirable Properties tab and leave a patch idea where the property text misses what your public work already argues.`,
    captureLine: `Research and policy only change the rule-set when it is linked to original sources. Help us keep this pad tied to your papers and reports, not a press-release summary.`,
  };
}

/**
 * @param {import('../src/data/alliance-roster.json').orgs[0]} org
 * @param {boolean} verbose
 */
async function processOrg(org, verbose) {
  const shortName = shortNameFrom(org.name, org.domain);
  const baseResult = {
    slug: org.slug,
    name: org.name,
    shortName,
    domain: org.domain,
    website: org.website,
  };

  const homepage = await fetchResource(org.website);
  if (!homepage.ok) {
    return {
      ...baseResult,
      status: 'stub',
      reason: 'fetch_failed',
      detail: `Homepage fetch failed (${homepage.status || homepage.error || 'unknown'})`,
    };
  }

  if (homepage.isPdf) {
    return {
      ...baseResult,
      status: 'stub',
      reason: 'only_pdf_homepage',
      detail: 'Homepage resolves to PDF without HTML work index',
    };
  }

  const homepageText = extractTextFromHtml(homepage.body);
  if (homepageText.length < 120) {
    return {
      ...baseResult,
      status: 'stub',
      reason: 'empty_homepage',
      detail: 'Homepage returned little or no readable HTML text',
    };
  }

  const candidates = discoverCandidateUrls(org.website, org.domain, homepage.body);

  /** @type {{ url: string; title: string; quotes: string[]; excerpt: string; kind: string }[]} */
  const workPages = [];
  const visited = new Set();

  async function tryWorkUrl(candidate) {
    if (workPages.length >= MAX_SOURCES_PER_ORG) return;
    if (visited.has(candidate.url)) return;
    visited.add(candidate.url);

    const fetched = await fetchResource(candidate.url);
    if (!fetched.ok) return;

    // If this looks like an index page, collect child article links first
    if (!fetched.isPdf && !isPdfUrl(fetched.url)) {
      try {
        const path = new URL(fetched.url).pathname;
        if (INDEX_PATH_RE.test(path)) {
          const children = extractIndexChildLinks(fetched.body, fetched.url, org.domain);
          for (const child of children) {
            if (!visited.has(child.href)) {
              await tryWorkUrl({ url: child.href, score: child.score, linkText: child.text });
            }
          }
          return;
        }
      } catch {
        // continue as leaf page
      }
    }

    if (fetched.isPdf || isPdfUrl(fetched.url)) {
      const linkContext = candidate.linkText.trim();
      if (
        linkContext.length >= 40 &&
        /report|paper|research|study|brief|publication|protocol|perspective|essay|article|blog|insight|analysis/i.test(
          linkContext,
        )
      ) {
        workPages.push({
          url: fetched.url,
          title: linkContext.slice(0, 120),
          quotes: [linkContext],
          excerpt: linkContext,
          kind: 'pdf-link',
        });
      }
      return;
    }

    const title =
      extractTitle(fetched.body) || candidate.linkText || sourceLabel({ url: fetched.url, title: '' });
    const text = extractTextFromHtml(fetched.body);
    const kind = classifyWorkPage(fetched.url, title, text);
    if (kind !== 'work') return;

    const quotes = extractQuotableSentences(text);
    if (quotes.length === 0) return;

    workPages.push({
      url: fetched.url,
      title,
      quotes,
      excerpt: quotes[0],
      kind: 'html-work',
    });
  }

  const sortedCandidates = candidates.sort((a, b) => b.score - a.score).slice(0, MAX_WORK_PAGES);
  for (const candidate of sortedCandidates) {
    await tryWorkUrl(candidate);
  }

  if (workPages.length === 0) {
    const tried = sortedCandidates.slice(0, 4).map((c) => c.url);
    return {
      ...baseResult,
      status: 'stub',
      reason: candidates.length === 0 ? 'no_work_links' : 'only_mission_or_thin',
      detail:
        candidates.length === 0
          ? 'No research/publications/reports/perspectives/blog links found'
          : 'Found candidate links but none yielded quotable work prose',
      triedUrls: tried,
    };
  }

  const corpusText = workPages.map((p) => `${p.title} ${p.excerpt} ${p.quotes.join(' ')}`).join(' ');
  const missionQuote = workPages[0].quotes[0];
  const values = workPages
    .flatMap((p) => p.quotes.slice(1, 3))
    .filter(Boolean)
    .slice(0, 3);

  while (values.length < 2 && workPages.length > values.length) {
    const extra = workPages[values.length]?.quotes[0];
    if (extra && extra !== missionQuote && !values.includes(extra)) values.push(extra);
    else break;
  }

  if (values.length < 1) {
    return {
      ...baseResult,
      status: 'stub',
      reason: 'insufficient_quotes',
      detail: 'Work pages found but not enough quotable sentences',
      workUrls: workPages.map((p) => p.url),
    };
  }

  const tags = inferTagsFromCorpus(corpusText);
  const entry = {
    slug: org.slug,
    name: org.name,
    shortName,
    kind: 'organization',
    website: org.website,
    allianceUrl: PLA_ALLIANCE_URL,
    claimDomains: [org.domain.replace(/^www\./, '')],
    tags,
    mission: missionQuote,
    values: values.slice(0, 3),
    sources: workPages.map((page) => ({
      label: sourceLabel(page),
      url: page.url,
    })),
    partners: [],
    externalPartners: [],
    relatedDps: relatedDpsFromTags(tags),
    pitch: pitchFor({ ...org, shortName }, workPages),
    corpusMeta: {
      generatedFrom: 'public-work',
      hypothesis: true,
      workPageCount: workPages.length,
    },
  };

  if (verbose) {
    console.log(`  ✓ promoted ${org.slug} (${workPages.length} work sources)`);
  }

  return {
    ...baseResult,
    status: 'promoted',
    reason: 'public_work_corpus',
    workUrls: workPages.map((p) => p.url),
    entry,
  };
}

async function mapPool(items, concurrency, worker) {
  /** @type {any[]} */
  const results = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  const directory = JSON.parse(fs.readFileSync(directoryPath, 'utf8'));
  const stewardSlugs = new Set(directory.orgs.map((org) => org.slug));

  let targets = roster.orgs.filter((org) => !stewardSlugs.has(org.slug));
  if (args.slug) {
    targets = targets.filter((org) => org.slug === args.slug);
    if (targets.length === 0) {
      console.error(`Slug not found or is a steward org: ${args.slug}`);
      process.exit(1);
    }
  }
  if (args.limit > 0) targets = targets.slice(0, args.limit);

  console.log(`Scanning ${targets.length} roster org(s) for public work corpus…`);
  const started = Date.now();

  const results = await mapPool(targets, CONCURRENCY, async (org, i) => {
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`[${i + 1}/${targets.length}] ${org.slug}`);
    }
    return processOrg(org, args.verbose);
  });

  const promoted = results.filter((r) => r.status === 'promoted');
  const stubs = results.filter((r) => r.status === 'stub');

  const reasonCounts = {};
  for (const stub of stubs) {
    reasonCounts[stub.reason] = (reasonCounts[stub.reason] || 0) + 1;
  }

  const corpusOutput = {
    cohort: roster.cohort,
    generatedAt: new Date().toISOString().slice(0, 10),
    generatorNote:
      'Auto-generated full corpus briefings for PLA roster orgs with quotable public research, reports, or protocol docs. Hypothesis until claimed. Regenerate: node scripts/generate-roster-corpus-briefings.mjs. Does not overwrite steward orgs in alliance-directory.json.',
    sourceRosterImportedAt: roster.importedAt,
    promotionCriteria:
      'Promoted only when same-domain public work (research, reports, papers, perspectives, relevant blogs, protocol docs) yields quotable prose with cited URLs. Mission/about-only sites stay invitation stubs.',
    stats: {
      attempted: targets.length,
      promoted: promoted.length,
      stubs: stubs.length,
      reasonCounts,
      elapsedSeconds: Math.round((Date.now() - started) / 1000),
    },
    orgs: promoted.map((r) => r.entry).sort((a, b) => a.name.localeCompare(b.name)),
  };

  const reportOutput = {
    generatedAt: corpusOutput.generatedAt,
    stats: corpusOutput.stats,
    promoted: promoted.map((r) => ({
      slug: r.slug,
      name: r.name,
      workUrls: r.workUrls,
    })),
    stubs: stubs
      .map((r) => ({
        slug: r.slug,
        name: r.name,
        reason: r.reason,
        detail: r.detail,
        triedUrls: r.triedUrls,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  };

  fs.writeFileSync(outPath, `${JSON.stringify(corpusOutput, null, 2)}\n`);
  fs.writeFileSync(reportPath, `${JSON.stringify(reportOutput, null, 2)}\n`);

  console.log('\n--- Corpus generation complete ---');
  console.log(`Promoted: ${promoted.length}`);
  console.log(`Stubs:    ${stubs.length}`);
  console.log('Reasons:', reasonCounts);
  console.log(`Wrote ${outPath}`);
  console.log(`Wrote ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
