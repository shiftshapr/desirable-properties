import { DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

export type SiteNavLink = {
  href: string;
  label: string;
  external?: boolean;
};

// "Participate" leads because it's the front door — a single overview of every
// way to engage (DP Community AI, book, Gov Hub, workgroups) for a first-time
// visitor who doesn't yet know which path fits them. The three primary
// journeys it summarizes — join a workgroup, read & discuss the book, and
// patch a draft on Gov Hub — are also linked directly afterward so returning
// visitors who already know what they want can skip straight there.
// "About" (the framing-chapter essay) is intentionally left out of the header —
// it's not an action journey, and it's already one click away from Home,
// Participate, and Challenge. It still lives in the footer for anyone hunting
// for background context.
export const SITE_NAV_LINKS: SiteNavLink[] = [
  { href: '/participate', label: 'Participate' },
  { href: WORKGROUPS_LIST_HREF, label: 'Workgroups' },
  { href: DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL, label: 'Read & Discuss', external: true },
  { href: GOVHUB_DP_PATCHES_URL, label: 'Patch', external: true },
  { href: '/challenge', label: 'Challenge' },
  { href: '/onchain', label: 'On-Chain' },
];
