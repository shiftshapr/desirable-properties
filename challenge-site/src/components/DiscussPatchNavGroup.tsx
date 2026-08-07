'use client';

import { useEffect, useId, useRef, useState } from 'react';
import DiscussPatchHelpModal from '@/components/DiscussPatchHelpModal';
import { isDiscussPatchHelpDismissed } from '@/lib/discuss-patch-help';
import type { SiteNavLink } from '@/lib/siteNav';

function ExternalLink({
  href,
  label,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  className: string;
  onNavigate?: () => void;
}) {
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

/** Header nav group: primary click opens discuss/patch help modal; chevron reveals Gov Hub patch link. */
export function DiscussPatchDesktopNav({ item }: { item: SiteNavLink }) {
  const discussHref = item.href ?? '#';
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && isDiscussPatchHelpDismissed(),
  );
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

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

  function openDiscuss(e: React.MouseEvent) {
    if (dismissed) {
      window.open(discussHref, '_blank', 'noopener,noreferrer');
      return;
    }
    e.preventDefault();
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    if (isDiscussPatchHelpDismissed()) {
      setDismissed(true);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-flex items-center">
      <button
        type="button"
        className="whitespace-nowrap hover:text-white"
        onClick={openDiscuss}
      >
        {item.label}
      </button>
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
          className="absolute left-0 top-full z-50 mt-2 min-w-[190px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl shadow-black/40"
        >
          {(item.children ?? []).map((child) => (
            <li key={child.href ?? child.label} role="none">
              <ExternalLink
                href={child.href ?? '#'}
                label={child.label}
                className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                onNavigate={() => setOpen(false)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <DiscussPatchHelpModal
        open={modalOpen}
        discussHref={discussHref}
        onClose={handleModalClose}
      />
    </div>
  );
}

export function DiscussPatchMobileNav({
  item,
  onNavigate,
}: {
  item: SiteNavLink;
  onNavigate: () => void;
}) {
  const discussHref = item.href ?? '#';
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && isDiscussPatchHelpDismissed(),
  );

  function openDiscuss() {
    if (dismissed) {
      window.open(discussHref, '_blank', 'noopener,noreferrer');
      onNavigate();
      return;
    }
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    if (isDiscussPatchHelpDismissed()) {
      setDismissed(true);
    }
  }

  return (
    <li>
      <div className="flex items-center">
        <button
          type="button"
          className="flex-1 py-3 text-left text-sm text-slate-300 hover:text-white"
          onClick={openDiscuss}
        >
          {item.label}
        </button>
        {(item.children?.length ?? 0) > 0 ? (
          <button
            type="button"
            className="px-2 py-3 text-slate-400 hover:text-white"
            aria-expanded={expanded}
            aria-label={`Expand ${item.label} submenu`}
            onClick={() => setExpanded((value) => !value)}
          >
            <svg
              viewBox="0 0 20 20"
              className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            >
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
        ) : null}
      </div>
      {expanded ? (
        <ul className="mb-2 ml-3 border-l border-slate-800 pl-3">
          {(item.children ?? []).map((child) => (
            <li key={child.href ?? child.label}>
              <ExternalLink
                href={child.href ?? '#'}
                label={child.label}
                className="block py-2 text-sm text-slate-400 hover:text-white"
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <DiscussPatchHelpModal
        open={modalOpen}
        discussHref={discussHref}
        onClose={handleModalClose}
      />
    </li>
  );
}
