import Link from 'next/link';
import SiteAuthNav from '@/components/SiteAuthNav';
import { DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

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
const NAV_LINKS = [
  { href: '/participate', label: 'Participate' },
  { href: WORKGROUPS_LIST_HREF, label: 'Workgroups' },
  { href: DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL, label: 'Read & Discuss', external: true },
  { href: GOVHUB_DP_PATCHES_URL, label: 'Patch', external: true },
  { href: '/challenge', label: 'Challenge' },
  { href: '/onchain', label: 'On-Chain' },
] as const;

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-wide text-cyan-300"
          >
            DP Challenge
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-5 lg:gap-8">
            <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1.5 text-sm text-slate-300 sm:gap-x-5 lg:gap-x-6">
              {NAV_LINKS.map(({ href, label, ...rest }) =>
                'external' in rest && rest.external ? (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap hover:text-white"
                  >
                    {label}
                  </a>
                ) : (
                  <Link key={href} href={href} className="whitespace-nowrap hover:text-white">
                    {label}
                  </Link>
                ),
              )}
              <a
                href="/agent"
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-md bg-cyan-700 px-3 py-1.5 font-medium text-white hover:bg-cyan-600"
              >
                Agent
              </a>
            </nav>
            <div className="flex shrink-0 items-center border-l border-slate-800 pl-5 lg:pl-6">
              <SiteAuthNav />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
