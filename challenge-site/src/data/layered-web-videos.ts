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
}

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
];
