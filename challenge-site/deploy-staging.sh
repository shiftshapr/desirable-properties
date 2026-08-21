#!/usr/bin/env bash
# Staging previews main (same content as production after pathway merge).
set -euo pipefail

APP_DIR="/home/ubuntu/desirable-properties/challenge-site"
REPO_ROOT="/home/ubuntu/desirable-properties"
NGINX_CONF="${APP_DIR}/nginx/staging.desirableproperties.org.conf"
REQUIRED_BRANCH="main"
PATHWAY_MARKER="${APP_DIR}/src/components/pathways/FeaturedPathwayPanel.tsx"

cd "$APP_DIR"

if [[ ! -f "$PATHWAY_MARKER" ]]; then
  echo "ERROR: Staging deploy blocked — missing ${PATHWAY_MARKER}"
  echo "       Staging requires AI pathway content (FeaturedPathwayPanel, Fork in the Web, etc.)."
  echo "       Checkout: git checkout ${REQUIRED_BRANCH}"
  exit 1
fi

current_branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [[ "$current_branch" != "$REQUIRED_BRANCH" ]]; then
  echo "ERROR: Staging deploy blocked — on branch '${current_branch}', expected '${REQUIRED_BRANCH}'."
  echo "       Staging deploys from main."
  echo "       Checkout: git checkout ${REQUIRED_BRANCH}"
  exit 1
fi

echo "[0/5] Branch guard OK (${REQUIRED_BRANCH}, FeaturedPathwayPanel present)"

# Build to a side directory so the live PM2 process keeps serving .next-staging (no 502 window).
STAGING_BUILD_DIR=".next-staging-build"
STAGING_LIVE_DIR=".next-staging"

echo "[1/5] Building Next.js app (staging stays online; build → ${STAGING_BUILD_DIR})..."
export DP_ENV=staging
export NEXT_DIST_DIR="$STAGING_BUILD_DIR"
rm -rf "$STAGING_BUILD_DIR"
# Stale generated types from the other distDir can reference removed routes and break typecheck.
rm -rf .next-prod/types .next-staging/types 2>/dev/null || true

monitor_pid=""
if pm2 pid desirableproperties-staging >/dev/null 2>&1; then
  (
    while true; do
      if curl -fsS --max-time 5 http://127.0.0.1:3006/ >/dev/null 2>&1; then
        echo "[monitor] staging OK on :3006 ($(date +%H:%M:%S))"
      else
        echo "[monitor] WARNING: staging not responding on :3006 ($(date +%H:%M:%S))"
      fi
      sleep 30
    done
  ) &
  monitor_pid=$!
fi

npm run build -- --webpack

if [[ -n "$monitor_pid" ]]; then
  kill "$monitor_pid" 2>/dev/null || true
  wait "$monitor_pid" 2>/dev/null || true
fi

probe_prod_css() {
  if ! pm2 pid desirableproperties >/dev/null 2>&1; then
    return 0
  fi

  echo ""
  echo "[check] Probing prod CSS (staging build should not touch .next-prod)..."
  local prod_html prod_css css_disk
  prod_html=$(curl -fsS http://127.0.0.1:3005/ 2>/dev/null || true)
  if [[ -z "$prod_html" ]]; then
    echo "WARNING: prod not responding on :3005"
    return 0
  fi

  prod_css=$(echo "$prod_html" | grep -oE 'href="/_next/static/chunks/[^"]+\.css"' | head -1 | sed 's/href="//;s/"//' || true)
  if [[ -z "$prod_css" ]]; then
    echo "WARNING: could not extract prod CSS href from homepage"
    return 0
  fi

  if ! curl -fsS "http://127.0.0.1:3005${prod_css}" >/dev/null 2>&1; then
    echo "WARNING: prod CSS probe failed (${prod_css}) — run ./deploy.sh to rebuild prod"
    return 0
  fi

  # distDir stores assets under static/, not _next/static/
  css_disk="${APP_DIR}/.next-prod${prod_css#/_next}"
  if [[ ! -f "$css_disk" ]]; then
    echo "WARNING: prod serves ${prod_css} but file missing from .next-prod (disk mismatch)"
    echo "         Run ./deploy.sh to align prod with .next-prod"
  else
    echo "OK: prod CSS loads and matches .next-prod on disk (${prod_css})"
  fi
}

probe_prod_css

echo "[2/5] Swapping ${STAGING_BUILD_DIR} → ${STAGING_LIVE_DIR} and restarting staging PM2..."
if [[ ! -d "$STAGING_BUILD_DIR" ]]; then
  echo "ERROR: build output missing at ${STAGING_BUILD_DIR}"
  exit 1
fi
rm -rf "${STAGING_LIVE_DIR}.old"
if [[ -d "$STAGING_LIVE_DIR" ]]; then
  mv "$STAGING_LIVE_DIR" "${STAGING_LIVE_DIR}.old"
fi
mv "$STAGING_BUILD_DIR" "$STAGING_LIVE_DIR"
rm -rf "${STAGING_LIVE_DIR}.old"

if pm2 pid desirableproperties-staging >/dev/null 2>&1; then
  pm2 restart ecosystem.staging.config.js --update-env
else
  pm2 delete desirableproperties-staging 2>/dev/null || true
  pm2 start ecosystem.staging.config.js
fi

if ! /home/ubuntu/meta-console/bin/pm2-safe-save --wait 60; then
  echo
  echo "WARNING: the pm2 boot dump was NOT updated (reason above)."
  echo "         Staging is running, but ~/.pm2/dump.pm2 may be stale."
  echo "         Fix unhealthy app(s), then run:"
  echo "           /home/ubuntu/meta-console/bin/pm2-safe-save"
fi

echo "[3/5] Installing nginx vhost (requires sudo)..."
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

echo "[4/5] Smoke test..."
sleep 2
curl -fsS http://127.0.0.1:3006/ >/dev/null && echo "OK: staging app responding on :3006"
HTML=$(curl -fsS http://127.0.0.1:3006/)
echo "$HTML" | grep -q 'site-mobile-nav' && echo "OK: challenge-site markup (mobile nav) present"
echo "$HTML" | grep -q 'featured-pathway-heading' && echo "OK: FeaturedPathwayPanel (AI & Human Agency) present"
echo "$HTML" | grep -q 'a-fork-in-the-web' && echo "OK: Fork in the Web pathway content present"
echo "$HTML" | grep -q 'href="/badges"' && echo "OK: Badges nav link present"
echo "$HTML" | grep -q '/images/dps/card/' && echo "OK: DP card image paths present"
STAGING_CSS=$(echo "$HTML" | grep -oE 'href="/_next/static/chunks/[^"]+\.css"' | head -1 | sed 's/href="//;s/"//')
curl -fsS "http://127.0.0.1:3006${STAGING_CSS}" >/dev/null && echo "OK: staging CSS loads (${STAGING_CSS})"
