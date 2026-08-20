import { FORK_IN_THE_WEB } from '@/data/perspectives/a-fork-in-the-web';

const KNOWN_PERSPECTIVES: Record<string, { title: string; href: string }> = {
  [FORK_IN_THE_WEB.slug]: {
    title: FORK_IN_THE_WEB.title,
    href: `/perspectives/${FORK_IN_THE_WEB.slug}`,
  },
};

export type ParsedPerspectiveLink = {
  raw: string;
  slug: string | null;
  href: string;
  title: string | null;
  known: boolean;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  if (!trimmed.includes('://')) return `https://${trimmed.replace(/^\/+/, '')}`;
  return trimmed;
}

/** Parse internal or external perspective URL into slug and metadata. */
export function parsePerspectiveLink(raw: string): ParsedPerspectiveLink {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { raw: trimmed, slug: null, href: '', title: null, known: false };
  }

  if (trimmed.startsWith('/perspectives/')) {
    const slug = trimmed.replace(/^\/perspectives\//, '').split(/[?#]/)[0] || null;
    const known = slug ? KNOWN_PERSPECTIVES[slug] : undefined;
    return {
      raw: trimmed,
      slug,
      href: slug ? `/perspectives/${slug}` : trimmed,
      title: known?.title ?? null,
      known: Boolean(known),
    };
  }

  const normalized = normalizeUrl(trimmed);
  try {
    const url = new URL(normalized);
    const match = url.pathname.match(/\/perspectives\/([^/?#]+)/);
    if (match?.[1]) {
      const slug = match[1];
      const known = KNOWN_PERSPECTIVES[slug];
      return {
        raw: trimmed,
        slug,
        href: `/perspectives/${slug}`,
        title: known?.title ?? null,
        known: Boolean(known),
      };
    }
  } catch {
    // fall through
  }

  return {
    raw: trimmed,
    slug: null,
    href: trimmed.startsWith('http') ? trimmed : normalizeUrl(trimmed),
    title: null,
    known: false,
  };
}

export function parsePerspectiveLinks(links: string[]): ParsedPerspectiveLink[] {
  return links.map(parsePerspectiveLink);
}
