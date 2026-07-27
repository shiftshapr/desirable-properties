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

module.exports = {
  apps: [
    {
      name: 'desirableproperties',
      cwd: '/home/ubuntu/desirable-properties/challenge-site',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3005',
      env: {
        NODE_ENV: 'production',
        PORT: '3005',
        GOVHUB_BASE_URL: 'https://hub.themetalayer.org',
        GOVHUB_METAWEB_LAYER_ID: '22d90c89-2783-4726-a8b6-220dca505402',
        ONCHAIN_ADMIN_EMAILS: 'bridgitdao@gmail.com',
        HERMES_CHAT_URL: 'http://127.0.0.1:8790',
        AUTH_SESSION_SECRET: localEnv.AUTH_SESSION_SECRET || '',
        HERMES_CHAT_SECRET: localEnv.HERMES_CHAT_SECRET || localEnv.METAWEB_OPS_SECRET || '',
        METAWEB_OPS_SECRET: localEnv.METAWEB_OPS_SECRET || '',
        ONCHAIN_ADMIN_SECRET: localEnv.ONCHAIN_ADMIN_SECRET || '',
      },
      max_memory_restart: '512M',
    },
  ],
};
