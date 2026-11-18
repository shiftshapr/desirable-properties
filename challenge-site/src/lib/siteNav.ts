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
  /** Leftmost onboarding item: border highlight in the header. */
  highlight?: boolean;
  /** Dropdown child shown on mobile even while its group is collapsed (Current session). */
  featured?: boolean;
};

export const EVENTS_INDEX_HREF = '/events';
export const CURRENT_SESSION_NAV_LABEL = 'Current session';

export type UpcomingEventNavItem = {
  href: string;
  label: string;
  external?: boolean;
};

/** Nav dropdown shows title only; dates appear on /events and series pages. */
export function upcomingEventNavLabel(_dateLabel: string, title: string): string {
  return title;
}

/** About-menu entry for DP Studio landing pads; added only when landingPadsEnabled() (never on production). */
export const LANDING_PADS_NAV_LINK: SiteNavLink = { href: '/pad', label: 'Landing pads' };

/**
 * Insert Events nav after About. Its menu always starts with "Current session" (`currentSessionHref`, from
 * currentSession() in src/lib/current-session.ts), then any upcoming entries, then "All events".
 * `landingPads` (from the server-side landingPadsEnabled()) appends the Landing pads entry to the About
 * menu; it is off by default.
 */
export function buildSiteNavLinks(
  upcomingEvents: UpcomingEventNavItem[] = [],
  options: { landingPads?: boolean; currentSessionHref?: string } = {},
): SiteNavLink[] {
  const current = options.currentSessionHref;
  const eventsNav: SiteNavLink = {
    label: 'Events',
    href: EVENTS_INDEX_HREF,
    children: [
      ...(current ? [{ href: current, label: CURRENT_SESSION_NAV_LABEL, featured: true }] : []),
      ...upcomingEvents
        .filter((event) => event.href !== current)
        .map((event) => ({ href: event.href, label: event.label, external: event.external })),
      { href: EVENTS_INDEX_HREF, label: 'All events' },
    ],
  };

  const links = SITE_NAV_LINKS.map((link) =>
    options.landingPads && link.label === 'About' && link.children
      ? { ...link, children: [...link.children, LANDING_PADS_NAV_LINK] }
      : link,
  );
  const aboutIndex = links.findIndex((link) => link.label === 'About');
  if (aboutIndex >= 0) {
    links.splice(aboutIndex + 1, 0, eventsNav);
  } else {
    links.unshift(eventsNav);
  }
  return links;
}

export const SITE_NAV_LINKS: SiteNavLink[] = [
  { href: '/start-here', label: 'Start Here', highlight: true },
  {
    label: 'Version 1.0',
    href: '/v1',
    children: [
      { href: '/v1', label: 'About Version 1.0' },
      { href: '/improve', label: 'Help shape Version 1.1' },
      { href: 'https://book.desirableproperties.org/', label: 'Read the book', external: true },
      { href: '/steering', label: 'Steering and proposals' },
      { href: '/council', label: 'Council' },
      { href: '/press', label: 'Press release' },
    ],
  },
  {
    label: 'About',
    href: '/about',
    children: [
      { href: '/challenge', label: 'The Challenge' },
      { href: '/process', label: 'How V1 gets made' },
      { href: '/style-guide', label: 'Style guide' },
      { href: '/format-guide', label: 'Format guide' },
      { href: '/kickoff', label: 'Kickoff meeting' },
      { href: '/faq', label: 'FAQ' },
      { href: '/participate', label: 'More contribution paths' },
      // Landing pads: appended by buildSiteNavLinks only when landingPadsEnabled() (hidden on production).
    ],
  },
  {
    label: 'Workgroups',
    href: WORKGROUPS_JOIN_HREF,
    children: [
      { href: '/roundups', label: 'DP Roundups' },
      { href: '/v1-readiness', label: 'V1 readiness board' },
      { href: WORKGROUPS_LIST_HREF, label: 'Collaborate pages' },
      { href: WORKGROUPS_JOIN_HREF, label: 'About workgroups' },
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
