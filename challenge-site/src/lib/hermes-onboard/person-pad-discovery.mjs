/**
 * Lightweight person pad candidate discovery from local site corpus.
 * No LinkedIn scraping, no paid APIs. Used by preview API and tests.
 */

/** @param {string} value */
function normalizeNameKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** @param {string} name */
function nameTokens(name) {
  return normalizeNameKey(name).match(/[a-z]{2,}/g) || [];
}

/**
 * Fuzzy person name match score (0-100).
 * @param {string} candidateName
 * @param {string} queryName
 */
export function scorePersonNameMatch(candidateName, queryName) {
  const candidateKey = normalizeNameKey(candidateName);
  const queryKey = normalizeNameKey(queryName);
  if (!candidateKey || !queryKey) return 0;
  if (candidateKey === queryKey) return 100;

  const queryParts = nameTokens(queryName);
  const candidateParts = nameTokens(candidateName);
  if (queryParts.length === 0 || candidateParts.length === 0) return 0;

  const lastQuery = queryParts[queryParts.length - 1];
  const firstQuery = queryParts[0];
  const lastCandidate = candidateParts[candidateParts.length - 1];
  const firstCandidate = candidateParts[0];

  if (lastQuery === lastCandidate && firstQuery === firstCandidate) return 95;
  if (lastQuery === lastCandidate && queryParts.length >= 2) return 85;
  if (candidateKey.includes(queryKey) && queryKey.length >= 6) return 75;
  if (queryKey.includes(candidateKey) && candidateKey.length >= 6) return 70;

  const overlap = queryParts.filter((part) => candidateParts.includes(part)).length;
  if (overlap >= 2) return 60 + overlap * 5;
  if (overlap === 1 && queryParts.length === 1 && queryParts[0].length >= 4) return 55;

  return 0;
}

/**
 * @param {string} source
 * @param {string} url
 */
export function candidateId(source, url) {
  return `${source}:${encodeURIComponent(url)}`.slice(0, 240);
}

/**
 * @typedef {{ id: string; title: string; url: string; source: string; snippet: string }} PersonPadCandidate
 * @typedef {{ displayName?: string; orgAffiliation?: string; workLinks?: string[]; perspectiveLinks?: string[]; bioText?: string; profilePaste?: string }} PersonPadDiscoveryInput
 */

/**
 * @param {PersonPadDiscoveryInput} input
 * @param {{ perspectives?: Array<{ slug: string; title: string; href: string; deck?: string }>; pciEmails?: Array<{ id: string; title: string; author: string; subject: string; ordinals_url?: string }>; rosterOrgs?: Array<{ slug: string; name: string; website: string }> }} corpus
 * @returns {PersonPadCandidate[]}
 */
export function discoverPersonPadCandidates(input, corpus = {}) {
  const displayName = input.displayName?.trim() || '';
  const orgAffiliation = input.orgAffiliation?.trim() || '';
  const bioText = input.bioText?.trim() || '';
  const profilePaste = input.profilePaste?.trim() || '';
  const workLinks = Array.isArray(input.workLinks)
    ? input.workLinks.map((row) => String(row).trim()).filter(Boolean)
    : [];
  const perspectiveLinks = Array.isArray(input.perspectiveLinks)
    ? input.perspectiveLinks.map((row) => String(row).trim()).filter(Boolean)
    : [];

  /** @type {PersonPadCandidate[]} */
  const found = [];
  const seen = new Set();

  /** @param {PersonPadCandidate} row */
  function push(row) {
    const key = row.url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push(row);
  }

  const searchText = [displayName, bioText, profilePaste, orgAffiliation].filter(Boolean).join(' ');

  for (const perspective of corpus.perspectives || []) {
    const haystack = [perspective.title, perspective.deck || '', perspective.slug].join(' ');
    const score = displayName ? scorePersonNameMatch(haystack, displayName) : 0;
    const textHit =
      searchText.length >= 4 &&
      normalizeNameKey(haystack).includes(normalizeNameKey(searchText).slice(0, 8));
    const linkHit = perspectiveLinks.some((link) => link.includes(perspective.slug));
    if (score >= 55 || textHit || linkHit) {
      push({
        id: candidateId('perspective', perspective.href),
        title: perspective.title,
        url: perspective.href,
        source: 'perspective',
        snippet: perspective.deck || 'Perspective on desirableproperties.org',
      });
    }
  }

  for (const email of corpus.pciEmails || []) {
    if (!displayName) continue;
    const score = scorePersonNameMatch(email.author || '', displayName);
    if (score < 55) continue;
    const url = email.ordinals_url || `/onchain#${email.id}`;
    push({
      id: candidateId('pci', url),
      title: email.title || email.subject || 'PCI conversation',
      url,
      source: 'pci',
      snippet: `PCI email by ${email.author || 'unknown author'}`,
    });
  }

  if (orgAffiliation && corpus.rosterOrgs?.length) {
    const orgKey = normalizeNameKey(orgAffiliation);
    for (const org of corpus.rosterOrgs) {
      const nameKey = normalizeNameKey(org.name);
      const slugKey = org.slug.replace(/-/g, '');
      const match =
        nameKey === orgKey ||
        slugKey === orgKey ||
        nameKey.includes(orgKey) ||
        orgKey.includes(nameKey);
      if (!match) continue;
      push({
        id: candidateId('roster', org.website),
        title: org.name,
        url: org.website,
        source: 'roster',
        snippet: 'Project Liberty Alliance roster org (public website)',
      });
      break;
    }
  }

  for (const href of workLinks) {
    if (/linkedin\.com/i.test(href)) continue;
    push({
      id: candidateId('work-link', href),
      title: href.replace(/^https?:\/\//, '').slice(0, 80),
      url: href,
      source: 'work-link',
      snippet: 'Work link you submitted',
    });
  }

  for (const href of perspectiveLinks) {
    push({
      id: candidateId('perspective-link', href),
      title: href,
      url: href.startsWith('/') ? href : href,
      source: 'perspective-link',
      snippet: 'Perspective link you submitted',
    });
  }

  if (bioText) {
    push({
      id: candidateId('profile', 'bio-text'),
      title: 'Pasted bio excerpt',
      url: '#bio-text',
      source: 'profile',
      snippet: bioText.slice(0, 160),
    });
  }

  if (profilePaste) {
    push({
      id: candidateId('profile', 'profile-paste'),
      title: 'Pasted profile text',
      url: '#profile-paste',
      source: 'profile',
      snippet: profilePaste.slice(0, 160),
    });
  }

  return found.slice(0, 15);
}
