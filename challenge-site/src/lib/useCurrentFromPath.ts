'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/** Current page path (with query string) for `dpDetailHref(..., fromPath)`. */
export function useCurrentFromPath(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
