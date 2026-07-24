# Desirable Properties Challenge Site

Next.js application for **[desirableproperties.org](https://desirableproperties.org)** – the public home of the Desirable Properties Challenge.

## What this app is

- Challenge overview, timeline, and countdown (`/challenge`)
- Browse all Desirable Properties (`/dp/[id]`)
- ML-Draft PDF downloads per DP (`/downloads/dp/dp1.pdf` … `dp22.pdf`)
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

## Environment

| Variable | Default |
|----------|---------|
| `GOVHUB_BASE_URL` | `https://hub.themetalayer.org` |
| `GOVHUB_METAWEB_LAYER_ID` | The Metaweb layer UUID |

Set in `ecosystem.config.js` for PM2.

## Related apps in this repo

| Directory | Domain | Role |
|-----------|--------|------|
| `challenge-site/` | desirableproperties.org | Living challenge, DPs, governance entry |
| `web-app/` | app.themetalayer.org | Historical submission archive |
