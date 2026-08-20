const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** @param {string} input */
function normalizeToSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** @param {string} slug */
export function isPersonSlug(slug) {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 80;
}

/**
 * Extract LinkedIn profile handle from URL.
 * @param {string} raw
 * @returns {string | null}
 */
export function slugFromLinkedInUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (!candidate.includes('://')) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }
  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (!host.endsWith('linkedin.com')) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const inIndex = parts.indexOf('in');
    if (inIndex >= 0 && parts[inIndex + 1]) {
      const handle = parts[inIndex + 1].split('?')[0];
      const slug = normalizeToSlug(handle);
      return isPersonSlug(slug) ? slug : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Derive a slug from a CV/resume URL path or hostname.
 * @param {string} raw
 * @returns {string | null}
 */
export function slugFromCvUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (!candidate.includes('://')) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }
  try {
    const url = new URL(candidate);
    const segments = url.pathname.split('/').filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const slug = normalizeToSlug(segments[i].split('?')[0]);
      if (isPersonSlug(slug) && slug.length >= 3) return slug;
    }
    const hostLabel = url.hostname.replace(/^www\./, '').split('.')[0] || '';
    const fromHost = normalizeToSlug(hostLabel);
    return isPersonSlug(fromHost) ? fromHost : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ linkedinUrl?: string; cvUrl?: string; displayName?: string }} input
 * @returns {string | null}
 */
export function resolvePersonPadSlug(input) {
  const linkedin = input.linkedinUrl ? slugFromLinkedInUrl(input.linkedinUrl) : null;
  if (linkedin) return linkedin;

  const cv = input.cvUrl ? slugFromCvUrl(input.cvUrl) : null;
  if (cv) return cv;

  const name = input.displayName?.trim();
  if (name) {
    const slug = normalizeToSlug(name);
    if (isPersonSlug(slug)) return slug;
  }

  return null;
}

/** @param {string} slug */
export function buildPersonPadHref(slug) {
  return `/pad/person/${encodeURIComponent(slug)}`;
}

/**
 * @typedef {{ slug: string; href: string; displayName: string | null }} PersonPadLookupResult
 */

/**
 * Preview slug/href from lookup input (LinkedIn URL, CV URL, or name).
 * @param {string} input
 * @returns {PersonPadLookupResult | null}
 */
export function resolvePersonPadLookup(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromLinkedIn = slugFromLinkedInUrl(trimmed);
  if (fromLinkedIn) {
    return { slug: fromLinkedIn, href: buildPersonPadHref(fromLinkedIn), displayName: null };
  }

  const fromCv = slugFromCvUrl(trimmed);
  if (fromCv) {
    return { slug: fromCv, href: buildPersonPadHref(fromCv), displayName: null };
  }

  const slug = normalizeToSlug(trimmed);
  if (isPersonSlug(slug)) {
    return { slug, href: buildPersonPadHref(slug), displayName: trimmed };
  }

  return null;
}

/**
 * Validate create payload has enough signal to build a person pad.
 * @param {{ linkedinUrl?: string; cvUrl?: string; displayName?: string; workLinks?: string[]; perspectiveLinks?: string[] }} input
 * @returns {{ ok: boolean; error?: string }}
 */
export function validatePersonPadCreateInput(input) {
  const linkedinUrl = input.linkedinUrl?.trim() || '';
  const cvUrl = input.cvUrl?.trim() || '';
  const displayName = input.displayName?.trim() || '';
  const workLinks = Array.isArray(input.workLinks)
    ? input.workLinks.map((row) => String(row).trim()).filter(Boolean)
    : [];
  const perspectiveLinks = Array.isArray(input.perspectiveLinks)
    ? input.perspectiveLinks.map((row) => String(row).trim()).filter(Boolean)
    : [];

  if (!linkedinUrl && !cvUrl && !displayName && workLinks.length === 0 && perspectiveLinks.length === 0) {
    return {
      ok: false,
      error: 'Add a LinkedIn URL, CV URL, name, or at least one work or perspective link.',
    };
  }

  if (!linkedinUrl && !cvUrl && !displayName && (workLinks.length > 0 || perspectiveLinks.length > 0)) {
    return {
      ok: false,
      error: 'Add a LinkedIn URL, CV URL, or your name along with your links.',
    };
  }

  const slug = resolvePersonPadSlug({ linkedinUrl, cvUrl, displayName });
  if (!slug) {
    return { ok: false, error: 'Could not derive a pad slug from your input.' };
  }

  return { ok: true };
}
