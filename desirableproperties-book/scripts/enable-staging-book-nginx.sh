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

smoke_http() {
  local path="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: ${CONF_NAME}" "http://127.0.0.1${path}")"
  if [[ "${code}" != "200" ]]; then
    echo "Smoke failed: HTTP ${code} for ${path} (need Host: ${CONF_NAME}; without it nginx default vhost returns 404)" >&2
    exit 1
  fi
}

echo "==> Smoke HTTP (direct Host header)"
smoke_http /viewer.htm
smoke_http /viewer/intro
curl -fsSL --max-time 10 -H "Host: ${CONF_NAME}" "http://127.0.0.1/viewer/intro" \
  | grep -Eo '<title>[^<]+</title>'

if command -v certbot >/dev/null 2>&1; then
  echo "==> Request TLS certificate"
  if sudo certbot --nginx -d "${CONF_NAME}" --non-interactive --agree-tos --redirect; then
    sudo nginx -t
    sudo systemctl reload nginx
    echo "==> Smoke HTTPS"
    curl -fsSL --max-time 15 "https://${CONF_NAME}/viewer/intro" \
      | grep -Eo '<title>[^<]+</title>'
    echo "Done. Open https://${CONF_NAME}/viewer/intro"
  else
    echo "Certbot failed (usually DNS). After A record propagation, run:" >&2
    echo "  sudo certbot --nginx -d ${CONF_NAME}" >&2
    echo "Done (HTTP only). Test: curl -H \"Host: ${CONF_NAME}\" http://127.0.0.1/viewer/intro"
    exit 0
  fi
else
  echo "Done. Open http://${CONF_NAME}/viewer/intro (certbot not installed)"
fi
