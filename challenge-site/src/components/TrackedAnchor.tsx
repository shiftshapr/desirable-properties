'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { trackEvent, type AnalyticsPayload } from '@/lib/analytics';

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  eventPayload?: AnalyticsPayload;
};

export default function TrackedAnchor({
  eventName,
  eventPayload,
  onClick,
  ...props
}: Props) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackEvent(eventName, eventPayload);
    onClick?.(e);
  };

  return <a {...props} onClick={handleClick} />;
}
