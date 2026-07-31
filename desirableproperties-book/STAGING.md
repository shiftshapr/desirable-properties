# Staging: `staging.book.desirableproperties.org`

Static staging for the DP book reader — mirrors prod Canopi API and pageIds (same pattern as `staging.metawebbook.com`).

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

Staging uses prod API (`https://api.canopi.live`) and the same embed UUID as prod. Add the staging hostname to the embed domain whitelist:

```sql
UPDATE canopi_embed_instances
SET domain_whitelist = array_append(domain_whitelist, 'staging.book.desirableproperties.org')
WHERE id = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c'
  AND NOT ('staging.book.desirableproperties.org' = ANY(domain_whitelist));
```

Apply on the Canopi API Postgres (see `canopi/migrations/023_dp_book_embed.sql` for the base row).

`assets/dp-canopi-bridge.js` sets `pageUrlOrigin` to `https://book.desirableproperties.org` on the staging host so Canopi pageIds match prod.

## Verify

```bash
curl -fsSL -H "Host: staging.book.desirableproperties.org" http://127.0.0.1/viewer/intro | head
dig +short staging.book.desirableproperties.org
```
