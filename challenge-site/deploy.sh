#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/desirable-properties/challenge-site"
NGINX_CONF="/home/ubuntu/nginx/desirableproperties.org.conf"

cd "$APP_DIR"

# Build to a side directory so the live PM2 process keeps serving .next-prod (no outage window).
PROD_BUILD_DIR=".next-prod-build"
PROD_LIVE_DIR=".next-prod"

echo "[1/5] Building Next.js app (prod stays online; build → ${PROD_BUILD_DIR})..."
export DP_ENV=prod
export NEXT_DIST_DIR="$PROD_BUILD_DIR"
rm -rf "$PROD_BUILD_DIR"
npm run build

echo "[2/5] Swapping ${PROD_BUILD_DIR} → ${PROD_LIVE_DIR} and restarting PM2..."
if [[ ! -d "$PROD_BUILD_DIR" ]]; then
  echo "ERROR: build output missing at ${PROD_BUILD_DIR}"
  exit 1
fi
rm -rf "${PROD_LIVE_DIR}.old"
if [[ -d "$PROD_LIVE_DIR" ]]; then
  mv "$PROD_LIVE_DIR" "${PROD_LIVE_DIR}.old"
fi
mv "$PROD_BUILD_DIR" "$PROD_LIVE_DIR"
rm -rf "${PROD_LIVE_DIR}.old"

if pm2 pid desirableproperties >/dev/null 2>&1; then
  pm2 restart desirableproperties
else
  pm2 delete desirableproperties 2>/dev/null || true
  pm2 start ecosystem.config.js
fi

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

echo "[3/5] Installing nginx site (requires sudo)..."
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

echo "[4/5] Smoke test..."
sleep 2
curl -fsS http://127.0.0.1:3005/ >/dev/null && echo "OK: app responding on :3005"
CSS=$(curl -fsS http://127.0.0.1:3005/ | grep -oE 'href="/_next/static/chunks/[^"]+\.css"' | head -1 | sed 's/href="//;s/"//')
curl -fsS "http://127.0.0.1:3005${CSS}" >/dev/null && echo "OK: CSS loads (${CSS})"
