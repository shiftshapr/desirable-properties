#!/usr/bin/env bash
# Copy generated DP PDFs into Next.js public/ for desirableproperties.org downloads.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DOCS="$(cd "$ROOT/.." && pwd)/docs"
DEST="$ROOT/public/downloads"

mkdir -p "$DEST/dp"

for i in $(seq 1 22); do
  src="$(ls "$SRC_DOCS/dp-pdfs/dp${i}-"*.pdf 2>/dev/null | head -1 || true)"
  if [[ -n "$src" ]]; then
    cp "$src" "$DEST/dp/dp${i}.pdf"
  fi
done

if [[ -f "$SRC_DOCS/desirable-property-inscriptions.pdf" ]]; then
  cp "$SRC_DOCS/desirable-property-inscriptions.pdf" "$DEST/desirable-property-inscriptions.pdf"
fi

echo "Synced $(ls "$DEST/dp"/*.pdf 2>/dev/null | wc -l) DP PDFs to $DEST/dp/"
