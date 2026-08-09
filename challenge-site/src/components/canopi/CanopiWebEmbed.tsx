'use client';

import Script from 'next/script';

/**
 * Loads Canopi Discuss web-embed (bridge + v1.js).
 * Page targeting and domain whitelist are configured in canopi.live admin
 * for embed instance 7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c.
 */
export default function CanopiWebEmbed() {
  return (
    <Script
      id="dp-canopi-bridge"
      src="/embed/dp-canopi-bridge.js"
      strategy="afterInteractive"
    />
  );
}
