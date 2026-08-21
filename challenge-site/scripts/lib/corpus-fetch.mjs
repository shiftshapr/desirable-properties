/**
 * Shared fetch + HTML helpers for roster corpus generation.
 */

export const FETCH_TIMEOUT_MS = 12_000;
export const USER_AGENT =
  'DesirablePropertiesCorpusGenerator/1.0 (+https://desirableproperties.org/pad)';

const BLOCKED_HOST_RE =
  /(^|\.)((linkedin|twitter|x|facebook|instagram|youtube|youtu\.be|wikipedia|wikimedia|medium\.com|substack\.com))(\.|$)/i;

/** Paths that often host research, reports, perspectives, or protocol docs. */
export const WORK_PATH_PATTERNS = [
  /\/research\b/i,
  /\/publications?\b/i,
  /\/papers?\b/i,
  /\/reports?\b/i,
  /\/resources?\b/i,
  /\/white-?papers?\b/i,
  /\/policy\b/i,
  /\/protocols?\b/i,
  /\/docs?\b/i,
  /\/library\b/i,
  /\/insights?\b/i,
  /\/studies\b/i,
  /\/working-?papers?\b/i,
  /\/briefs?\b/i,
  /\/analysis\b/i,
  /\/findings\b/i,
  /\/evidence\b/i,
  /\/standards?\b/i,
  /\/technical\b/i,
  /\/knowledge\b/i,
  /\/outputs?\b/i,
  /\/our-?work\b/i,
  /\/what-we-do\b/i,
  /\/perspectives?\b/i,
  /\/commentary\b/i,
  /\/articles?\b/i,
  /\/essays?\b/i,
  /\/blog\b/i,
  /\/posts?\b/i,
  /\/stories\b/i,
  /\/ideas\b/i,
  /\/opinion\b/i,
  /\/thoughts\b/i,
  /\/updates?\b/i,
  /\/writing\b/i,
  /\/media\b/i,
];

/** Marketing/about paths — never promote from these alone. */
export const MARKETING_PATH_PATTERNS = [
  /\/about\b/i,
  /\/mission\b/i,
  /\/team\b/i,
  /\/contact\b/i,
  /\/careers?\b/i,
  /\/press-releases?\b/i,
  /\/media-kit\b/i,
  /\/events?\b/i,
  /\/donate\b/i,
  /\/join\b/i,
  /\/membership\b/i,
  /\/volunteer\b/i,
  /\/support-us\b/i,
  /\/who-we-are\b/i,
  /\/staff\b/i,
  /\/board\b/i,
  /\/leadership\b/i,
  /\/what-we-do\b/i,
  /\/our-work\b/i,
  /\/meettheteam\b/i,
  /\/meet-the-team\b/i,
  /\/homepage\b/i,
];

export const WORK_LINK_TEXT_PATTERNS = [
  /report/i,
  /paper/i,
  /publication/i,
  /research/i,
  /white.?paper/i,
  /policy brief/i,
  /study/i,
  /protocol/i,
  /working paper/i,
  /framework/i,
  /guidance/i,
  /analysis/i,
  /findings/i,
  /technical doc/i,
  /perspective/i,
  /commentary/i,
  /essay/i,
  /article/i,
  /blog post/i,
  /insight/i,
  /briefing/i,
];

export const PROBE_PATHS = [
  '/research',
  '/publications',
  '/reports',
  '/resources',
  '/papers',
  '/insights',
  '/policy',
  '/library',
  '/studies',
  '/outputs',
  '/perspectives',
  '/commentary',
  '/articles',
  '/blog',
  '/writing',
  '/ideas',
];

/**
 * @param {string} raw
 * @param {string} orgDomain
 */
export function normalizeHostname(raw, orgDomain) {
  const host = raw.replace(/^www\./, '').toLowerCase();
  const org = orgDomain.replace(/^www\./, '').toLowerCase();
  return host === org || host.endsWith(`.${org}`);
}

/**
 * @param {string} url
 */
export function isBlockedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (BLOCKED_HOST_RE.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * @param {string} url
 * @param {string} orgDomain
 */
export function isSameOrgDomain(url, orgDomain) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const org = orgDomain.replace(/^www\./, '').toLowerCase();
    return host === org || host.endsWith(`.${org}`);
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 */
export function isPdfUrl(url) {
  try {
    const parsed = new URL(url);
    return /\.pdf($|\?)/i.test(parsed.pathname) || parsed.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 */
export function isMarketingPath(url) {
  try {
    const path = new URL(url).pathname;
    return MARKETING_PATH_PATTERNS.some((re) => re.test(path));
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 * @param {string} [linkText]
 */
export function scoreWorkUrl(url, linkText = '') {
  if (isMarketingPath(url)) return -1;
  let score = 0;
  try {
    const path = new URL(url).pathname;
    for (const re of WORK_PATH_PATTERNS) {
      if (re.test(path)) score += 10;
    }
    // Individual blog/article posts: /blog/slug, /news/slug, /2024/03/title
    if (/\/(blog|news|articles?|posts?|insights?|perspectives?|commentary)\/[^/]+/i.test(path)) {
      score += 12;
    }
    if (/\/\d{4}\/\d{2}\/[^/]+/.test(path)) score += 8;
    if (isPdfUrl(url)) score += 8;
  } catch {
    return -1;
  }
  const text = linkText.trim();
  if (text) {
    for (const re of WORK_LINK_TEXT_PATTERNS) {
      if (re.test(text)) score += 6;
    }
  }
  return score;
}

/**
 * @param {string} url
 */
export async function fetchResource(url) {
  if (isBlockedUrl(url)) {
    return { ok: false, status: 0, url, error: 'blocked' };
  }
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
        'User-Agent': USER_AGENT,
      },
    });
    const contentType = response.headers.get('content-type') || '';
    const isPdf = contentType.includes('pdf') || isPdfUrl(url);
    let body = '';
    if (!isPdf) {
      body = await response.text();
    }
    return {
      ok: response.ok,
      status: response.status,
      url: response.url || url,
      contentType,
      isPdf,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {string} html
 */
export function extractTitle(html) {
  const og =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (og?.[1]) return decodeEntities(og[1].trim());
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) return decodeEntities(title[1].trim());
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) return stripTags(h1[1]).trim();
  return '';
}

/**
 * @param {string} html
 * @param {string} baseUrl
 */
export function extractLinks(html, baseUrl) {
  /** @type {{ href: string; text: string }[]} */
  const links = [];
  const re = /<a\b[^>]*\bhref=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('javascript:')) continue;
    try {
      const href = new URL(rawHref, baseUrl).href;
      links.push({ href, text: stripTags(match[2]).replace(/\s+/g, ' ').trim() });
    } catch {
      // skip bad URLs
    }
  }
  return links;
}

