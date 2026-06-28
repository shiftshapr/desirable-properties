#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/desirable-properties/challenge-site"
NGINX_CONF="/home/ubuntu/nginx/desirableproperties.org.conf"

echo "[1/4] Building Next.js app..."
cd "$APP_DIR"
npm run build

echo "[2/4] Starting PM2 process..."
pm2 delete desirableproperties 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "[3/4] Installing nginx site (requires sudo)..."
if [[ "$(id -u)" -eq 0 ]]; then
  install -m 0644 "$NGINX_CONF" /etc/nginx/sites-available/desirableproperties.org.conf
  ln -sf /etc/nginx/sites-available/desirableproperties.org.conf /etc/nginx/sites-enabled/desirableproperties.org.conf
  nginx -t
  systemctl reload nginx
else
  echo "Run manually:"
  echo "  sudo cp $NGINX_CONF /etc/nginx/sites-available/desirableproperties.org.conf"
  echo "  sudo ln -sf /etc/nginx/sites-available/desirableproperties.org.conf /etc/nginx/sites-enabled/"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
  echo "  sudo certbot --nginx -d desirableproperties.org -d www.desirableproperties.org"
fi

echo "[4/4] Smoke test..."
sleep 2
curl -fsS http://127.0.0.1:3005/ >/dev/null && echo "OK: app responding on :3005"
