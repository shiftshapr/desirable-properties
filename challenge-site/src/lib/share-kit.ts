/**
 * /share kit: full-size image posts anyone can share. LinkedIn shows link previews only as small thumbnails, so a
 * native image post is what gets seen. Images are made by scripts/share-images.py, which also writes the manifest
 * (file names carry a content hash, so /share/ is cached for good in next.config.ts).
 */
import images from './share-kit-images.json';
import { V1_LAUNCH_SHORT } from './v1-launch-event';
import { SITE_ORIGIN } from './site-metadata';

export type ShareShape = 'square' | 'portrait';

export type ShareImage = { src: string; file: string; width: number; height: number; bytes: number };

export type ShareTheme = {
  id: 'book' | 'launch' | 'v1-1';
  heading: string;
  /** Ready-to-post text; ends with the link. Written so anyone can post it. */
  text: string;
  /** Page the link cards (X, Bluesky, Facebook, WhatsApp) point at; it carries the large og:image. */
  pageUrl: string;
  alt: string;
  images: Record<ShareShape, ShareImage>;
};

type Manifest = Record<string, ShareImage>;
const manifest = images as Manifest;

function pick(id: ShareTheme['id']): Record<ShareShape, ShareImage> {
  const square = manifest[`${id}-square`];
  const portrait = manifest[`${id}-portrait`];
  if (!square || !portrait) throw new Error(`share-kit-images.json is missing ${id}; run scripts/share-images.py`);
  return { square, portrait };
}

export const SHARE_THEMES: ShareTheme[] = [
  {
    id: 'book',
    heading: 'The book',
    text:
      'The Layered Web: The Desirable Properties of a Meta-Layer, Version 1.0 is out. It sets out 24 properties a trustworthy layer above the web should have, written in the open by contributors from around the world. Free to read and download: https://desirableproperties.org/v1',
    pageUrl: `${SITE_ORIGIN}/v1`,
    alt: 'The Layered Web: The Desirable Properties of a Meta-Layer. Version 1.0, released 13 Nov 2026. desirableproperties.org/v1',
    images: pick('book'),
  },
  {
    id: 'launch',
    heading: 'The launch video',
    text:
      'The Version 1.0 launch of The Layered Web is now online. Co-editors and contributors talk about what the 24 Desirable Properties are for and how the book was made together. Watch the recording: https://desirableproperties.org/launch',
    pageUrl: `${SITE_ORIGIN}/events/v1-launch`,
    alt: 'Video thumbnail: Watch the Version 1.0 launch of The Layered Web. desirableproperties.org/launch',
    images: pick('launch'),
  },
  {
    id: 'v1-1',
    heading: 'Version 1.1',
    text:
      'Work on Version 1.1 of The Layered Web has begun, and anyone can take part. You can suggest a change to a chapter, take a co-editor seat, or join steering. Here is how: https://desirableproperties.org/improve',
    pageUrl: `${SITE_ORIGIN}/improve`,
    alt: 'Help shape Version 1.1: suggest a change, take a co-editor seat, join steering. desirableproperties.org/improve',
    images: pick('v1-1'),
  },
];

export const SHARE_VIDEOS: Array<{ label: string; src: string; poster: string; note: string; download: string }> = [
  {
    label: 'The launch in 57 seconds (16:9)',
    src: V1_LAUNCH_SHORT.src,
    poster: V1_LAUNCH_SHORT.poster,
    note: 'MP4 · 1920×1080 · 9 MB · captions burned in',
    download: 'layered-web-v1-launch-57s-16x9.mp4',
  },
];

/** Friendly download name for an image (the served name carries a hash). */
export function downloadName(themeId: ShareTheme['id'], shape: ShareShape): string {
  return `layered-web-${themeId}-${shape}.jpg`;
}
