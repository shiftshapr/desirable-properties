#!/usr/bin/env bash
# Stop the Meta-Layer web app, free port 3000, rebuild (optional), start with PM2.
# Run from anywhere:  bash scripts/restart.sh
# From web-app:        ./scripts/restart.sh
#
# SKIP_BUILD=1        skip `npm run build` (faster restarts)
# NO_PM2_SAVE=1       skip `pm2 save`

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PM2_NAME="app-themetalayer"
PORT="${PORT:-3000}"

echo "==> Working directory: $ROOT"

free_port() {
  local p="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${p}/tcp" 2>/dev/null || true
  fi
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti ":${p}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      echo "==> Killing PID(s) on port ${p}: ${pids}"
      kill -TERM ${pids} 2>/dev/null || true
      sleep 1
      pids="$(lsof -ti ":${p}" -sTCP:LISTEN 2>/dev/null || true)"
      if [[ -n "${pids}" ]]; then
        kill -KILL ${pids} 2>/dev/null || true
      fi
    fi
  fi
}

echo "==> Stopping PM2 app: ${PM2_NAME}"
pm2 delete "${PM2_NAME}" 2>/dev/null || true

echo "==> Freeing port ${PORT}"
free_port "${PORT}"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> npm run build"
  npm run build
else
  echo "==> SKIP_BUILD=1 — skipping build"
fi

mkdir -p "${ROOT}/logs"

echo "==> Starting ${PM2_NAME} via ecosystem.config.js"
pm2 start "${ROOT}/ecosystem.config.js"

if [[ "${NO_PM2_SAVE:-0}" != "1" ]]; then
  pm2 save
fi

pm2 status "${PM2_NAME}" || true
echo "==> Done. Nginx should proxy to http://127.0.0.1:${PORT}"
