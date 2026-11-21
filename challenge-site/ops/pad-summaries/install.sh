#!/usr/bin/env bash
# Install the proposal pad summary timer as systemd user units (box1, production; linger is on).
#
#   bash ~/desirable-properties/challenge-site/ops/pad-summaries/install.sh            # install and enable the timer
#   bash ~/desirable-properties/challenge-site/ops/pad-summaries/install.sh --dry-run  # also do one no-cost check run
#
# Copies the two unit files into ~/.config/systemd/user, reloads and enables the timer. It does not read, print or
# copy .env.local; the service script reads only the keys it needs from it at run time.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$(cd "$HERE/../.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

[ -f "$APP/.env.local" ] || { echo "No .env.local in $APP; the service needs the app's env file." >&2; exit 1; }
[ -d "$APP/node_modules/@anthropic-ai/sdk" ] && [ -d "$APP/node_modules/pg" ] \
  || { echo "node_modules in $APP is missing @anthropic-ai/sdk or pg." >&2; exit 1; }

mkdir -p "$UNIT_DIR"
install -m 0644 "$HERE/dp-pad-summaries.service" "$UNIT_DIR/dp-pad-summaries.service"
install -m 0644 "$HERE/dp-pad-summaries.timer" "$UNIT_DIR/dp-pad-summaries.timer"
systemctl --user daemon-reload
systemctl --user enable --now dp-pad-summaries.timer

if [ "${1:-}" = "--dry-run" ]; then
  # Reads Gov Hub once per document and the table; calls no model and writes nothing.
  (cd "$APP" && node --no-warnings --experimental-strip-types --import ./scripts/ts-alias-hooks.mjs \
    scripts/generate-proposal-pad-summaries.mjs --db --dry-run --env-file "$APP/.env.local")
fi

systemctl --user list-timers dp-pad-summaries.timer --no-pager
echo "Logs: journalctl --user -u dp-pad-summaries.service -n 20 --no-pager"
