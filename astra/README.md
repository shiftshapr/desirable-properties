# Astra editorial corpus

Immutable release folders consumed by the challenge-site **Astra** workgroup tab.

## Layout

```
astra/releases/<releaseId>/
  manifest.json
  dp01/chapter.md
  dp01/chapter.json
  ...
```

## Active release

Set `ASTRA_RELEASE_ID` in the challenge-site environment (defaults to `2026-09-05-r1`).

## Verification

From `challenge-site/`:

```bash
node scripts/verify-astra-release.mjs
```

Replay checks: final ranges match `chapter.md`, hashes match manifest, overlapping ranges rejected.

## Adding a chapter

1. Add `dpNN/chapter.md` and `dpNN/chapter.json`.
2. Update `manifest.json` chapter entry to `"status": "available"`.
3. Run the verify script before deploy.
