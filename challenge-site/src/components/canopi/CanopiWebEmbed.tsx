'use client';

import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { DP_CANOPI_EMBED_ID, canopiEmbedScriptForHost } from '@/lib/canopi-embed';

const noSubscribe = () => () => {};

/**
 * Canopi Discuss web-embed — one script tag, no publisher bridge.
 * Page targeting and domain whitelist: canopi.live admin for embed instance.
 * When ?canopiRoom=<uuid> is present, v1.js opens the Rooms tab and room.
 * The script comes from the Canopi the site signs in against: staging hosts use staging Canopi.
 */
export default function CanopiWebEmbed() {
  const searchParams = useSearchParams();
  const canopiRoom = (searchParams.get('canopiRoom') || '').trim();
  const autoOpen = canopiRoom ? 'rooms' : 'discuss';
  // Known only in the browser; the script loads after hydration anyway (afterInteractive).
  const hostname = useSyncExternalStore(noSubscribe, () => window.location.hostname, () => '');
  if (!hostname) return null;

  return (
    <Script
      src={canopiEmbedScriptForHost(hostname)}
      data-canopi-id={DP_CANOPI_EMBED_ID}
      data-canopi-theme="dark"
      data-canopi-auth-session="/api/auth/canopi/embed-session"
      data-canopi-auth-refresh="/api/auth/canopi/refresh-embed"
      data-canopi-auto-open={autoOpen}
      strategy="afterInteractive"
    />
  );
}
