import pciCorpus from '@/data/pci-emails-corpus.json';
import rosterJson from '@/data/alliance-roster.json';
import { FORK_IN_THE_WEB } from '@/data/perspectives/a-fork-in-the-web';
import {
  candidateId,
  discoverPersonPadCandidates as discoverLocal,
  scorePersonNameMatch,
} from '@/lib/hermes-onboard/person-pad-discovery.mjs';

export type PersonPadCandidate = {
  id: string;
  title: string;
  url: string;
  source: 'perspective' | 'pci' | 'roster' | 'work-link' | 'perspective-link' | 'profile' | 'open-graph';
  snippet: string;
};

export type PersonPadDiscoveryInput = {
  displayName?: string;
  linkedinUrl?: string;
  orgAffiliation?: string;
  workLinks?: string[];
  perspectiveLinks?: string[];
  bioText?: string;
  profilePaste?: string;
};

const LINKEDIN_HOST_RE = /(^|\.)linkedin\.com$/i;
const OG_FETCH_TIMEOUT_MS = 3500;
const OG_MAX_WORK_LINKS = 4;

const LOCAL_PERSPECTIVES = [
  {
    slug: FORK_IN_THE_WEB.slug,
    title: FORK_IN_THE_WEB.title,
    href: `/perspectives/${FORK_IN_THE_WEB.slug}`,
    deck: FORK_IN_THE_WEB.deck,
  },
];

function isBlockedFetchUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('#')) return true;
  let candidate = trimmed;
  if (!candidate.includes('://')) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }
  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (LINKEDIN_HOST_RE.test(host)) return true;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
    return false;
  } catch {
    return true;
  }
}

function parseOpenGraph(html: string): { title?: string; description?: string } {
  const titleMatch =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const descMatch =
    html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  return {
    title: titleMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
  };
}

async function fetchOpenGraphCandidate(url: string): Promise<PersonPadCandidate | null> {
  if (isBlockedFetchUrl(url)) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'DesirablePropertiesPersonPad/1.0 (+https://desirableproperties.org/pad)',
      },
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null;
    }
    const html = (await response.text()).slice(0, 120_000);
    const og = parseOpenGraph(html);
    if (!og.title && !og.description) return null;
    return {
      id: candidateId('open-graph', url),
      title: og.title || url.replace(/^https?:\/\//, ''),
      url,
      source: 'open-graph',
      snippet: og.description || 'Public page metadata (Open Graph)',
    };
  } catch {
    return null;
  }
}

function loadCorpus() {
  const rosterOrgs = (rosterJson as { orgs: Array<{ slug: string; name: string; website: string }> }).orgs;
  const pciEmails = (pciCorpus as { emails: Array<{ id: string; title: string; author: string; subject: string; ordinals_url?: string }> })
    .emails;
  return { perspectives: LOCAL_PERSPECTIVES, pciEmails, rosterOrgs };
}

export async function discoverPersonPadCandidates(
  input: PersonPadDiscoveryInput,
): Promise<PersonPadCandidate[]> {
  const corpus = loadCorpus();
  const local = discoverLocal(input, corpus) as PersonPadCandidate[];

  const seen = new Set(local.map((row) => row.url.toLowerCase()));
  const merged = [...local];

  const workLinks = Array.isArray(input.workLinks)
    ? input.workLinks.map((row) => String(row).trim()).filter(Boolean)
    : [];

  let fetched = 0;
  for (const href of workLinks) {
    if (fetched >= OG_MAX_WORK_LINKS) break;
    if (isBlockedFetchUrl(href)) continue;
    if (seen.has(href.toLowerCase())) continue;
    const ogCandidate = await fetchOpenGraphCandidate(href);
    if (!ogCandidate) continue;
    seen.add(ogCandidate.url.toLowerCase());
    merged.push(ogCandidate);
    fetched += 1;
  }

  return merged.slice(0, 15);
}

export { scorePersonNameMatch, candidateId };
