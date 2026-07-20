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
        // Set ONCHAIN_ADMIN_SECRET in the server environment (not committed).
      },
      max_memory_restart: '512M',
    },
  ],
};
