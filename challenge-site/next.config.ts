import type { NextConfig } from 'next';

/** Prod and staging PM2 share one checkout; separate dist dirs avoid build clobbering. */
function resolveDistDir(): string {
  if (process.env.NEXT_DIST_DIR) {
    return process.env.NEXT_DIST_DIR;
  }
  const dpEnv = (process.env.DP_ENV || '').toLowerCase();
  if (dpEnv === 'prod' || dpEnv === 'production') {
    return '.next-prod';
  }
  if (dpEnv === 'staging') {
    return '.next-staging';
  }
  return '.next';
}

/** Gov Hub DEFAULT_CSP — keep Web3Auth/wallet connectors working on every page. */
const WEB3AUTH_CSP = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https: http:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' https: http: blob: https://unpkg.com https://cdn.jsdelivr.net https://*.web3auth.io https://*.walletconnect.org https://*.walletconnect.com",
  "style-src 'self' 'unsafe-inline' https: http:",
  "frame-src 'self' https: http: blob: https://*.web3auth.io https://*.walletconnect.org https://*.walletconnect.com",
  "connect-src 'self' https: http: wss:",
  "img-src 'self' data: https: http: blob:",
  "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com https:",
].join('; ');

const nextConfig: NextConfig = {
  distDir: resolveDistDir(),
  async redirects() {
    return [
      {
        source: '/perspectives/the-fork-in-the-web',
        destination: '/perspectives/a-fork-in-the-web',
        permanent: true,
      },
      {
        source: '/onboard',
        destination: '/pad',
        permanent: false,
      },
      {
        source: '/onboard/alliance/:slug',
        destination: '/pad/:slug',
        permanent: false,
      },
      {
        source: '/on',
        destination: '/pad',
        permanent: false,
      },
      {
        source: '/on/:slug',
        destination: '/pad/:slug',
        permanent: false,
      },
      {
        source: '/api/onboard/alliance/:slug',
        destination: '/api/pad/:slug',
        permanent: false,
      },
      {
        source: '/api/onboard/alliance',
        destination: '/api/pad',
        permanent: false,
      },
      {
        source: '/api/on/:slug',
        destination: '/api/pad/:slug',
        permanent: false,
      },
      {
        source: '/api/on',
        destination: '/api/pad',
        permanent: false,
      },
      {
        source: '/api/admin/on-settings',
        destination: '/api/admin/pad-settings',
        permanent: false,
      },
      {
        source: '/ecosystem',
        destination: '/map',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/embed/hermes/community',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://api.canopi.live https://app.canopi.live https://*.canopi.live https://desirableproperties.org https://staging.desirableproperties.org https://book.desirableproperties.org",
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: WEB3AUTH_CSP,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
