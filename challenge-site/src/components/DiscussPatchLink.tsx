'use client';

import { useEffect, useState } from 'react';
import DiscussPatchHelpModal from '@/components/DiscussPatchHelpModal';
import { isDiscussPatchHelpDismissed } from '@/lib/discuss-patch-help';

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/** Book discuss link — shows help modal first unless user dismissed it. */
export default function DiscussPatchLink({ href, className, children }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDismissed(isDiscussPatchHelpDismissed());
    setReady(true);
  }, []);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (dismissed) return;
    e.preventDefault();
    setModalOpen(true);
  }

  function handleClose() {
    setModalOpen(false);
    if (isDiscussPatchHelpDismissed()) {
      setDismissed(true);
    }
  }

  if (!ready) {
    return (
      <span className={`${className} opacity-70`} aria-hidden>
        {children}
      </span>
    );
  }

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={handleClick}
      >
        {children}
      </a>
      <DiscussPatchHelpModal open={modalOpen} discussHref={href} onClose={handleClose} />
    </>
  );
}
