#!/usr/bin/env bash
# Sync desirableproperties-book static tree to the staging web root on this VPS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEST="${DP_BOOK_STAGING_ROOT:-/home/ubuntu/desirableproperties-book-staging}"

echo "==> Deploy DP Book staging"
echo "    from: ${SRC}"
echo "    to:   ${DEST}"

if [[ ! -d "${DEST}" ]]; then
  mkdir -p "${DEST}"
fi

rsync -a --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'scripts/' \
  --exclude '*.nginx.conf' \
  "${SRC}/" "${DEST}/"

echo "==> Staging tree synced ($(du -sh "${DEST}" | awk '{print $1}'))"
echo
echo "Enable nginx + TLS (sudo): bash ${SRC}/scripts/enable-staging-book-nginx.sh"
echo
echo "Note: If you already pointed DNS at 216.238.91.120, that part is done."
