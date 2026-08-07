# Challenge-site staging

Staging runs the same Next.js challenge-site as production from `/home/ubuntu/desirable-properties/challenge-site`, on a separate PM2 process and port. Book staging (`staging.book.desirableproperties.org`) is unrelated — do not change it when deploying here.

## URLs and ports

| Role | URL | PM2 name | Port |
|------|-----|----------|------|
| Production | https://desirableproperties.org | `desirableproperties` | 3005 |
| Staging | https://staging.desirableproperties.org | `desirableproperties-staging` | 3006 |

## Staging-first workflow

1. Deploy to staging: `./deploy-staging.sh`
2. Verify on https://staging.desirableproperties.org (mobile hamburger nav, sign-in, Hermes, etc.)
3. Promote to production: `./deploy.sh` (stops/restarts prod only; staging keeps running)

Both scripts share one git checkout and one `npm run build` output (`.next/`). Staging deploy does **not** stop production.

## Files

- `ecosystem.config.js` — production PM2 (`desirableproperties`, :3005)
- `ecosystem.staging.config.js` — staging PM2 (`desirableproperties-staging`, :3006)
- `/home/ubuntu/nginx/staging.desirableproperties.org.conf` — nginx vhost → :3006
- `/home/ubuntu/meta-console/registry.yaml` — estate registry entry

## Environment

Staging sets `DP_PUBLIC_BASE=https://staging.desirableproperties.org`, `DP_BOOK_BASE_URL=https://staging.book.desirableproperties.org`, and `GOVHUB_BASE_URL=https://hub.themetalayer.org` in `ecosystem.staging.config.js`. Staging shares production Gov Hub (memberships, join/nominate APIs) while keeping its own Next.js host and book staging site. Override via `.env.local` keys `DP_PUBLIC_BASE_STAGING` / `DP_BOOK_BASE_URL_STAGING` if needed.

Book nav links and activity-feed hrefs resolve from `DP_BOOK_BASE_URL` (or auto-detect from `DP_PUBLIC_BASE` / browser hostname when unset).

Other secrets (`AUTH_SESSION_SECRET`, Hermes keys, Resend, etc.) are read from the same `.env.local` as production.

## Web3Auth (manual)

Domain allowlisting is configured in the [Web3Auth Dashboard](https://dashboard.web3auth.io), not in this repo. For sign-in on staging, add:

- `https://staging.desirableproperties.org`

to the **Allowed Origins / Whitelist URLs** for the devnet client ID (`WEB3AUTH_CLIENT_ID_DEVNET` in ecosystem config). Production uses the apex domain `https://desirableproperties.org`.

Until whitelisted, Google/email sign-in on staging will fail with a whitelist error; everything else should work.

## First-time nginx + TLS

```bash
sudo cp /home/ubuntu/nginx/staging.desirableproperties.org.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/staging.desirableproperties.org.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d staging.desirableproperties.org
```

Certbot will add HTTPS and HTTP→HTTPS redirect blocks (same pattern as `staging.book.desirableproperties.org`).

## Useful commands

```bash
pm2 logs desirableproperties-staging
pm2 restart desirableproperties-staging
curl -sI http://127.0.0.1:3006/
curl -sI https://staging.desirableproperties.org/
```
