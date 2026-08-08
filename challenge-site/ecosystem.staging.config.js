const fs = require('fs');
const path = require('path');

/** Load non-committed secrets from .env.local for PM2 (server only). */
function loadEnvLocal() {
  const file = path.join(__dirname, '.env.local');
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const localEnv = loadEnvLocal();

/** Resend keys for support ack/reply emails — prefer challenge-site .env.local. */
function loadResendEnv() {
  const out = {};
  const stripeEnvPath = '/home/ubuntu/metaweb-book/stripe-server/.env';
  if (!fs.existsSync(stripeEnvPath)) return out;
  for (const line of fs.readFileSync(stripeEnvPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    if (!key.startsWith('RESEND_')) continue;
    out[key] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

const resendEnv = loadResendEnv();

module.exports = {
  apps: [
    {
      name: 'desirableproperties-staging',
      cwd: '/home/ubuntu/desirable-properties/challenge-site',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3006 -H 127.0.0.1',
      env: {
        NODE_ENV: 'production',
        DP_ENV: 'staging',
        PORT: '3006',
        GOVHUB_BASE_URL: 'https://hub.themetalayer.org',
        GOVHUB_METAWEB_LAYER_ID: '22d90c89-2783-4726-a8b6-220dca505402',
        ONCHAIN_ADMIN_EMAILS: 'bridgitdao@gmail.com,daveed@bridgit.io',
        HERMES_CHAT_URL: 'http://127.0.0.1:8790',
        AUTH_SESSION_SECRET: localEnv.AUTH_SESSION_SECRET || '',
        HERMES_CHAT_SECRET: localEnv.HERMES_CHAT_SECRET || localEnv.METAWEB_OPS_SECRET || '',
        METAWEB_OPS_SECRET: localEnv.METAWEB_OPS_SECRET || '',
        METAWEB_GOVHUB_INTERNAL_SECRET:
          localEnv.METAWEB_GOVHUB_INTERNAL_SECRET || localEnv.DP_AUTH_HANDOFF_SECRET || '',
        DP_AUTH_HANDOFF_SECRET: localEnv.DP_AUTH_HANDOFF_SECRET || '',
        DP_SUPPORT_OPS_SECRET: localEnv.DP_SUPPORT_OPS_SECRET || localEnv.METAWEB_OPS_SECRET || '',
        DP_HERMES_API_KEY: localEnv.DP_HERMES_API_KEY || localEnv.METAWEB_OPS_SECRET || '',
        ONCHAIN_ADMIN_SECRET: localEnv.ONCHAIN_ADMIN_SECRET || '',
        RESEND_API_KEY: localEnv.RESEND_API_KEY || resendEnv.RESEND_API_KEY || '',
        DP_SUPPORT_FROM:
          localEnv.DP_SUPPORT_FROM
          || localEnv.RESEND_FROM
          || resendEnv.RESEND_FROM
          || 'Desirable Properties <noreply@desirableproperties.org>',
        DP_PUBLIC_BASE:
          localEnv.DP_PUBLIC_BASE_STAGING
          || 'https://staging.desirableproperties.org',
        DP_BOOK_BASE_URL:
          localEnv.DP_BOOK_BASE_URL_STAGING
          || 'https://staging.book.desirableproperties.org',
        DP_COLLAB_ENABLED: 'true',
        DP_DATABASE_URL:
          localEnv.DP_DATABASE_URL || localEnv.DATABASE_URL || '',
        DATABASE_URL: localEnv.DATABASE_URL || localEnv.DP_DATABASE_URL || '',
        WEB3AUTH_CLIENT_ID_DEVNET:
          localEnv.WEB3AUTH_CLIENT_ID_DEVNET
          || 'BKvRj4akAwrNHHk4UyYCC4zt9KWigdiuosCX5-idVNclsk9hPPQ4_b8grcl0JF4NhT26oLWb3O5K949SVv6lTGk',
      },
      max_memory_restart: '512M',
    },
  ],
};
