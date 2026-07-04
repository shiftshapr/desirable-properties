#!/usr/bin/env bash
# One-shot infra: book.desirableproperties.org nginx + certbot + BRC333 hub deploy.
# Run: sudo bash /home/ubuntu/desirable-properties/desirableproperties-book/install-infra.sh
set -euo pipefail

BOOK_SRC="/home/ubuntu/BRC333/projects/desirableproperties-book-ordinal"
BOOK_DEST="/var/www/desirableproperties-book"
NGINX_CONF="/home/ubuntu/desirable-properties/desirableproperties-book/nginx/book.desirableproperties.org.conf"
MAIN_NGINX_CONF="/home/ubuntu/nginx/desirableproperties.org.conf"
HUB_DEPLOY="/home/ubuntu/BRC333/brc333-app-hub/scripts/deploy.sh"

echo "==> Deploy book static files (ordinal preview)"
mkdir -p "$BOOK_DEST"
rsync -a --delete --exclude '.git' "$BOOK_SRC/" "$BOOK_DEST/"
rsync -a "$BOOK_SRC/json/" "$BOOK_DEST/json/"

echo "==> Deploy book cover + reader SPA (index.html, viewer.htm, assets/, json/)"
# These files power /book and /viewer/* on desirableproperties.org (main domain).
# They live alongside the ordinal preview so the subdomain vhost keeps working too.
BOOK_PAGES_SRC="/home/ubuntu/desirable-properties/desirableproperties-book"
for f in index.html viewer.htm; do
  if [ -f "$BOOK_PAGES_SRC/$f" ]; then
    cp "$BOOK_PAGES_SRC/$f" "$BOOK_DEST/$f"
  fi
done
if [ -d "$BOOK_PAGES_SRC/assets" ]; then
  rsync -a "$BOOK_PAGES_SRC/assets/" "$BOOK_DEST/assets/"
fi
# Use the book-pages manifest (richer than the ordinal preview manifest) but
# preserve any extra JSON the ordinal preview needs (graph-snapshot.json, etc.).
if [ -d "$BOOK_PAGES_SRC/json" ]; then
  cp -u "$BOOK_PAGES_SRC/json/"*.json "$BOOK_DEST/json/" 2>/dev/null || true
fi

echo "==> Install nginx vhost for book.desirableproperties.org"
cp "$NGINX_CONF" /etc/nginx/sites-available/book.desirableproperties.org.conf
ln -sf /etc/nginx/sites-available/book.desirableproperties.org.conf /etc/nginx/sites-enabled/

echo "==> Install main domain vhost (desirableproperties.org) with /book + /viewer/* rewrites"
if [ -f "$MAIN_NGINX_CONF" ]; then
  cp "$MAIN_NGINX_CONF" /etc/nginx/sites-available/desirableproperties.org.conf
  ln -sf /etc/nginx/sites-available/desirableproperties.org.conf /etc/nginx/sites-enabled/
fi

nginx -t
systemctl reload nginx

echo "==> Expand TLS cert for book.desirableproperties.org"
certbot --nginx -d book.desirableproperties.org --non-interactive --agree-tos --expand \
  -d desirableproperties.org -d www.desirableproperties.org || \
  certbot --nginx -d book.desirableproperties.org --non-interactive --agree-tos

echo "==> Deploy BRC333 app hub (includes desirableproperties-book-ordinal project)"
bash "$HUB_DEPLOY"

echo ""
echo "Done."
echo "  Cover:   https://desirableproperties.org/book"
echo "  Reader:  https://desirableproperties.org/viewer/intro"
echo "  Ordinal: https://book.desirableproperties.org/preview.html"
echo "  Hub:     https://app.brc333.xyz/preview.html?path=/projects/desirableproperties-book-ordinal/preview.html"
