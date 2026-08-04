# Local DP chapter rails — do not edit directly

The files `dp1.md` … `dp23.md` in this directory are **synced from Gov Hub**, not authored here.

## Source of truth

1. Edit the chapter on **Gov Hub** (review queue → approved revision).
2. Pull the latest approved text into this repo:

```bash
cd /home/ubuntu/desirable-properties
python3 scripts/govhub_sync_rails_from_hub.py --dry-run   # preview
python3 scripts/govhub_sync_rails_from_hub.py           # write rails
```

3. Commit with `[rail-sync]` in the commit message.

See [docs/GOVHUB-RAIL-SYNC.md](../../docs/GOVHUB-RAIL-SYNC.md) for full workflow, environments, and CI rules.

## Other files here

- `about.md`, `acknowledgements.md` — book front matter; not Gov Hub–synced rails.
- `DP-TEMPLATE.md` — authoring template for new chapters; not a live rail.

## Emergency override

Local edits to `dp*.md` are blocked by CI unless the PR is labeled `rail-sync` or the commit message contains `[rail-sync]`. For a one-off manual fix:

```bash
ALLOW_RAIL_EDIT=1 git commit ...
```

Use sparingly — the next sync from Gov Hub will overwrite unsynced edits.
