const path = require("path");

/** PM2 runs this app from the `web-app` directory (where this file lives). */
const appDir = __dirname;

module.exports = {
  apps: [
    {
      name: "app-themetalayer",
      script: "npm",
      args: "start",
      cwd: appDir,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      error_file: path.join(appDir, "logs", "pm2-error.log"),
      out_file: path.join(appDir, "logs", "pm2-out.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
