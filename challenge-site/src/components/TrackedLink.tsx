'use client';

import Link from 'next/link';
import type { ComponentProps, MouseEvent } from 'react';
import { trackEvent, type AnalyticsPayload } from '@/lib/analytics';

type LinkProps = ComponentProps<typeof Link>;

type Props = LinkProps & {
  eventName: string;
  eventPayload?: AnalyticsPayload;
};

export default function TrackedLink({
  eventName,
  eventPayload,
  onClick,
  ...props
}: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackEvent(eventName, eventPayload);
    onClick?.(e);
  };

  return <Link {...props} onClick={handleClick} />;
}
