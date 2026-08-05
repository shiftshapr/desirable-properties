#!/usr/bin/env bash
# Fail when protected book rail files change without authorization.
#
# Authorized when any of:
#   ALLOW_RAIL_EDIT=1
#   commit message contains [rail-sync]
#   (CI only) PR has label rail-sync
#
# Usage:
#   scripts/check-rails-protected.sh            # pre-commit: staged files
#   scripts/check-rails-protected.sh --ci       # CI: PR diff + label check

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAIL_PATHS=(
  'desirableproperties-book/content/local/dp*.md'
  'desirableproperties-book/content/local/about.md'
  'desirableproperties-book/content/local/acknowledgements.md'
)
MODE="${1:-}"

if [[ "${ALLOW_RAIL_EDIT:-}" == "1" ]]; then
  exit 0
fi

if git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  if git -C "$REPO_ROOT" log -1 --pretty=%B 2>/dev/null | grep -Fq '[rail-sync]'; then
    exit 0
  fi
fi

collect_changed() {
  if [[ "$MODE" == "--ci" ]]; then
    BASE="${GITHUB_BASE_REF:-main}"
    git -C "$REPO_ROOT" fetch origin "$BASE" --depth=1 >/dev/null 2>&1 || true
    for pattern in "${RAIL_PATHS[@]}"; do
      git -C "$REPO_ROOT" diff --name-only "origin/${BASE}...HEAD" -- $pattern 2>/dev/null || true
    done
  else
    for pattern in "${RAIL_PATHS[@]}"; do
      git -C "$REPO_ROOT" diff --cached --name-only -- $pattern 2>/dev/null || true
    done
  fi
}

mapfile -t CHANGED < <(collect_changed | sed '/^$/d')

if [[ ${#CHANGED[@]} -eq 0 ]]; then
  exit 0
fi

if [[ "$MODE" == "--ci" && -n "${GITHUB_EVENT_PATH:-}" && -f "$GITHUB_EVENT_PATH" ]]; then
  if python3 - <<'PY' "$GITHUB_EVENT_PATH"
import json, sys
path = sys.argv[1]
with open(path, encoding='utf-8') as f:
    event = json.load(f)
labels = {l.get('name', '') for l in (event.get('pull_request') or {}).get('labels') or []}
sys.exit(0 if 'rail-sync' in labels else 1)
PY
  then
    exit 0
  fi
fi

echo "ERROR: Direct edits to Gov Hub–synced rails are not allowed." >&2
echo "Changed files:" >&2
printf '  %s\n' "${CHANGED[@]}" >&2
echo >&2
echo "Edit chapters on Gov Hub, then run:" >&2
echo "  python3 scripts/govhub_sync_rails_from_hub.py" >&2
echo "Commit with [rail-sync] in the message, or set ALLOW_RAIL_EDIT=1 to override." >&2
exit 1
