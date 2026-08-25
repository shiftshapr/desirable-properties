'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import {
  DiscussPatchDesktopNav,
  DiscussPatchMobileNav,
} from '@/components/DiscussPatchNavGroup';
import NamedTabLink from '@/components/NamedTabLink';
import { SITE_NAV_LINKS, type SiteNavLink } from '@/lib/siteNav';

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

function DesktopNavDropdown({
  item,
}: {
  item: SiteNavLink;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const childHrefs = (item.children ?? []).map((child) => child.href).filter(Boolean) as string[];
  const isActive =
    (item.href &&
      (pathname === item.href || pathname.startsWith(`${item.href.split('#')[0]}/`))) ||
    childHrefs.some(
      (href) => pathname === href || pathname.startsWith(`${href.split('#')[0]}/`),
    );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const labelClass = `whitespace-nowrap hover:text-white${isActive ? ' text-white' : ''}`;

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      {item.href ? (
        <Link href={item.href} className={labelClass}>
          {item.label}
        </Link>
      ) : (
        <button
          type="button"
          className={labelClass}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {item.label}
        </button>
      )}
      <button
        type="button"
        className="inline-flex items-center px-0.5 hover:text-white"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`${item.label} menu`}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 opacity-70" aria-hidden>
          <path
            d="M5 7l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 min-w-[280px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40"
        >
          {(item.children ?? []).map((child) => (
            <li key={child.href ?? child.label} role="none">
              <NavLink
                href={child.href ?? '#'}
                label={child.label}
                external={child.external}
                className="block whitespace-nowrap px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                onNavigate={() => setOpen(false)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MobileNavGroup({
  item,
  onNavigate,
}: {
  item: SiteNavLink;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li>
      <div className="flex items-center">
        {item.href ? (
          <NavLink
            href={item.href}
            label={item.label}
            className="flex-1 py-3 text-sm text-slate-300 hover:text-white"
            onNavigate={onNavigate}
          />
        ) : (
          <button
            type="button"
            className="flex-1 py-3 text-left text-sm text-slate-300 hover:text-white"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {item.label}
          </button>
        )}
        <button
          type="button"
          className="px-2 py-3 text-slate-400 hover:text-white"
          aria-expanded={expanded}
          aria-label={`Expand ${item.label} submenu`}
          onClick={() => setExpanded((value) => !value)}
        >
          <svg viewBox="0 0 20 20" className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden>
            <path
              d="M5 7l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {expanded ? (
        <ul className="mb-2 ml-3 border-l border-slate-800 pl-3">
          {(item.children ?? []).map((child) => (
            <li key={child.href ?? child.label}>
              <NavLink
                href={child.href ?? '#'}
                label={child.label}
                external={child.external}
                className="block py-2 text-sm text-slate-400 hover:text-white"
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function SiteHeaderNav({ links = SITE_NAV_LINKS }: { links?: SiteNavLink[] }) {
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
        {links.map((link) =>
          link.discussPatchModal ? (
            <DiscussPatchDesktopNav key={link.label} item={link} />
          ) : link.children?.length ? (
            <DesktopNavDropdown key={link.label} item={link} />
          ) : (
            <NavLink
              key={link.href ?? link.label}
              href={link.href ?? '#'}
              label={link.label}
              external={link.external}
              className={`whitespace-nowrap hover:text-white${
                link.href === '/badges' || link.href === '/onchain'
                  ? ' site-nav-optional'
                  : ''
              }`}
            />
          ),
        )}
        <NamedTabLink
          href="/agent"
          className="whitespace-nowrap rounded-md bg-cyan-700 px-3 py-1.5 font-medium text-white hover:bg-cyan-600"
        >
          Deepi
        </NamedTabLink>
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
              {links.map((link) =>
                link.discussPatchModal ? (
                  <DiscussPatchMobileNav key={link.label} item={link} onNavigate={closeMenu} />
                ) : link.children?.length ? (
                  <MobileNavGroup key={link.label} item={link} onNavigate={closeMenu} />
                ) : (
                  <li key={link.href ?? link.label}>
                    <NavLink
                      href={link.href ?? '#'}
                      label={link.label}
                      external={link.external}
                      className="block py-3 text-sm text-slate-300 hover:text-white"
                      onNavigate={closeMenu}
                    />
                  </li>
                ),
              )}
              <li>
                <NamedTabLink
                  href="/agent"
                  className="mt-3 inline-flex rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                  onClick={closeMenu}
                >
                  Deepi
                </NamedTabLink>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
