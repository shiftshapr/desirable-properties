/**
 * "Watch and share Version 1.0": the videos, our posts to reshare, and the share text.
 * One file so the same block (components/v1/V1Promo) can go on /v1 and the current-session page.
 * A video with `youtubeId: null` renders nothing until it is filled in.
 */

export type V1PromoVideo = {
  key: string;
  title: string;
  durationLabel: string;
  /** YouTube video id; null = not public yet, render nothing. */
  youtubeId: string | null;
  /** Public watch link (shown as "Watch on YouTube"). */
  watchUrl: string | null;
  aspect: '16:9' | '9:16';
};

export type V1PromoPost = { network: string; label: string; url: string };

export const V1_PROMO_SHARE_URL = 'https://desirableproperties.org/v1';

export const V1_PROMO_SHARE_TEXT =
  "The Layered Web, Version 1.0 is out: 24 Desirable Properties for the layer above today's web, written in the open by 70+ contributors. Watch the 4-minute film and read the book:";

export const V1_PROMO_EMAIL_SUBJECT = 'The Layered Web, Version 1.0';

export const V1_PROMO_VIDEOS: V1PromoVideo[] = [
  {
    key: 'film',
    title: 'The Layered Web, Version 1.0: the story in four minutes',
    durationLabel: '4 min',
    youtubeId: 'OYohHLm6JCA',
    watchUrl: 'https://youtu.be/OYohHLm6JCA',
    aspect: '16:9',
  },
  {
    key: 'teaser',
    title: 'The teaser',
    durationLabel: '1:06',
    youtubeId: 'AlkUHZ-HwPc',
    watchUrl: 'https://youtube.com/shorts/AlkUHZ-HwPc',
    aspect: '9:16',
  },
  {
    // Going up Monday 23 November: fill in youtubeId and watchUrl then.
    key: 'voices',
    title: 'Voices',
    durationLabel: '1:31',
    youtubeId: null,
    watchUrl: null,
    aspect: '16:9',
  },
];

export const V1_PROMO_RECORDING = {
  label: 'Watch the full launch recording',
  url: 'https://youtu.be/07CxwGT49Rk',
};

export const V1_PROMO_POSTS: V1PromoPost[] = [
  {
    network: 'LinkedIn',
    label: 'Repost on LinkedIn',
    url: 'https://www.linkedin.com/feed/update/urn:li:activity:7528950345763500032/',
  },
  { network: 'X', label: 'Repost on X', url: 'https://x.com/bridgitdao/status/2123183213598462445' },
  { network: 'Instagram', label: 'Share the Instagram Reel', url: 'https://www.instagram.com/reel/Df5z_qnsYvg/' },
  { network: 'TikTok', label: 'Share on TikTok', url: 'https://www.tiktok.com/@bridgitdao/video/7709676204630101278' },
  { network: 'YouTube', label: 'Share the film on YouTube', url: 'https://youtu.be/OYohHLm6JCA' },
];

/** Videos that are public (youtubeId filled in). */
export function publishedVideos(videos: V1PromoVideo[] = V1_PROMO_VIDEOS): V1PromoVideo[] {
  return videos.filter((v) => Boolean(v.youtubeId));
}

/** Privacy-enhanced embed URL, autoplaying once the viewer has pressed play. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
}

export function youtubeThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}

export type ShareIntent = { key: string; label: string; href: string };

/** Prefilled "post your own" links. Plain URLs: no third-party scripts. */
export function shareIntents(text: string = V1_PROMO_SHARE_TEXT, url: string = V1_PROMO_SHARE_URL): ShareIntent[] {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return [
    { key: 'x', label: 'Post on X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { key: 'linkedin', label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { key: 'whatsapp', label: 'Send on WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    {
      key: 'email',
      label: 'Email it',
      href: `mailto:?subject=${encodeURIComponent(V1_PROMO_EMAIL_SUBJECT)}&body=${encodeURIComponent(`${text} ${url}`)}`,
    },
  ];
}
