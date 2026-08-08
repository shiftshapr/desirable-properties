#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/desirable-properties/challenge-site"
NGINX_CONF="/home/ubuntu/nginx/desirableproperties.org.conf"

cd "$APP_DIR"

echo "[1/5] Stopping PM2 (avoid serving mid-build)..."
pm2 stop desirableproperties 2>/dev/null || true

echo "[2/5] Building Next.js app (DP_ENV=prod → .next-prod)..."
export DP_ENV=prod
npm run build

echo "[3/5] Starting PM2 process..."
pm2 delete desirableproperties 2>/dev/null || true
pm2 start ecosystem.config.js

# `pm2 save` records only what is online, so running it here while some
# unrelated app happens to be down deletes that app from ~/.pm2/dump.pm2 and it
# never comes back from `pm2 resurrect`. That is how this script took canopi-app
# and desirableproperties offline for ~90 minutes on 2026-07-31.
#
# The guard refuses unless every app in meta-console/registry.yaml is online and
# answering on its port. Do not "fix" a refusal by calling `pm2 save` directly:
# a stale dump is recoverable, an amputated one is an outage.
if ! /home/ubuntu/meta-console/bin/pm2-safe-save --wait 60; then
  echo
  echo "WARNING: the pm2 boot dump was NOT updated (reason above)."
  echo "         This deploy is fine and desirableproperties is running, but"
  echo "         ~/.pm2/dump.pm2 still describes the previous state."
  echo "         Fix the unhealthy app(s), then run:"
  echo "           /home/ubuntu/meta-console/bin/pm2-safe-save"
fi

echo "[4/5] Installing nginx site (requires sudo)..."
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

echo "[5/5] Smoke test..."
sleep 2
curl -fsS http://127.0.0.1:3005/ >/dev/null && echo "OK: app responding on :3005"
CSS=$(curl -fsS http://127.0.0.1:3005/ | grep -oE 'href="/_next/static/chunks/[^"]+\.css"' | head -1 | sed 's/href="//;s/"//')
curl -fsS "http://127.0.0.1:3005${CSS}" >/dev/null && echo "OK: CSS loads (${CSS})"
