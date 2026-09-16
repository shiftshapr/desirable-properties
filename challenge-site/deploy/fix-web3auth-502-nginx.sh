#!/usr/bin/env bash
# Fix Web3Auth login 502 on desirableproperties.org (nginx "upstream sent too big header").
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROD_SRC="${SCRIPT_DIR}/nginx/desirableproperties.org.conf"
STAGING_SRC="${SCRIPT_DIR}/nginx/staging.desirableproperties.org.conf"

sudo cp "$PROD_SRC" /etc/nginx/sites-available/desirableproperties.org.conf
sudo cp "$STAGING_SRC" /etc/nginx/sites-available/staging.desirableproperties.org.conf
sudo cp "$PROD_SRC" /home/ubuntu/nginx/desirableproperties.org.conf
sudo cp "$STAGING_SRC" /home/ubuntu/nginx/staging.desirableproperties.org.conf
sudo nginx -t
sudo systemctl reload nginx
echo "nginx reloaded. Ask Micah to retry sign-in at https://desirableproperties.org/login"
