#!/usr/bin/env bash
# Deploy book.desirableproperties.org static files from BRC333 project, plus
# the cover page + reader SPA (index.html, viewer.htm, assets/) that power
# /book and /viewer/* on the main domain (desirableproperties.org).
set -euo pipefail
SRC="/home/ubuntu/BRC333/projects/desirableproperties-book-ordinal"
DEST="/var/www/desirableproperties-book"
NGINX_SRC="/home/ubuntu/desirable-properties/desirableproperties-book/nginx/book.desirableproperties.org.conf"
MAIN_NGINX_SRC="/home/ubuntu/nginx/desirableproperties.org.conf"
PAGES_SRC="/home/ubuntu/desirable-properties/desirableproperties-book"

echo "Deploying Desirable Properties ordinal preview from $SRC -> $DEST"
mkdir -p "$DEST"
rsync -a --delete \
  --exclude '.git' \
  "$SRC/" "$DEST/"
rsync -a "$SRC/json/" "$DEST/json/"

echo "Deploying cover page + reader SPA from $PAGES_SRC"
for f in index.html viewer.htm; do
  if [ -f "$PAGES_SRC/$f" ]; then
    cp "$PAGES_SRC/$f" "$DEST/$f"
  fi
done
if [ -d "$PAGES_SRC/assets" ]; then
  rsync -a "$PAGES_SRC/assets/" "$DEST/assets/"
fi
if [ -d "$PAGES_SRC/json" ]; then
  # Copy the book-pages manifest if newer; do not clobber ordinal-only files.
  cp -u "$PAGES_SRC/json/"*.json "$DEST/json/" 2>/dev/null || true
fi

if command -v nginx >/dev/null; then
  if sudo -n true 2>/dev/null; then
    if [ -f "$NGINX_SRC" ]; then
      sudo cp "$NGINX_SRC" /etc/nginx/sites-available/book.desirableproperties.org.conf
      sudo ln -sf /etc/nginx/sites-available/book.desirableproperties.org.conf /etc/nginx/sites-enabled/
    fi
    if [ -f "$MAIN_NGINX_SRC" ]; then
      sudo cp "$MAIN_NGINX_SRC" /etc/nginx/sites-available/desirableproperties.org.conf
      sudo ln -sf /etc/nginx/sites-available/desirableproperties.org.conf /etc/nginx/sites-enabled/
    fi
    sudo nginx -t
    sudo systemctl reload nginx
  else
    echo "NOTE: run manually with sudo to install nginx site(s):"
    if [ -f "$NGINX_SRC" ]; then
      echo "  sudo cp $NGINX_SRC /etc/nginx/sites-available/book.desirableproperties.org.conf"
      echo "  sudo ln -sf /etc/nginx/sites-available/book.desirableproperties.org.conf /etc/nginx/sites-enabled/"
    fi
    if [ -f "$MAIN_NGINX_SRC" ]; then
      echo "  sudo cp $MAIN_NGINX_SRC /etc/nginx/sites-available/desirableproperties.org.conf"
      echo "  sudo ln -sf /etc/nginx/sites-available/desirableproperties.org.conf /etc/nginx/sites-enabled/"
    fi
    echo "  sudo nginx -t && sudo systemctl reload nginx"
  fi
fi

echo "OK: /var/www/desirableproperties-book deployed"
echo "Cover:   /book or /index.html"
echo "Reader:  /viewer/intro or /viewer.htm?ch=dp-1"
echo "Ordinal: /preview.html or /logic.htm?localSources=1&localFiles=1"
