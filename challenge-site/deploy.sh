#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/desirable-properties/challenge-site"
REPO_ROOT="/home/ubuntu/desirable-properties"
NGINX_CONF="${APP_DIR}/nginx/desirableproperties.org.conf"
REQUIRED_BRANCH="main"

cd "$APP_DIR"

current_branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [[ "$current_branch" != "$REQUIRED_BRANCH" ]]; then
  echo "ERROR: Production deploy blocked — on branch '${current_branch}', expected '${REQUIRED_BRANCH}'."
  echo "       Production must deploy from main."
  echo "       Checkout: git checkout ${REQUIRED_BRANCH}"
  exit 1
fi

echo "[0/5] Branch guard OK (${REQUIRED_BRANCH})"

# Build to a side directory so the live PM2 process keeps serving .next-prod (no outage window).
# Never run `DP_ENV=prod npm run build` on this checkout — that writes into the
# live distDir and Next.js returns 500 text/plain (21B) for /_next/static CSS.
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
  echo "Run manually (or apply both vhosts):"
  echo "  sudo bash /home/ubuntu/scripts/apply-dp-next-static-nginx.sh"
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
