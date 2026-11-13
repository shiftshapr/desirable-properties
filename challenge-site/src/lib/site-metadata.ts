import type { Metadata } from 'next';

/**
 * Public origin used to resolve absolute URLs in link-preview metadata
 * (og:image, og:url, twitter:image). Hard-coded on purpose: without a
 * `metadataBase`, Next.js falls back to `http://localhost:$PORT`, which is
 * what production was emitting. Staging shares therefore point at production
 * assets, which is fine: the share image ships in both.
 */
export const SITE_ORIGIN = 'https://desirableproperties.org';

export const SITE_NAME = 'Desirable Properties';

/** 1200×630 landscape share card: the 3D book with title (public/images/v1). */
export const SHARE_IMAGE = {
  url: '/images/v1/share-1200x630.jpg',
  width: 1200,
  height: 630,
  alt: 'The Layered Web: The Desirable Properties of a Meta-Layer, Version 1.0',
} as const;

/**
 * Full Open Graph block for a page. Next.js replaces (not merges) a parent's
 * `openGraph` when a page sets its own, so every page block repeats the image.
 */
export function pageOpenGraph(opts: {
  title: string;
  description: string;
  path: string;
}): NonNullable<Metadata['openGraph']> {
  return {
    type: 'website',
    siteName: SITE_NAME,
    title: opts.title,
    description: opts.description,
    url: opts.path,
    images: [SHARE_IMAGE],
  };
}
