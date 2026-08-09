import { bookDiscussHref, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';
import {
  WORKGROUPS_LIST_HREF,
  WORKGROUPS_SIGNUPS_HREF,
} from '@/lib/routes';

export type SiteNavLink = {
  href?: string;
  label: string;
  external?: boolean;
  children?: SiteNavLink[];
  /** Opens DiscussPatchHelpModal on primary click (book discuss flow). */
  discussPatchModal?: boolean;
};

export const WORKGROUPS_JOIN_HREF = '/workgroups/join';

export const SITE_NAV_LINKS: SiteNavLink[] = [
  {
    label: 'About',
    children: [
      { href: '/challenge', label: 'The Challenge' },
      { href: '/participate', label: 'Participate' },
    ],
  },
  {
    label: 'Workgroups',
    href: WORKGROUPS_JOIN_HREF,
    children: [
      { href: WORKGROUPS_LIST_HREF, label: 'Browse workgroups' },
      { href: WORKGROUPS_SIGNUPS_HREF, label: 'Signups' },
    ],
  },
  {
    label: 'Discuss & Patch',
    href: bookDiscussHref(),
    discussPatchModal: true,
    children: [
      { href: GOVHUB_DP_PATCHES_URL, label: 'Patch on Gov Hub', external: true },
    ],
  },
  { href: '/badges', label: 'Badges' },
  { href: '/onchain', label: 'On-Chain' },
];
