module.exports = {
  apps : [{
    name: 'app-themetalayer',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/app.themetalayer.org/public',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/app-themetalayer-error.log',
    out_file: '/var/log/pm2/app-themetalayer-out.log',
    log_file: '/var/log/pm2/app-themetalayer-combined.log',
    time: true
  }]
};
