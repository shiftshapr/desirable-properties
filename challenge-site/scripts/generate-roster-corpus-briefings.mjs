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
 *   node scripts/generate-roster-corpus-briefings.mjs --retry-failed
 *   node scripts/discover-corpus-seeds.mjs
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
  decodeEntities,
  extractLinks,
  extractPdfText,
  extractQuotableSentences,
  extractTextFromHtml,
  extractTitle,
  fetchResource,
  pdfTitleFromUrl,
  isBlockedUrl,
  isHomepageUrl,
  isPdfUrl,
  isSameOrgDomain,
  isStrongWorkUrl,
  scoreWorkUrl,
} from './lib/corpus-fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rosterPath = path.join(__dirname, '../src/data/alliance-roster.json');
const directoryPath = path.join(__dirname, '../src/data/alliance-directory.json');
const stubsPath = path.join(__dirname, '../src/data/alliance-roster-corpus-stubs.json');
const seedsPath = path.join(__dirname, '../src/data/alliance-roster-corpus-seeds.json');
const outPath = path.join(__dirname, '../src/data/alliance-roster-corpus.json');
const reportPath = path.join(__dirname, '../src/data/alliance-roster-corpus-report.json');

const PLA_ALLIANCE_URL = 'https://www.projectliberty.io/alliance/';
const MAX_WORK_PAGES = 14;
const MAX_SOURCES_PER_ORG = 10;
const CONCURRENCY = 6;

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
  const args = { limit: 0, slug: null, verbose: false, retryFailed: false };
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) args.limit = Number(arg.slice('--limit='.length)) || 0;
    else if (arg.startsWith('--slug=')) args.slug = arg.slice('--slug='.length);
    else if (arg === '--verbose') args.verbose = true;
    else if (arg === '--retry-failed') args.retryFailed = true;
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
    const bareDomain = domain.replace(/^www\./, '');
    for (const probe of PROBE_PATHS) {
      add(new URL(probe, base).href, probe.replace(/\//g, ' '));
    }
    add(new URL('/sitemap.xml', base).href, 'sitemap');
    for (const sub of ['blog', 'research', 'news', 'insights', 'publications', 'reports']) {
      add(`https://${sub}.${bareDomain}/`, sub);
      add(`https://${sub}.${bareDomain}/blog`, `${sub} blog`);
    }
  } catch {
    // skip
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score);
}

/**
 * @param {string} body
 * @param {string} baseUrl
 * @param {string} domain
 * @param {(url: string, linkText?: string) => void} add
 */
function ingestSitemapLinks(body, baseUrl, domain, add) {
  if (!body.includes('<urlset') && !body.includes('<sitemapindex')) return;
  const locRe = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRe.exec(body)) !== null) {
    const loc = match[1].trim();
    if (isSameOrgDomain(loc, domain)) add(loc, 'sitemap');
  }
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
 * @param {string[]} [seedUrls]
 */
