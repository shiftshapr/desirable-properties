const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @param {string} slug */
export function allianceSlugKey(slug) {
  return slug.replace(/-/g, '');
}

/** @param {string} slug */
function isAllianceSlug(slug) {
  return SLUG_RE.test(slug) && slug.length <= 80;
}

/**
 * @param {Array<{ slug: string; name: string; shortName: string; claimDomains: string[]; tags?: string[] }>} orgs
 * @param {string} slug
 */
function getAllianceOrg(orgs, slug) {
  if (!isAllianceSlug(slug)) return null;
  const exact = orgs.find((org) => org.slug === slug);
  if (exact) return exact;
  const key = allianceSlugKey(slug);
  return orgs.find((org) => allianceSlugKey(org.slug) === key) || null;
}

/** @param {string} input */
function normalizeToSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** @param {string} input */
function looksLikeDomainOrUrl(input) {
  const s = input.trim().toLowerCase();
  return s.includes('://') || (s.includes('.') && !s.includes(' '));
}

/** @param {string} raw */
function extractHostname(raw) {
  const trimmed = raw.trim();
  if (!trimmed || !looksLikeDomainOrUrl(trimmed)) return null;
  let candidate = trimmed.toLowerCase();
  if (!candidate.includes('://')) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }
  try {
    const url = new URL(candidate);
    return url.hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/**
 * @param {Array<{ slug: string; name: string; shortName: string; claimDomains: string[]; tags?: string[] }>} orgs
 * @param {string} hostname
 */
function resolveFromClaimDomain(orgs, hostname) {
  const matches = orgs.filter((org) => org.claimDomains.includes(hostname));
  if (matches.length === 1) return matches[0].slug;
  if (matches.length > 1) {
    const steward = matches.find((org) => org.tags?.includes('steward'));
    return steward?.slug ?? matches[0].slug;
  }
  return null;
}

/** @param {string} value */
function normalizeNameKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * @param {Array<{ slug: string; name: string; shortName: string; claimDomains: string[]; tags?: string[] }>} orgs
 * @param {string} input
 */
function scoreOrgMatch(org, key) {
  const nameKey = normalizeNameKey(org.name);
  const shortKey = normalizeNameKey(org.shortName);
  const slugKey = allianceSlugKey(org.slug);

  if (nameKey === key) return 100;
  if (slugKey === key) return 95;
  if (shortKey === key) return 90;
  if (nameKey.startsWith(key) && key.length >= 6) return 80;
  if (key.startsWith(nameKey) && nameKey.length >= 6) return 75;
  if (nameKey.includes(key) && key.length >= 8) return 70;
  if (key.includes(nameKey) && nameKey.length >= 8) return 65;
  return 0;
}

/**
 * @param {Array<{ slug: string; name: string; shortName: string; claimDomains: string[]; tags?: string[] }>} orgs
 * @param {string} input
 */
function fuzzyMatchOrgSlug(orgs, input) {
  const key = normalizeNameKey(input);
  if (!key) return null;

  const ranked = orgs
    .map((org) => ({ org, score: scoreOrgMatch(org, key) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  if (ranked.length === 1 || ranked[0].score > ranked[1].score) {
    return ranked[0].org.slug;
  }
  return null;
}

/**
 * @typedef {'found' | 'roster' | 'dynamic' | 'not_found'} PadLookupStatus
 * @typedef {{ slug: string; name: string; domain: string; website: string }} RosterOrgRef
 * @typedef {{ status: PadLookupStatus; slug: string | null; domain: string | null; name: string | null; href: string | null }} PadLookupResult
 */

/** @param {string} hostname */
export function slugFromHostname(hostname) {
  const label = hostname.replace(/^www\./, '').split('.')[0] || hostname;
  return normalizeToSlug(label) || normalizeToSlug(hostname);
}

/**
 * @param {RosterOrgRef[]} roster
 * @param {string} slug
 */
export function getRosterOrg(roster, slug) {
  if (!isAllianceSlug(slug)) return null;
  const exact = roster.find((org) => org.slug === slug);
  if (exact) return exact;
  const key = allianceSlugKey(slug);
  return roster.find((org) => allianceSlugKey(org.slug) === key) || null;
}

/**
 * @param {RosterOrgRef[]} roster
 * @param {string} hostname
 */
export function findRosterByDomain(roster, hostname) {
  return roster.find((org) => org.domain === hostname) || null;
}

/**
 * @param {RosterOrgRef} org
 * @param {string} key
 */
function scoreRosterMatch(org, key) {
  const nameKey = normalizeNameKey(org.name);
  const slugKey = allianceSlugKey(org.slug);
  const domainKey = normalizeNameKey(org.domain.split('.')[0]);

  if (nameKey === key) return 100;
  if (slugKey === key) return 95;
  if (domainKey === key) return 90;
  if (nameKey.startsWith(key) && key.length >= 6) return 80;
  if (key.startsWith(nameKey) && nameKey.length >= 6) return 75;
  if (nameKey.includes(key) && key.length >= 8) return 70;
  return 0;
}

/**
 * @param {RosterOrgRef[]} roster
 * @param {string} input
 */
function fuzzyMatchRosterSlug(roster, input) {
  const key = normalizeNameKey(input);
  if (!key) return null;

  const ranked = roster
    .map((org) => ({ org, score: scoreRosterMatch(org, key) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;
  if (ranked.length === 1 || ranked[0].score > ranked[1].score) {
    return ranked[0].org;
  }
  return null;
}

/** @param {string} slug @param {string | null | undefined} domain */
export function buildPadLookupHref(slug, domain) {
  if (domain) {
    return `/pad/${encodeURIComponent(slug)}?domain=${encodeURIComponent(domain)}`;
  }
  return `/pad/${encodeURIComponent(slug)}`;
}

/** @returns {PadLookupResult} */
function emptyPadLookupResult() {
  return { status: 'not_found', slug: null, domain: null, name: null, href: null };
}

/**
 * Resolve visitor input (org name, slug, or website URL) to a canonical pad slug.
 *
 * @param {Array<{ slug: string; name: string; shortName: string; claimDomains: string[]; tags?: string[] }>} orgs
 * @param {string} input
 * @returns {string | null}
 */
export function resolvePadSlugFromInput(orgs, input) {
  const result = resolvePadLookupWithCorpus(orgs, [], input);
  return result.status === 'found' ? result.slug : null;
}

/**
 * Resolve visitor input against directory pads and the prework roster.
 *
 * @param {Array<{ slug: string; name: string; shortName: string; claimDomains: string[]; tags?: string[] }>} orgs
 * @param {RosterOrgRef[]} roster
 * @param {string} input
 * @returns {PadLookupResult}
 */
export function resolvePadLookupWithCorpus(orgs, roster, input) {
  const trimmed = input.trim();
  if (!trimmed) return emptyPadLookupResult();

  const slugCandidate = normalizeToSlug(trimmed);
  const fromDirectorySlug = getAllianceOrg(orgs, slugCandidate);
  if (fromDirectorySlug) {
    return {
      status: 'found',
      slug: fromDirectorySlug.slug,
      domain: null,
      name: fromDirectorySlug.name,
      href: buildPadLookupHref(fromDirectorySlug.slug),
    };
  }

  const hostname = extractHostname(trimmed);
  if (hostname) {
    const fromClaimDomain = resolveFromClaimDomain(orgs, hostname);
    if (fromClaimDomain) {
      const org = orgs.find((row) => row.slug === fromClaimDomain);
      return {
        status: 'found',
        slug: fromClaimDomain,
        domain: hostname,
        name: org?.name ?? null,
        href: buildPadLookupHref(fromClaimDomain),
      };
    }

    const rosterByDomain = findRosterByDomain(roster, hostname);
    if (rosterByDomain) {
      return {
        status: 'roster',
        slug: rosterByDomain.slug,
        domain: rosterByDomain.domain,
        name: rosterByDomain.name,
        href: buildPadLookupHref(rosterByDomain.slug),
      };
    }

    const dynamicSlug = slugFromHostname(hostname);
    if (dynamicSlug) {
      return {
        status: 'dynamic',
        slug: dynamicSlug,
        domain: hostname,
        name: null,
        href: buildPadLookupHref(dynamicSlug, hostname),
      };
    }
  }

  const fromDirectoryName = fuzzyMatchOrgSlug(orgs, trimmed);
  if (fromDirectoryName) {
    const org = orgs.find((row) => row.slug === fromDirectoryName);
    return {
      status: 'found',
      slug: fromDirectoryName,
      domain: null,
      name: org?.name ?? null,
      href: buildPadLookupHref(fromDirectoryName),
    };
  }

  const rosterBySlug = getRosterOrg(roster, slugCandidate);
  if (rosterBySlug) {
    return {
      status: 'roster',
      slug: rosterBySlug.slug,
      domain: rosterBySlug.domain,
      name: rosterBySlug.name,
      href: buildPadLookupHref(rosterBySlug.slug),
    };
  }

  const rosterByName = fuzzyMatchRosterSlug(roster, trimmed);
  if (rosterByName) {
    return {
      status: 'roster',
      slug: rosterByName.slug,
      domain: rosterByName.domain,
      name: rosterByName.name,
      href: buildPadLookupHref(rosterByName.slug),
    };
  }

  // Unknown slug-shaped input (no spaces): reserve a request page instead of 404.
  if (isAllianceSlug(slugCandidate) && !/\s/.test(trimmed)) {
    const name = slugCandidate
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return {
      status: 'dynamic',
      slug: slugCandidate,
      domain: null,
      name,
      href: buildPadLookupHref(slugCandidate),
    };
  }

  return emptyPadLookupResult();
}
