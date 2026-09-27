/** Canonical estate follow links (socials audit 25 Sep 2026). Org X/LinkedIn omitted — not site-canonical. */
export const ESTATE_YOUTUBE_META_LAYER_URL = 'https://www.youtube.com/@meta-layer';
export const ESTATE_GO_META_SUBSTACK_URL = 'https://gometa.substack.com';

export type EstateSocialLink = {
  href: string;
  label: string;
  shortLabel: string;
};

export const ESTATE_SOCIAL_FOLLOW_LINKS: readonly EstateSocialLink[] = [
  {
    href: ESTATE_YOUTUBE_META_LAYER_URL,
    label: 'Meta-Layer on YouTube (@meta-layer)',
    shortLabel: 'YouTube',
  },
  {
    href: ESTATE_GO_META_SUBSTACK_URL,
    label: 'Go Meta newsletter on Substack (Pro Human-Nature-AI)',
    shortLabel: 'Go Meta',
  },
];
