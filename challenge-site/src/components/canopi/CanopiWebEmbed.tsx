'use client';

import Script from 'next/script';
import { DP_CANOPI_EMBED_ID } from '@/lib/canopi-embed';

/**
 * Canopi Discuss web-embed — one script tag, no publisher bridge.
 * Page targeting and domain whitelist: canopi.live admin for embed instance.
 */
export default function CanopiWebEmbed() {
  return (
    <Script
      src="https://api.canopi.live/embed/v1.js"
      data-canopi-id={DP_CANOPI_EMBED_ID}
      data-canopi-theme="dark"
      data-canopi-auth-session="/api/auth/canopi/embed-session"
      data-canopi-auth-refresh="/api/auth/canopi/refresh-embed"
      data-canopi-auto-open="discuss"
      strategy="afterInteractive"
    />
  );
}
