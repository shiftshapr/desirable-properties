import { bookDiscussHref, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';
import {
  WORKGROUPS_JOIN_HREF,
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

export const EVENTS_INDEX_HREF = '/events';

export type UpcomingEventNavItem = {
  href: string;
  label: string;
  external?: boolean;
};

/** Nav dropdown shows title only; dates appear on /events and series pages. */
export function upcomingEventNavLabel(_dateLabel: string, title: string): string {
  return title;
}

/** Insert Events nav after About when upcoming entries exist. */
export function buildSiteNavLinks(upcomingEvents: UpcomingEventNavItem[] = []): SiteNavLink[] {
  const eventsNav: SiteNavLink = upcomingEvents.length
    ? {
        label: 'Events',
        href: EVENTS_INDEX_HREF,
        children: upcomingEvents.map((event) => ({
          href: event.href,
          label: event.label,
          external: event.external,
        })),
      }
    : { label: 'Events', href: EVENTS_INDEX_HREF };

  const links = [...SITE_NAV_LINKS];
  const aboutIndex = links.findIndex((link) => link.label === 'About');
  if (aboutIndex >= 0) {
    links.splice(aboutIndex + 1, 0, eventsNav);
  } else {
    links.unshift(eventsNav);
  }
  return links;
}

export const SITE_NAV_LINKS: SiteNavLink[] = [
  {
    label: 'About',
    href: '/about',
    children: [
      { href: '/challenge', label: 'The Challenge' },
      { href: '/participate', label: 'Participate' },
      { href: '/kickoff', label: 'Kickoff meeting' },
      { href: '/faq', label: 'FAQ' },
      { href: '/on', label: 'On' },
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
      { href: '/contribution-activity', label: 'Contribution activity' },
      { href: GOVHUB_DP_PATCHES_URL, label: 'Patch on Gov Hub', external: true },
    ],
  },
  { href: '/badges', label: 'Badges' },
  { href: '/onchain', label: 'On-Chain' },
];