async function processOrg(org, verbose, seedUrls = []) {
  const shortName = shortNameFrom(org.name, org.domain);
  const baseResult = {
    slug: org.slug,
    name: org.name,
    shortName,
    domain: org.domain,
    website: org.website,
  };

  let homepage = await fetchResource(org.website);
  if (!homepage.ok) {
    try {
      const alt = new URL(org.website);
      if (!alt.hostname.startsWith('www.')) {
        alt.hostname = `www.${alt.hostname}`;
        homepage = await fetchResource(alt.href);
      }
    } catch {
      // keep failed
    }
  }

  /** @type {{ url: string; score: number; linkText: string }[]} */
  let candidates = [];

  if (seedUrls.length > 0) {
    for (const url of seedUrls) {
      candidates.push({ url, score: 1000, linkText: 'research seed' });
    }
  }

  if (homepage.ok && !homepage.isPdf) {
    const homepageText = extractTextFromHtml(homepage.body);
    if (homepageText.length >= 120) {
      candidates.push(...discoverCandidateUrls(org.website, org.domain, homepage.body));
      try {
        const sitemapUrl = new URL('/sitemap.xml', org.website).href;
        const sitemap = await fetchResource(sitemapUrl);
        if (sitemap.ok && sitemap.body) {
          const addExtra = (url, linkText = '') => {
            if (isBlockedUrl(url) || !isSameOrgDomain(url, org.domain)) return;
            const score = scoreWorkUrl(url, linkText);
            if (score < 0) return;
            candidates.push({ url, score, linkText });
          };
          ingestSitemapLinks(sitemap.body, sitemapUrl, org.domain, addExtra);
        }
      } catch {
        // optional
      }
    }
  } else if (seedUrls.length === 0) {
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
    return {
      ...baseResult,
      status: 'stub',
      reason: 'empty_homepage',
      detail: 'Homepage returned little or no readable HTML text',
    };
  }

  // Dedupe candidates by URL, keep highest score
  const candidateMap = new Map();
  for (const c of candidates) {
    const existing = candidateMap.get(c.url);
    if (!existing || c.score > existing.score) candidateMap.set(c.url, c);
  }
  candidates = [...candidateMap.values()];

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
      const fromSeed = seedUrls.includes(candidate.url);
      try {
        const path = new URL(fetched.url).pathname;
        if (INDEX_PATH_RE.test(path) && !fromSeed) {
          const children = extractIndexChildLinks(fetched.body, fetched.url, org.domain);
          for (const child of children) {
            if (!visited.has(child.href)) {
              await tryWorkUrl({ url: child.href, score: child.score, linkText: child.text });
            }
          }
          if (children.length > 0) return;
        }
      } catch {
        // continue as leaf page
      }
    }

    if (fetched.isPdf || isPdfUrl(fetched.url)) {
      const fromSeed = seedUrls.includes(candidate.url);
      const pdfText = await extractPdfText(fetched.url);
      const pdfQuotes = pdfText ? extractQuotableSentences(pdfText) : [];
      if (pdfQuotes.length > 0) {
        const title =
          candidate.linkText.trim() && candidate.linkText.trim() !== 'research seed'
            ? candidate.linkText.trim().slice(0, 120)
            : pdfTitleFromUrl(fetched.url);
        workPages.push({
          url: fetched.url,
          title,
          quotes: pdfQuotes.map((q) => decodeEntities(q)),
          excerpt: decodeEntities(pdfQuotes[0]),
          kind: 'pdf-work',
          fromSeed,
        });
        return;
      }

      const linkContext = candidate.linkText.trim();
      if (
        fromSeed &&
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
    const quotes = extractQuotableSentences(text);
    const fromSeed = seedUrls.includes(candidate.url);
    const relaxedOk =
      fromSeed && quotes.length >= 1 && text.length >= 250 && !isMarketingPath(fetched.url);
    if (kind !== 'work' && !relaxedOk) {
      if (kind === 'thin' && quotes.length >= 2 && text.length >= 400) {
        // allow substantive thin pages
      } else {
        return;
      }
    }
    if (quotes.length === 0) return;

    workPages.push({
      url: fetched.url,
      title: decodeEntities(title),
      quotes: quotes.map((q) => decodeEntities(q)),
      excerpt: decodeEntities(quotes[0]),
      kind: 'html-work',
      fromSeed: seedUrls.includes(candidate.url),
    });
  }

  const sortedCandidates = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, seedUrls.length > 0 ? Math.max(MAX_WORK_PAGES, seedUrls.length + 8) : MAX_WORK_PAGES);
  for (const candidate of sortedCandidates) {
    await tryWorkUrl(candidate);
  }

  // Drop weak pages: homepage, marketing paths, thin press indexes
  const strongWorkPages = workPages.filter((page) => {
    if (isHomepageUrl(page.url, org.website) && !page.fromSeed) return false;
    if (isMarketingPath(page.url)) return false;
    try {
      const path = new URL(page.url).pathname;
      if (/\/press\/?$/i.test(path)) return false;
    } catch {
      return false;
    }
    return page.quotes.some((q) => q.length >= 80 && !isBoilerplateQuote(q));
  });

  const promotablePages = strongWorkPages.filter(
    (p) =>
      isStrongWorkUrl(p.url) ||
      p.kind === 'html-work' ||
      p.kind === 'pdf-link' ||
      p.kind === 'pdf-work' ||
      seedUrls.includes(p.url),
  );

  if (promotablePages.length === 0) {
    const tried = sortedCandidates.slice(0, 4).map((c) => c.url);
    return {
      ...baseResult,
      status: 'stub',
      reason: candidates.length === 0 ? 'no_work_links' : 'only_mission_or_thin',
      detail:
        candidates.length === 0
          ? 'No research/publications/reports/perspectives/blog links found'
          : 'No strong publication/report/article URLs with quotable work prose',
      triedUrls: tried,
    };
  }

  const workPagesForEntry = promotablePages.slice(0, MAX_SOURCES_PER_ORG);

  const corpusText = workPagesForEntry
    .map((p) => `${p.title} ${p.excerpt} ${p.quotes.join(' ')}`)
    .join(' ');
  const missionQuote = workPagesForEntry[0].quotes.find((q) => !isBoilerplateQuote(q)) || workPagesForEntry[0].quotes[0];
  const values = workPagesForEntry
    .flatMap((p) => p.quotes.filter((q) => q !== missionQuote && !isBoilerplateQuote(q)))
    .slice(0, 3);

  if (!missionQuote || isBoilerplateQuote(missionQuote)) {
    return {
      ...baseResult,
      status: 'stub',
      reason: 'insufficient_quotes',
      detail: 'Work URLs found but quotable prose failed quality gate',
      workUrls: promotablePages.map((p) => p.url),
    };
  }

  if (values.length < 1) {
    values.push(missionQuote);
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
    sources: workPagesForEntry.map((page) => ({
      label: sourceLabel(page),
      url: page.url,
    })),
    partners: [],
    externalPartners: [],
    relatedDps: relatedDpsFromTags(tags),
    pitch: pitchFor({ ...org, shortName }, workPagesForEntry),
    corpusMeta: {
      generatedFrom: 'public-work',
      hypothesis: true,
      workPageCount: workPagesForEntry.length,
    },
  };

  if (verbose) {
    console.log(`  ✓ promoted ${org.slug} (${workPagesForEntry.length} work sources)`);
  }

  return {
    ...baseResult,
    status: 'promoted',
    reason: 'public_work_corpus',
    workUrls: workPagesForEntry.map((p) => p.url),
    entry,
  };
}

