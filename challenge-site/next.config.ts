import type { NextConfig } from 'next';

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
  async headers() {
    return [
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
