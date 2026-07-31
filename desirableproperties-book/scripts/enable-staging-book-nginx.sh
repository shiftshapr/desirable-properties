#!/usr/bin/env bash
# Deploy DP book staging files + enable nginx vhost + TLS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONF_NAME="staging.book.desirableproperties.org"

echo "==> Sync staging static files"
bash "${REPO}/scripts/deploy-staging-book.sh"

echo "==> Install nginx site"
sudo cp "${REPO}/staging.book.desirableproperties.org.nginx.conf" "/etc/nginx/sites-available/${CONF_NAME}"
sudo ln -sf "/etc/nginx/sites-available/${CONF_NAME}" "/etc/nginx/sites-enabled/${CONF_NAME}"

echo "==> Test and reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Smoke HTTP (direct Host header)"
curl -fsSL --max-time 10 -H "Host: ${CONF_NAME}" "http://127.0.0.1/viewer/intro" | grep -Eo '<title>[^<]+</title>' || true

if command -v certbot >/dev/null 2>&1; then
  echo "==> Request TLS certificate"
  sudo certbot --nginx -d "${CONF_NAME}" --non-interactive --agree-tos --redirect || {
    echo "Certbot failed. Run manually: sudo certbot --nginx -d ${CONF_NAME}" >&2
    exit 1
  }
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "==> Smoke HTTPS"
curl -fsSL --max-time 15 "https://${CONF_NAME}/viewer/intro" | grep -Eo '<title>[^<]+</title>' || true

echo "Done. Open https://${CONF_NAME}/viewer/intro"
