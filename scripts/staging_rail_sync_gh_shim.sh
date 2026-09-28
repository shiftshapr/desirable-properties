#!/usr/bin/env bash
# DEV Gov Hub GH_BIN shim. services/dp_rail_sync_dispatch.py runs
#   $GH_BIN workflow run govhub-rail-sync.yml --repo <repo> -f env=dev
# after a publish. On DEV that must update the staging book only, so this records the
# dispatch and runs scripts/staging_rail_sync.sh in the background (the hook times out at 30 s).
set -euo pipefail
LOG=/home/ubuntu/desirable-properties/data/loop/logs/staging-rail-sync.log
mkdir -p "$(dirname "$LOG")"
if [ "${1:-}" != "workflow" ] || [ "${2:-}" != "run" ]; then
  echo "staging shim: unsupported gh call: $*" >&2
  exit 2
fi
printf '{"dispatched_at":"%s","args":"%s"}\n' "$(date -u +%FT%TZ)" "$*" \
  > /home/ubuntu/desirable-properties/data/loop/staging-rail-sync-dispatch.json
TRIGGER=govhub-dev-publish setsid nohup bash /home/ubuntu/desirable-properties/scripts/staging_rail_sync.sh >> "$LOG" 2>&1 < /dev/null &
echo "staging rail sync started"
