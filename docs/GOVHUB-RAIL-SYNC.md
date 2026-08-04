# Gov Hub → book rail sync

How approved Gov Hub revisions flow into the Desirable Properties book local rails
(`desirableproperties-book/content/local/dpN.md`).

This is the **inverse** of [GOVHUB-DP-PUBLISH.md](./GOVHUB-DP-PUBLISH.md), which pushes local
rails *to* Gov Hub. For the DP book project, **Gov Hub is the editorial source of truth**; the
local rails are a synced copy the BRC333 book reads via `localOverride` in `sources-sat.json`.

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/govhub_sync_rails_from_hub.py` | Pull latest approved revision per ML-Draft → `content/local/dpN.md` |
| `scripts/govhub_dp_common.py` | Shared mapping + fetch helpers |
| `scripts/check-rails-protected.sh` | Block unauthorized direct edits to `dp*.md` |
| `scripts/test_govhub_sync_rails.py` | Unit tests (mapping, sync marker helpers) |

## Environments

| | Hub URL | Local DB (optional) |
| --- | --- | --- |
| DEV | `https://dev.hub.themetalayer.org` | `gov-hub-dev/instance_dev/datatracker_dev.db` |
| LIVE | `https://hub.themetalayer.org` | `gov-hub-prod/instance/datatracker.db` |

Use `--env dev` (default) or `--env main`. Override with `--hub-url` if needed.

## Syncing

Preview changes (no writes):

```bash
cd /home/ubuntu/desirable-properties
python3 scripts/govhub_sync_rails_from_hub.py --dry-run
```

Write all chapters from DEV hub API:

```bash
python3 scripts/govhub_sync_rails_from_hub.py
git add desirableproperties-book/content/local/dp*.md
git commit -m "sync: pull DP rails from Gov Hub DEV [rail-sync]"
```

Useful flags:

| Flag | Meaning |
| --- | --- |
| `--only DP1,DP13` | Sync specific chapters |
| `--local-db` | Read from local Gov Hub SQLite instead of HTTP |
| `--govhub-root /path/to/gov-hub-dev` | Gov Hub checkout for `--local-db` |
| `--content-dir`, `--sources-sat` | Alternate book paths |
| `--report /tmp/sync.json` | JSON run report |

### HTTP API (default)

For each ML number in `sources-sat.json`:

1. `GET /api/doc/draft/<ml_number>/read-meta/` → served `submission_id`
2. `GET /doc/draft/<submission_id>.txt` → stored upload (markdown in `.txt`)

The ML-number `.txt` URL alone is **not** used — it resolves to the Rev 00 parent, which often
has no upload when a newer approved revision exists.

### Local database (`--local-db`)

For automation without network access, point at a Gov Hub checkout and use the same SQLite +
Flask resolution as the publish script (`get_readable_submission_by_ref`).

```bash
python3 scripts/govhub_sync_rails_from_hub.py \
  --local-db \
  --govhub-root /home/ubuntu/gov-hub-dev \
  --dry-run
```

## Sync metadata stamp

Each synced rail carries an HTML comment near the top:

```html
<!-- govhub-sync: ml=ML-Draft-008 revision=02 submission=<uuid> hash=<prefix> synced=2026-08-03T12:00:00Z -->
```

The sync script updates this line whenever the Gov Hub body changes. Existing
`dp-local-version` comments are preserved.

## Edit protection

Direct edits to `dp1.md` … `dp23.md` are discouraged and guarded:

| Layer | Behavior |
| --- | --- |
| `content/local/README.md` | Documents the Gov Hub–only workflow |
| `scripts/check-rails-protected.sh` | Fails on staged `dp*.md` changes unless authorized |
| `.github/workflows/check-rails-source.yml` | CI on PRs touching `dp*.md` |
| `.cursor/rules/dp-rails-govhub-sync.mdc` | Cursor agent guidance |

**Authorized** rail edits (any one):

- Commit message contains `[rail-sync]` (use after running the sync script)
- PR label `rail-sync`
- `ALLOW_RAIL_EDIT=1` for a local override

Pre-commit hook (optional):

```bash
printf '%s\n' '#!/bin/sh' 'scripts/check-rails-protected.sh' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Tests

```bash
python3 scripts/test_govhub_sync_rails.py
python3 scripts/govhub_sync_rails_from_hub.py --dry-run
```

## BRC333 project config

Per-project Gov Hub sync is configured in the BRC333 repo:

`BRC333/projects/desirableproperties-book-ordinal/project.json` → `govhubSync`

Other BRC333 projects omit the block or set `"enabled": false`.

## Typical workflow

```mermaid
flowchart LR
  A[Gov Hub editor] --> B[Approve revision]
  B --> C[govhub_sync_rails_from_hub.py]
  C --> D[content/local/dpN.md]
  D --> E[BRC333 book preview / deploy]
```

1. Edit and approve on Gov Hub.
2. Run sync script → commit with `[rail-sync]`.
3. Book preview reads updated rails via `localOverride`.

Do **not** run `govhub_publish_dp_revisions.py` unless intentionally pushing local edits back
to Gov Hub (legacy / migration path).
