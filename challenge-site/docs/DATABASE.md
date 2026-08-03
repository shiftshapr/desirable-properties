# DP Challenge Site – Postgres

Postgres stores admin config and operational data for **desirableproperties.org** (challenge-site). The schema uses a `dp_` table prefix inside the shared `desirable_properties` database (same instance as the legacy web-app Prisma tables).

## Tables

| Table | Purpose |
|-------|---------|
| `dp_admin_user` | Extra admin emails (beyond `ONCHAIN_ADMIN_EMAILS`) |
| `dp_site_modal` | Scheduled site-wide messages / modals |
| `dp_blueberry_settings` | Global blueberries intro + availability |
| `dp_blueberry` | Participation activity definitions |
| `dp_broadcast_log` | Email broadcast send history |
| `dp_support_ticket` | Support tickets (migrated from JSON; attachments stay on disk) |

Schema is applied automatically on first API request, or manually via migration script.

## Environment

Add to `challenge-site/.env.local` (and PM2 env):

```bash
# Preferred – dedicated URL for challenge-site admin data
DP_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/desirable_properties

# Fallback (also used by web-app Prisma)
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/desirable_properties

# Broadcast email enrichment (Canopi internal API)
METAWEB_OPS_SECRET=...
# Optional override:
# CANOPI_API_BASE=https://api.canopi.live
```

Existing admin auth env vars (unchanged):

```bash
ONCHAIN_ADMIN_SECRET=...
ONCHAIN_ADMIN_EMAILS=bridgitdao@gmail.com,daveed@bridgit.io
RESEND_API_KEY=...          # required for broadcast + support email
DP_BROADCAST_FROM=...       # optional; defaults to DP_SUPPORT_FROM / RESEND_FROM
```

## One-time setup

```bash
cd /home/ubuntu/desirable-properties/challenge-site
npm install
node scripts/migrate-dp-db.mjs
```

Restart PM2 after setting env:

```bash
pm2 restart desirableproperties --update-env
```

## API routes

| Route | Auth | Description |
|-------|------|-------------|
| `GET /api/admin/me` | admin cookie | Session + DB status |
| `GET/POST/DELETE /api/admin/users` | admin | Admin user CRUD |
| `GET/POST /api/admin/blueberries` | admin | List/create + settings |
| `PATCH/DELETE /api/admin/blueberries/[id]` | admin | Update/remove/reorder |
| `GET/POST /api/admin/site-modals` | admin | Site messages list/create |
| `GET/PATCH/DELETE /api/admin/site-modals/[id]` | admin | Get/update/duplicate/delete |
| `GET/POST /api/admin/broadcast` | admin | Audience, log, preview, send |
| `GET /api/site-modals/active` | public | Active modals for a page |
| `GET /api/blueberries` | public | Public blueberries config |

## What stays outside Postgres

- **Support ticket attachments** – binary files under `data/support-tickets/attachments/`
- **Workgroup signups** – Gov Hub API (`/api/layers/.../workgroup-signups/`) with client fallback
- **On-chain admin login** – still env cookie auth via `ONCHAIN_ADMIN_EMAILS`

## Broadcast audience note

Audience rows are built from Gov Hub workgroup signups (names/workgroups only). Production sends enrich emails via:

1. **Canopi internal API** – `POST /v1/internal/metaweb/user-email` with `METAWEB_OPS_SECRET` (UUID user IDs only)
2. **Support ticket capture** – emails stored when users submit support requests

Members without a Canopi account or prior support contact may still lack email. Use **test mode** to verify templates before live sends.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Admin tabs empty / 503 | `DP_DATABASE_URL` unset or wrong credentials |
| Broadcast fails | `RESEND_API_KEY` in `.env.local` / PM2 env |
| Broadcast missing emails | `METAWEB_OPS_SECRET` set; user IDs are Canopi UUIDs |
| Schema missing | Run `node scripts/migrate-dp-db.mjs` |
| Env admins can't be removed in UI | Expected – edit `ONCHAIN_ADMIN_EMAILS` on server |
