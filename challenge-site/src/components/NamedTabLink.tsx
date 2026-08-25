'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import {
  NAMED_TAB_TARGETS,
  openNamedTab,
  resolveNamedTabTarget,
  type NamedTabTarget,
} from '@/lib/named-tab';

type NamedTabLinkProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
  /** Override auto-detection from href. */
  tab?: NamedTabTarget;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children' | 'onClick'>;

export default function NamedTabLink({
  href,
  className,
  children,
  tab,
  onClick,
  ...rest
}: NamedTabLinkProps) {
  const tabName = tab ?? resolveNamedTabTarget(href);

  if (!tabName) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const namedTab = tabName;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    openNamedTab(event.currentTarget.href, namedTab);
  }

  return (
    <a href={href} className={className} onClick={handleClick} rel="noreferrer" {...rest}>
      {children}
    </a>
  );
}

export { NAMED_TAB_TARGETS };
