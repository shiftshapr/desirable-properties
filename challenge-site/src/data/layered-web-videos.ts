/** "The Layered Web" short videos for the Version 1.0 launch (owner, 2026-11-10).
 *
 * The MP4s are large, so they live outside git under public/media/layered-web/ on the server
 * (see public/media/README.md); the posters are small and tracked. Add an entry here when a new
 * video is finished and its files are copied up.
 */
export interface LayeredWebVideo {
  slug: string;
  title: string;
  blurb: string;
  /** 9:16, played in the carousel. */
  vertical: string;
  /** 16:9, offered as a download. */
  wide: string;
  poster: string;
  /** Shown only from the Version 1.0 launch on (it says the book is out). */
  launchDay?: boolean;
}

import { v1Released } from '@/lib/dp-v1-release';

const MEDIA = '/media/layered-web';

export const LAYERED_WEB_VIDEOS: LayeredWebVideo[] = [
  {
    slug: 'the-page-is-not-the-web',
    title: 'The page is not the web',
    blurb: 'We think the webpage is the web. It’s worth far more as a place.',
    vertical: `${MEDIA}/day1-9x16.mp4`,
    wide: `${MEDIA}/day1-16x9.mp4`,
    poster: '/images/layered-web/day1-poster.jpg',
  },
  {
    slug: 'every-page-is-a-room-with-one-voice',
    title: 'Every page is a room with one voice',
    blurb: 'Every page on the web has one voice: the owner’s. What if the space above it belonged to all of us?',
    vertical: `${MEDIA}/day2-9x16.mp4`,
    wide: `${MEDIA}/day2-16x9.mp4`,
    poster: '/images/layered-web/day2-poster.jpg',
  },
  {
    slug: 'the-conversation-already-left-the-page',
    title: 'The conversation already left the page',
    blurb: 'We talk about webpages everywhere except on them, and the context gets lost on the way.',
    vertical: `${MEDIA}/video3-9x16.mp4`,
    wide: `${MEDIA}/video3-16x9.mp4`,
    poster: '/images/layered-web/video3-poster.jpg',
  },
  {
    slug: 'ai-agents-are-about-to-arrive',
    title: 'AI agents are about to arrive on every page',
    blurb: 'Soon there may be more AI agents on a webpage than people. Who sets the rules for them?',
    vertical: `${MEDIA}/video4-9x16.mp4`,
    wide: `${MEDIA}/video4-16x9.mp4`,
    poster: '/images/layered-web/video4-poster.jpg',
  },
  {
    slug: 'trust-has-to-be-built-in',
    title: 'Trust has to be built in, not bolted on',
    blurb: 'The web keeps adding trust after the damage is done. The layered web is our chance to build it in from the start.',
    vertical: `${MEDIA}/video5-9x16.mp4`,
    wide: `${MEDIA}/video5-16x9.mp4`,
    poster: '/images/layered-web/video5-poster.jpg',
  },
  {
    slug: 'how-24-properties-got-written',
    title: 'How 24 properties got written',
    blurb: 'A challenge from Vint Cerf, two years of open work, and every proposal reviewed in public.',
    vertical: `${MEDIA}/video6-9x16.mp4`,
    wide: `${MEDIA}/video6-16x9.mp4`,
    poster: '/images/layered-web/video6-poster.jpg',
  },
  {
    slug: 'the-layered-web-is-here',
    title: 'The Layered Web is here',
    blurb: 'Version 1.0 is out: 24 Desirable Properties for the layered web. Read it, share it, and help shape Version 1.1.',
    vertical: `${MEDIA}/video7-9x16.mp4`,
    wide: `${MEDIA}/video7-16x9.mp4`,
    poster: '/images/layered-web/video7-poster.jpg',
    launchDay: true,
  },
];

/** The videos to show now: the launch-day one waits for the launch. */
export function layeredWebVideosAt(now: Date = new Date()): LayeredWebVideo[] {
  const released = v1Released(now);
  return LAYERED_WEB_VIDEOS.filter((v) => released || !v.launchDay);
}
