# Desirable Properties Challenge Site

Next.js application for **[desirableproperties.org](https://desirableproperties.org)** – the public home of the Desirable Properties Challenge.

## What this app is

- Challenge overview, timeline, and countdown (`/challenge`)
- Browse all Desirable Properties (`/dp/[id]`)
- ML-Draft PDF downloads per DP (`/downloads/dp/dp1.pdf` … `dp23.pdf`)
- On-chain provenance and Call for Input archive (`/onchain`)
- About / framing chapter summary (`/about`)
- Live Gov Hub workgroup and activity integration

## Development

```bash
cd challenge-site
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production deploy

From this directory:

```bash
./deploy.sh
```

Or from the repo root:

```bash
./scripts/deploy-challenge-site.sh
```

Runs on port **3005** via PM2 process `desirableproperties`.

Production builds write to **`.next-prod`** (`DP_ENV=prod`). Staging uses **`.next-staging`** — see [STAGING.md](STAGING.md). Local `npm run dev` keeps the default `.next/`.

On this VPS, always deploy with `./deploy.sh` (atomic `.next-prod-build` swap). Never run `DP_ENV=prod npm run build` against the live checkout — that overwrites `.next-prod` while PM2 is serving it and Next.js returns **HTTP 500** `text/plain` (21B) for `/_next/static` CSS.

## Environment

| Variable | Default |
|----------|---------|
| `GOVHUB_BASE_URL` | `https://hub.themetalayer.org` |
| `GOVHUB_METAWEB_LAYER_ID` | The Metaweb layer UUID |
| `DP_DATABASE_URL` | Postgres for admin config (see [docs/DATABASE.md](docs/DATABASE.md)) |
| `ONCHAIN_ADMIN_EMAILS` | Admin login allowlist |
| `RESEND_API_KEY` | Support + broadcast email |

Set in `ecosystem.config.js` for PM2.

## Related apps in this repo

| Directory | Domain | Role |
|-----------|--------|------|
| `challenge-site/` | desirableproperties.org | Living challenge, DPs, governance entry |
| `web-app/` | app.themetalayer.org | Historical submission archive |
