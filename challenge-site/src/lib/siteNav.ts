export type SiteNavLink = {
  href?: string;
  label: string;
  external?: boolean;
  children?: SiteNavLink[];
  /** Opens DiscussPatchHelpModal on primary click (book discuss flow). */
  discussPatchModal?: boolean;
};

export const SITE_NAV_LINKS: SiteNavLink[] = [
  { href: '/about', label: 'About' },
  { href: '/challenge', label: 'The Challenge' },
  { href: '/participate', label: 'Participate' },
  { href: '/workgroups/join', label: 'Workgroups' },
];
