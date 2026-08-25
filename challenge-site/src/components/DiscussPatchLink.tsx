'use client';

import { useEffect, useState } from 'react';
import DiscussPatchHelpModal from '@/components/DiscussPatchHelpModal';
import { isDiscussPatchHelpDismissed } from '@/lib/discuss-patch-help';
import { NAMED_TAB_TARGETS, openNamedTab } from '@/lib/named-tab';

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/** Book discuss link – shows help modal first unless user dismissed it. */
export default function DiscussPatchLink({ href, className, children }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isDiscussPatchHelpDismissed());
  }, []);

  function openBookTab(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openNamedTab(event.currentTarget.href, NAMED_TAB_TARGETS.DP_BOOK);
  }

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (dismissed) {
      openBookTab(e);
      return;
    }
    e.preventDefault();
    setModalOpen(true);
  }

  function handleClose() {
    setModalOpen(false);
    if (isDiscussPatchHelpDismissed()) {
      setDismissed(true);
    }
  }

  return (
    <>
      <a href={href} className={className} onClick={handleClick} rel="noreferrer">
        {children}
      </a>
      <DiscussPatchHelpModal open={modalOpen} discussHref={href} onClose={handleClose} />
    </>
  );
}
