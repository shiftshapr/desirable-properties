#!/usr/bin/env bash
# Sync composite DP PDFs into Next.js public/ for desirableproperties.org downloads.
# Prefer versioned composites (DP13-0.77X.pdf); keep dp{n}.pdf as a stable alias.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
DEST="$ROOT/public/downloads"
GEN="$REPO/scripts/generate-composite-dp-pdfs.py"

mkdir -p "$DEST/dp"

if [[ -f "$GEN" ]]; then
  python3 "$GEN"
fi

# Fallback: copy any remaining legacy docs/dp-pdfs into aliases if composites missing.
SRC_DOCS="$REPO/docs"
for i in $(seq 1 22); do
  alias="$DEST/dp/dp${i}.pdf"
  versioned="$(ls "$DEST/dp/DP${i}-"*.pdf 2>/dev/null | head -1 || true)"
  if [[ -n "$versioned" && ! -f "$alias" ]]; then
    cp "$versioned" "$alias"
  elif [[ ! -f "$alias" ]]; then
    src="$(ls "$SRC_DOCS/dp-pdfs/dp${i}-"*.pdf 2>/dev/null | head -1 || true)"
    if [[ -n "$src" ]]; then
      cp "$src" "$alias"
    fi
  fi
done

if [[ -f "$SRC_DOCS/desirable-property-inscriptions.pdf" ]]; then
  cp "$SRC_DOCS/desirable-property-inscriptions.pdf" "$DEST/desirable-property-inscriptions.pdf"
fi

echo "Synced $(ls "$DEST/dp"/*.pdf 2>/dev/null | wc -l) DP PDFs to $DEST/dp/"
