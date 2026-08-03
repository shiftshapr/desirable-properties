#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/desirable-properties/challenge-site"
NGINX_CONF="/home/ubuntu/nginx/staging.desirableproperties.org.conf"

cd "$APP_DIR"

echo "[1/5] Stopping staging PM2 only (prod stays up)..."
pm2 stop desirableproperties-staging 2>/dev/null || true

echo "[2/5] Building Next.js app..."
npm run build

echo "[3/5] Starting staging PM2 process..."
pm2 delete desirableproperties-staging 2>/dev/null || true
pm2 start ecosystem.staging.config.js

if ! /home/ubuntu/meta-console/bin/pm2-safe-save --wait 60; then
  echo
  echo "WARNING: the pm2 boot dump was NOT updated (reason above)."
  echo "         Staging is running, but ~/.pm2/dump.pm2 may be stale."
  echo "         Fix unhealthy app(s), then run:"
  echo "           /home/ubuntu/meta-console/bin/pm2-safe-save"
fi

echo "[4/5] Installing nginx vhost (requires sudo)..."
if [[ "$(id -u)" -eq 0 ]]; then
  install -m 0644 "$NGINX_CONF" /etc/nginx/sites-available/staging.desirableproperties.org.conf
  ln -sf /etc/nginx/sites-available/staging.desirableproperties.org.conf /etc/nginx/sites-enabled/staging.desirableproperties.org.conf
  nginx -t
  systemctl reload nginx
else
  echo "Run manually:"
  echo "  sudo cp $NGINX_CONF /etc/nginx/sites-available/staging.desirableproperties.org.conf"
  echo "  sudo ln -sf /etc/nginx/sites-available/staging.desirableproperties.org.conf /etc/nginx/sites-enabled/"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
  echo "  sudo certbot --nginx -d staging.desirableproperties.org"
fi

echo "[5/5] Smoke test..."
sleep 2
curl -fsS http://127.0.0.1:3006/ >/dev/null && echo "OK: staging app responding on :3006"
HTML=$(curl -fsS http://127.0.0.1:3006/)
echo "$HTML" | grep -q 'site-mobile-nav' && echo "OK: challenge-site markup (mobile nav) present"
