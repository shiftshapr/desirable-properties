#!/usr/bin/env bash
# Staging sandbox rail sync: DEV Gov Hub approved revisions → staging book rails only.
# Never commits to git and never touches the prod book. Called by the DEV Gov Hub publish
# hook (via scripts/staging_rail_sync_gh_shim.sh) and by cron as a fallback.
# See docs/DP-LOOP-OPS.md "Staging sandbox".
set -euo pipefail
REPO=/home/ubuntu/desirable-properties
STAGING_BOOK=${STAGING_BOOK:-/home/ubuntu/desirableproperties-book-staging}
PY=${GOVHUB_PYTHON:-/home/ubuntu/.pyenv/versions/3.9.18/bin/python3}
OUT="$REPO/data/loop"
mkdir -p "$OUT/logs"
cd "$REPO"
exec 9>/tmp/dp-staging-rail-sync.lock
flock -w 120 9
echo "== $(date -u +%FT%TZ) staging rail sync (trigger=${TRIGGER:-manual})"
"$PY" scripts/govhub_sync_rails_from_hub.py --env dev --local-db \
  --govhub-root /home/ubuntu/gov-hub-dev \
  --book-root "$STAGING_BOOK" \
  --content-dir "$STAGING_BOOK/content/local" \
  --sources-sat "$STAGING_BOOK/json/sources-sat.json" \
  --report "$OUT/staging-rail-sync-report.json" | tail -4
printf '{"finished_at":"%s","trigger":"%s"}\n' "$(date -u +%FT%TZ)" "${TRIGGER:-manual}" > "$OUT/staging-rail-sync-last.json"
