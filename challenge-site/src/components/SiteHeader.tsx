import Link from 'next/link';
import SiteAuthNav from '@/components/SiteAuthNav';
import { DESIRABLE_PROPERTIES_BOOK_URL, FRAMING_CHAPTER_URL } from '@/lib/govhub';

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/participate', label: 'Participate' },
  { href: '/challenge', label: 'Challenge' },
  { href: '/workgroups/join', label: 'Workgroups' },
  { href: '/#dps', label: 'Browse DPs' },
  { href: '/onchain', label: 'On-Chain' },
  { href: DESIRABLE_PROPERTIES_BOOK_URL, label: 'Book', external: true },
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
            Desirable Properties Challenge
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
                href={FRAMING_CHAPTER_URL}
                className="hidden whitespace-nowrap hover:text-white lg:inline"
              >
                Read Intro
              </a>
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
