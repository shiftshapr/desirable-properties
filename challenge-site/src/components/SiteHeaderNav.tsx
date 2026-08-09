'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SITE_NAV_LINKS } from '@/lib/siteNav';

function NavLink({
  href,
  label,
  external,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  external?: boolean;
  className: string;
  onNavigate?: () => void;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {label}
    </Link>
  );
}

export default function SiteHeaderNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div ref={navRef} className="flex items-center">
      <nav
        className="site-header-nav hidden min-w-0 items-center gap-6 text-sm text-slate-300 lg:flex"
        aria-label="Main"
      >
        {SITE_NAV_LINKS.map((link) => (
          <NavLink
            key={link.href ?? link.label}
            href={link.href ?? '#'}
            label={link.label}
            external={link.external}
            className={`whitespace-nowrap hover:text-white${
              link.href && (pathname === link.href || pathname.startsWith(`${link.href}/`))
                ? ' text-white'
                : ''
            }`}
          />
        ))}
        <a
          href="/agent"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap rounded-md bg-cyan-700 px-3 py-1.5 font-medium text-white hover:bg-cyan-600"
        >
          Agent
        </a>
      </nav>

      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white lg:hidden"
        aria-expanded={menuOpen}
        aria-controls="site-mobile-nav"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {menuOpen ? (
        <div
          id="site-mobile-nav"
          className="absolute inset-x-0 top-full z-50 border-b border-slate-800 bg-slate-950/98 backdrop-blur lg:hidden"
        >
          <nav className="mx-auto max-w-6xl px-4 py-3 sm:px-6" aria-label="Main">
            <ul className="divide-y divide-slate-800">
              {SITE_NAV_LINKS.map((link) => (
                <li key={link.href ?? link.label}>
                  <NavLink
                    href={link.href ?? '#'}
                    label={link.label}
                    external={link.external}
                    className="block py-3 text-sm text-slate-300 hover:text-white"
                    onNavigate={closeMenu}
                  />
                </li>
              ))}
              <li>
                <a
                  href="/agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                  onClick={closeMenu}
                >
                  Agent
                </a>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