/**
 * @param {string} html
 */
export function extractTextFromHtml(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  text = stripTags(text);
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} raw
 */
export function stripTags(raw) {
  return decodeEntities(raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

/**
 * @param {string} raw
 */
export function decodeEntities(raw) {
  return raw
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} text
 */
export function extractQuotableSentences(text) {
  const cleaned = text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]{0,30}\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 60 && s.length <= 420)
    .filter((s) => /[a-z]/i.test(s))
    .filter((s) => !isBoilerplateSentence(s));

  /** @type {string[]} */
  const unique = [];
  const seen = new Set();
  for (const sentence of sentences) {
    const key = sentence.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(sentence);
    if (unique.length >= 8) break;
  }
  return unique;
}

/**
 * @param {string} sentence
 */
function isBoilerplateSentence(sentence) {
  const lower = sentence.toLowerCase();
  const boilerplate = [
    'cookie',
    'privacy policy',
    'terms of service',
    'sign up',
    'subscribe',
    'all rights reserved',
    'click here',
    'learn more about',
    'follow us',
    'contact us',
    'donate now',
    'copyright',
    'javascript',
    'skip to main',
    'skip to content',
    'dismiss message',
    'buy, own',
    'lab-tested',
    'best deals',
    'shop for',
    'join our',
    'media room',
    'press release',
    'read more',
    'view all',
  ];
  if (boilerplate.some((term) => lower.includes(term))) return true;
  if (/^(home|about|contact|menu|search|skip to|buy|shop|best|most reliable)/i.test(sentence)) return true;
  if (/&#\d+;/.test(sentence)) return true;
  if ((sentence.match(/\|/g) || []).length >= 2) return true;
  return false;
}

/** Strong work URL — publication, report, paper, or named article/blog post. */
export function isStrongWorkUrl(url) {
  try {
    const path = new URL(url).pathname;
    if (isMarketingPath(url)) return false;
    if (/\/(publications?|reports?|papers?|research|insights?|articles?|essays?|perspectives?|commentary|briefs?|white-?papers?|policy|protocols?)\//i.test(path)) {
      return true;
    }
    if (/\/(blog|news|posts?)\/[^/]+/i.test(path)) return true;
    if (/\/\d{4}\/\d{2}\/[^/]+/.test(path)) return true;
    if (isPdfUrl(url)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 */
export function isHomepageUrl(url, website) {
  try {
    const a = new URL(url);
    const b = new URL(website);
    const path = a.pathname.replace(/\/$/, '') || '/';
    return a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '') && (path === '/' || /\/home(page)?$/i.test(path));
  } catch {
    return false;
  }
}

/**
 * @param {string} url
 * @param {string} title
 * @param {string} text
 */
export function classifyWorkPage(url, title, text) {
  if (isMarketingPath(url)) return 'marketing';
  const pathScore = scoreWorkUrl(url, title);
  const lowerTitle = `${title} ${text.slice(0, 400)}`.toLowerCase();
  const workSignals = [
    'report',
    'study',
    'research',
    'paper',
    'publication',
    'findings',
    'analysis',
    'framework',
    'protocol',
    'white paper',
    'policy brief',
    'methodology',
    'results',
    'evidence',
    'survey',
    'dataset',
    'perspective',
    'commentary',
    'essay',
    'article',
    'blog',
    'insight',
    'argument',
    'we argue',
    'we find',
    'we recommend',
    'our view',
  ];
  const marketingSignals = [
    'about us',
    'our mission',
    'who we are',
    'meet the team',
    'donate',
    'join us',
    'contact us',
    'our story',
    'careers',
    'board of directors',
  ];
  let workHits = workSignals.filter((s) => lowerTitle.includes(s)).length;
  let marketingHits = marketingSignals.filter((s) => lowerTitle.includes(s)).length;
  if (pathScore >= 10) workHits += 2;
  if (/\/(blog|news|articles?|posts?|insights?|perspectives?|commentary)\/[^/]+/i.test(new URL(url).pathname)) {
    workHits += 2;
  }
  if (text.length < 300) return 'thin';
  if (marketingHits >= 2 && workHits === 0) return 'marketing';
  if (workHits >= 1 && text.length >= 400) return 'work';
  if (pathScore >= 8 && text.length >= 500) return 'work';
  if (pathScore >= 12 && text.length >= 350) return 'work';
  return 'thin';
}
