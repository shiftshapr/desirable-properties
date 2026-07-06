import Link from 'next/link';
import { DESIRABLE_PROPERTIES_BOOK_URL, FRAMING_CHAPTER_URL } from '@/lib/govhub';

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/challenge', label: 'Challenge' },
  { href: '/workgroups/join', label: 'Workgroups' },
  { href: '/#dps', label: 'Browse DPs' },
  { href: '/onchain', label: 'On-Chain' },
  { href: DESIRABLE_PROPERTIES_BOOK_URL, label: 'Book', external: true },
] as const;

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-sm font-semibold tracking-wide text-cyan-300">
            Desirable Properties Challenge
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
            {NAV_LINKS.map(({ href, label, ...rest }) =>
              'external' in rest && rest.external ? (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {label}
                </a>
              ) : (
                <Link key={href} href={href} className="hover:text-white">
                  {label}
                </Link>
              ),
            )}
            <a
              href={FRAMING_CHAPTER_URL}
              className="hidden hover:text-white md:inline"
            >
              Read Intro
            </a>
            <a
              href="https://govhub.live/layers/the-metaweb/"
              className="rounded-md bg-cyan-700 px-3 py-1.5 font-medium text-white hover:bg-cyan-600"
            >
              Join on Gov Hub
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