function isBoilerplateQuote(sentence) {
  const lower = sentence.toLowerCase();
  if (sentence.length < 80) return true;
  const bad = [
    'skip to',
    'dismiss message',
    'buy, own',
    'lab-tested',
    'best deals',
    'shop for',
    'media room',
    'join ',
    'sign up',
    'subscribe',
    'click here',
  ];
  return bad.some((term) => lower.includes(term));
}

function isMarketingPath(url) {
  try {
    const path = new URL(url).pathname;
    return MARKETING_PATH_PATTERNS.some((re) => re.test(path));
  } catch {
    return true;
  }
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

  /** @type {Set<string>} */
  let mandatoryStubSlugs = new Set();
  let researchPassDate = null;
  if (fs.existsSync(stubsPath)) {
    const stubPacket = JSON.parse(fs.readFileSync(stubsPath, 'utf8'));
    mandatoryStubSlugs = new Set(stubPacket.stubSlugs || []);
    researchPassDate = stubPacket.researchPassDate || null;
  }

  let targets = roster.orgs.filter((org) => !stewardSlugs.has(org.slug));
  if (args.slug) {
    targets = targets.filter((org) => org.slug === args.slug);
    if (targets.length === 0) {
      console.error(`Slug not found or is a steward org: ${args.slug}`);
      process.exit(1);
    }
  }
  if (args.limit > 0) targets = targets.slice(0, args.limit);

  /** @type {Map<string, object>} */
  let existingPromoted = new Map();
  if ((args.retryFailed || args.slug) && fs.existsSync(outPath)) {
    const priorCorpus = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    for (const org of priorCorpus.orgs || []) {
      existingPromoted.set(org.slug, org);
    }
  }
  if (args.retryFailed && fs.existsSync(reportPath)) {
    const priorReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const retrySlugs = new Set((priorReport.promoteFetchFailed || []).map((row) => row.slug));
    targets = targets.filter((org) => retrySlugs.has(org.slug));
    console.log(`Retry-failed mode: ${targets.length} org(s)`);
  }

  if (!args.retryFailed && !args.slug) {
    existingPromoted = new Map();
  }

  /** @type {Record<string, string[]>} */
  const seedMap = {};
  if (fs.existsSync(seedsPath)) {
    const seedPacket = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
    for (const [slug, entry] of Object.entries(seedPacket.orgs || {})) {
      seedMap[slug] = entry.workUrls || [];
    }
  }

  const promoteTargets = targets.filter((org) => !mandatoryStubSlugs.has(org.slug));

  console.log(
    `Research pass: ${mandatoryStubSlugs.size} mandatory stubs, ${promoteTargets.length} promote targets, ${Object.keys(seedMap).length} seed orgs`,
  );
  console.log(`Scanning ${promoteTargets.length} roster org(s) for public work corpus…`);
  const started = Date.now();

  const allRosterNonSteward = roster.orgs.filter((org) => !stewardSlugs.has(org.slug));

  /** @type {any[]} */
  const forcedStubResults = allRosterNonSteward
    .filter((org) => mandatoryStubSlugs.has(org.slug))
    .map((org) => ({
      slug: org.slug,
      name: org.name,
      shortName: shortNameFrom(org.name, org.domain),
      domain: org.domain,
      website: org.website,
      status: 'stub',
      reason: 'research_pass_stub',
      detail: 'Manual research pass (2026-08-21): no findable public work corpus; keep invitation pad.',
    }));

  const results = await mapPool(promoteTargets, CONCURRENCY, async (org, i) => {
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`[${i + 1}/${promoteTargets.length}] ${org.slug}`);
    }
    return processOrg(org, args.verbose, seedMap[org.slug] || []);
  });

  const newlyPromoted = results.filter((r) => r.status === 'promoted');
  const autoStubs = results.filter((r) => r.status === 'stub');
  const autoStubBySlug = new Map(autoStubs.map((row) => [row.slug, row]));

  for (const row of newlyPromoted) {
    if (row.entry) existingPromoted.set(row.slug, row.entry);
  }

  const mergedPromoted = [...existingPromoted.values()].sort((a, b) => a.name.localeCompare(b.name));
  const mergedPromotedSlugs = new Set(mergedPromoted.map((org) => org.slug));

  const promoteFetchFailed = allRosterNonSteward
    .filter((org) => !mandatoryStubSlugs.has(org.slug) && !mergedPromotedSlugs.has(org.slug))
    .map((org) => {
      const auto = autoStubBySlug.get(org.slug);
      return {
        slug: org.slug,
        name: org.name,
        reason: auto?.reason || 'only_mission_or_thin',
        detail: auto?.detail || 'Auto-fetch did not produce quotable work corpus',
        triedUrls: auto?.triedUrls,
      };
    });

  const finalStubs = [
    ...forcedStubResults,
    ...promoteFetchFailed.map((row) => ({ ...row, status: 'stub' })),
  ];

  const reasonCounts = {};
  for (const stub of finalStubs) {
    reasonCounts[stub.reason] = (reasonCounts[stub.reason] || 0) + 1;
  }

  const corpusOutput = {
    cohort: roster.cohort,
    generatedAt: new Date().toISOString().slice(0, 10),
    generatorNote:
      'Auto-generated full corpus briefings for PLA roster orgs with quotable public research, reports, perspectives, and relevant blogs. Hypothesis until claimed. Regenerate: node scripts/generate-roster-corpus-briefings.mjs. Does not overwrite steward orgs in alliance-directory.json.',
    sourceRosterImportedAt: roster.importedAt,
    researchPassDate,
    mandatoryStubCount: mandatoryStubSlugs.size,
    promotionCriteria:
      '171 roster orgs from 2026-08-21 research pass receive corpus fetch attempts. 37 mandatory stubs (alliance-roster-corpus-stubs.json) keep invitation pads. Promoted only when same-domain public work yields quotable prose with cited URLs — not mission/about-only text.',
    stats: {
      rosterTotal: roster.orgs.length,
      promoteTarget: allRosterNonSteward.length - mandatoryStubSlugs.size,
      promoted: mergedPromoted.length,
      stubs: finalStubs.length,
      mandatoryStubs: forcedStubResults.length,
      promoteFetchFailed: promoteFetchFailed.length,
      reasonCounts,
      elapsedSeconds: Math.round((Date.now() - started) / 1000),
    },
    orgs: mergedPromoted,
  };

  const reportOutput = {
    generatedAt: corpusOutput.generatedAt,
    researchPassDate,
    stats: corpusOutput.stats,
    mandatoryStubSlugs: [...mandatoryStubSlugs].sort(),
    promoted: mergedPromoted.map((org) => ({
      slug: org.slug,
      name: org.name,
      workUrls: org.sources.map((source) => source.url),
    })),
    promoteFetchFailed,
    stubs: finalStubs
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
  console.log(`Promoted:        ${mergedPromoted.length} (target ${allRosterNonSteward.length - mandatoryStubSlugs.size})`);
  console.log(`Mandatory stubs: ${forcedStubResults.length}`);
  console.log(`Fetch-failed:    ${promoteFetchFailed.length}`);
  console.log(`Total stubs:     ${finalStubs.length}`);
  console.log('Reasons:', reasonCounts);
  if (promoteFetchFailed.length > 0) {
    console.log('Fetch-failed slugs:', promoteFetchFailed.map((r) => r.slug).join(', '));
  }
  console.log(`Wrote ${outPath}`);
  console.log(`Wrote ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
