#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/desirable-properties/challenge-site"
NGINX_CONF="/home/ubuntu/nginx/staging.desirableproperties.org.conf"

cd "$APP_DIR"

echo "[1/5] Stopping staging PM2 only (prod stays up during build)..."
pm2 stop desirableproperties-staging 2>/dev/null || true

# Staging builds to .next-staging; prod uses .next-prod — builds no longer clobber each other.
echo "[2/5] Building Next.js app (DP_ENV=staging → .next-staging)..."
export DP_ENV=staging
npm run build

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

  prod_css=$(echo "$prod_html" | grep -oE 'href="/_next/static/chunks/[^"]+\.css"' | head -1 | sed 's/href="//;s/"//')
  if [[ -z "$prod_css" ]]; then
    echo "WARNING: could not extract prod CSS href from homepage"
    return 0
  fi

  if ! curl -fsS "http://127.0.0.1:3005${prod_css}" >/dev/null 2>&1; then
    echo "WARNING: prod CSS probe failed (${prod_css}) — run ./deploy.sh to rebuild prod"
    return 0
  fi

  css_disk="${APP_DIR}/.next-prod${prod_css}"
  if [[ ! -f "$css_disk" ]]; then
    echo "WARNING: prod serves ${prod_css} but file missing from .next-prod (disk mismatch)"
    echo "         Run ./deploy.sh to align prod with .next-prod"
  else
    echo "OK: prod CSS loads and matches .next-prod on disk (${prod_css})"
  fi
}

probe_prod_css

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
STAGING_CSS=$(echo "$HTML" | grep -oE 'href="/_next/static/chunks/[^"]+\.css"' | head -1 | sed 's/href="//;s/"//')
curl -fsS "http://127.0.0.1:3006${STAGING_CSS}" >/dev/null && echo "OK: staging CSS loads (${STAGING_CSS})"
