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
        // HERMES_CHAT_SECRET / METAWEB_OPS_SECRET: set on server (not committed).
      },
      max_memory_restart: '512M',
    },
  ],
};
