# Staging: `staging.book.desirableproperties.org`

Static staging for the DP book reader — uses **staging Canopi API** with prod-aligned pageIds (same pattern as `staging.metawebbook.com`).

**Source of truth:** edit files in this repo (`desirableproperties-book/`), then run `scripts/deploy-staging-book.sh`. Do **not** edit `/home/ubuntu/desirableproperties-book-staging` directly — that path is the nginx web root only.

## DNS (Cloudflare)

| Hostname | Type | Value |
|----------|------|-------|
| `staging.book.desirableproperties.org` | A | `216.238.91.120` |

Orange-cloud proxy is OK once nginx serves the vhost.

## Deploy

```bash
cd /home/ubuntu/desirable-properties/desirableproperties-book
bash scripts/deploy-staging-book.sh
```

Web root: `/home/ubuntu/desirableproperties-book-staging` (does **not** touch prod `/var/www/desirableproperties-book`).

## Enable nginx + TLS

```bash
bash scripts/enable-staging-book-nginx.sh
```

Or manually:

```bash
sudo cp staging.book.desirableproperties.org.nginx.conf /etc/nginx/sites-available/staging.book.desirableproperties.org
sudo ln -sf /etc/nginx/sites-available/staging.book.desirableproperties.org /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d staging.book.desirableproperties.org
```

## Canopi embed whitelist

Staging uses **staging API** (`https://staging.api.canopi.live`) via `dp-canopi-bridge.js`; prod book uses `https://api.canopi.live`. Both share the same embed UUID and prod-aligned `pageUrlOrigin`. Add the staging hostname to the embed domain whitelist on **both** APIs if needed:

```sql
UPDATE canopi_embed_instances
SET domain_whitelist = array_append(domain_whitelist, 'staging.book.desirableproperties.org')
WHERE id = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c'
  AND NOT ('staging.book.desirableproperties.org' = ANY(domain_whitelist));
```

For the **challenge-site** staging host (Fork in the Web perspective embed):

```sql
UPDATE canopi_embed_instances
SET domain_whitelist = array_append(domain_whitelist, 'staging.desirableproperties.org')
WHERE id = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c'
  AND NOT ('staging.desirableproperties.org' = ANY(domain_whitelist));
```

Apply on the Canopi API Postgres (see `canopi/migrations/023_dp_book_embed.sql` and `024_dp_fork_perspective_staging_host.sql` for the base row).

`assets/dp-canopi-bridge.js` sets `pageUrlOrigin` to `https://book.desirableproperties.org` on the staging host so Canopi pageIds match prod.

## Verify

```bash
curl -fsSL -H "Host: staging.book.desirableproperties.org" http://127.0.0.1/viewer/intro | head
dig +short staging.book.desirableproperties.org
```
