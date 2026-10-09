# DP loop handoff (as of 2026-10-09)

Orientation for a new session picking up the DP governance-loop thread. Read this first, then
[DP-LOOP-OPS.md](./DP-LOOP-OPS.md) (living checklist, data-source map, dated log).

## What the thread is about

Make the Desirable Properties loop work end to end and keep it observable:

```
Propose (Canopi book Patch/Insert, Deepi, Gov Hub patch)
  → Weigh in (workgroup Review tab: yes/no + comment)
  → Promote (Gov Hub accept → unpublished working revision)      ┐ two people: both co-editors
  → Publish (working revision → next approved ML-Draft revision) ┘ must approve (Oct 2026 rule)
       ├─ govhub-rail-sync → content/local/dpN.md → staging book → prod book
       │    → BRC333 web rails (localOverride). On-chain reinscription is a separate, later job.
       └─ (parked) ML-REQ working-set regeneration → ML-ADR → Overweb coding
```

Synthesize (Canopi Patches tab) is advisory input only; it never promotes or publishes.
Governance rules decided 2026-10-05/06 (two co-editors approve, roles member / co-editor /
coordinator, review_note on every decision) are recorded in the user's memory
`dp-governance-roles-2026-10` and on /process. Do not reintroduce single-person merges.

## ⚠️ Infrastructure moved (2026-10-08) — verify before acting

This VPS (216.238.91.120) no longer runs the loop. On 2026-10-09:

| Service | On this box | Now |
| --- | --- | --- |
| challenge-site prod + staging (pm2 `desirableproperties`, `-staging`) | stopped | behind Cloudflare elsewhere; both answer 200 |
| Gov Hub prod/dev (`datatracker`, `datatracker-dev`) | inactive | interfacehub.net and dev.interfacehub.net answer 200 |
| brc333-inscribe-api | failed | app.brc333.xyz behind Cloudflare |
| Canopi | stopped rollback spares (memory `canopi-moved-off-box`) | prod 40.160.38.189, staging 40.160.38.190 |
| staging book | stale copy | staging.book.desirableproperties.org → 40.160.38.190 |
| DP loop monitor cron | commented out `# MOVED-OFF 2026-10-08 (staging now on box #2)` | presumably box #2; **not confirmed** |

Migration artifacts: `/home/ubuntu/migration-metaweb-20261008T224227Z/`, `/home/ubuntu/migration-crontab.bak-20261008T*`.
This session could not SSH to the new boxes (no key). First job for a new session: find out which
box runs the monitor, the rail-sync deploy target, Gov Hub prod/dev and the staging sandbox, and
update the host-specific paths below (`/home/ubuntu/...`, `127.0.0.1:8000/8001`, `GH_BIN` shim,
staging book dir). The last monitor run on this box was 2026-10-08T23:00Z.

## What is built and working

All code is merged to `main` of shiftshapr/desirable-properties unless noted.

**Dashboards** (`/admin` → *DP loop*, admin only; PR #10)
- `?tab=loop-book`: DP → Gov Hub served revision → rail → staging sandbox → prod book → BRC333 web → BRC333 on-chain.
- `?tab=loop-reqs`: DP → ML-REQ → ML-ADR → code (parked, but live).
- Data: `scripts/dp_loop_status.py` (read-only collector) → `data/loop/dp-loop-status.json` (gitignored);
  `GET/POST /api/admin/loop-status`. The collector reads the Gov Hub SQLite files and local paths
  directly, so it must run on the box that holds Gov Hub.

**Monitor** `scripts/dp_loop_monitor.py` (was cron */30 here): Canopi filing (prod + staging),
staging rail sync fallback, ML-REQ regen fallback, collector refresh, Telegram on alert
transitions (meta-console `~/.config/meta-console/alerts.env`).

**Rail sync** (`scripts/govhub_sync_rails_from_hub.py`, workflow `.github/workflows/govhub-rail-sync.yml`):
stamps now refresh on stamp-only changes. Last snapshot: 0 rail drift, 0 stale stamps, 0 prod drift.

**Canopi → Gov Hub filing** `scripts/canopi_patch_file_to_govhub.py` (PR #11, then fixes `95dbd69`, `19d1006`):
files Canopi book patches through Gov Hub's signed intake under their authors (Canopi email → Gov Hub user),
anchoring inserts on a markup-free sentence so Promote can splice. Reads https://api.canopi.live,
skips Astra/CFI posts. Last prod run (2026-10-08): 26 already filed, 95 skipped CFI, 26 skipped Astra,
**3 blocked**. **Filing is paused**: `data/loop/canopi-filing.paused` exists (monitor only dry-runs).

**Review tab fixes** (PR #11): Promote only when Gov Hub applicability is `applies`; Canopi-only cards say where a
patch was filed or why not.

**Staging sandbox** (PR #11, built 2026-09-28, on this box): staging site → DEV Gov Hub + Postgres
`desirable_properties_staging`; DEV Publish → `GH_BIN` shim → `scripts/staging_rail_sync.sh` → staging book only.
Backend E2E passed 2026-09-28: a Canopi DP15 insert was promoted and published as dev rev 04, and the staging book
updated while prod was untouched (staging book still serves DP15 rev 04). Details in DP-LOOP-OPS.md *Staging sandbox*.
**Its wiring is host-specific and likely broken by the move.**

**Gate 1 ML-REQ hook** `scripts/ml_req_regen_on_publish.py`: publish → unpublished clone in
`/home/ubuntu/overweb/intent/astra/pending/`. One clone is open (DP1, 5 changed REQs vs published text), still uncommitted
in the overweb-intent repo.

## Open items (priority order)

1. **Re-home the loop after the migration.** Confirm where the monitor cron, collector, rail-sync deploy
   (workflow SSH target `secrets.HOST`), Gov Hub DBs and staging book live, and fix paths in
   `dp_loop_status.py`, `dp_loop_monitor.py`, `staging_rail_sync*.sh`, `canopi_patch_file_to_govhub.py`,
   `govhub_seed_dev_dp_loop.py`. Re-enable the monitor cron on the right box.
2. **Staging sandbox after the move.** Check staging site still points at DEV Gov Hub with the staging DB
   (`ecosystem.staging.config.js`, `.env.local` `DP_DATABASE_URL_STAGING`), DEV Gov Hub `.env` still has
   `GOVHUB_DP_RAIL_SYNC_DISPATCH`, `DP_RAIL_SYNC_ENV=dev`, `GH_BIN` shim, `CANOPI_SIGNING_SECRET`, and the shim's
   staging-book path is valid on the new box.
3. **UI run-through on staging, signed in** (never done): staging.desirableproperties.org → a DP workgroup → Review:
   vote, approve as both co-editors, Promote, Publish; confirm the staging book and the Book dashboard update.
4. **First real prod Publish** has still not happened (no `repository_dispatch` rail-sync run ever). Watch the
   Book dashboard and the workflow run when it does.
5. **Canopi filing**: decide whether to resume (delete `data/loop/canopi-filing.paused`) and resolve the 3 blocked
   posts (`data/loop/canopi-filing-prod.json` has the reasons).
6. **Stale proposals**: alert "Proposals pending over 7 days: ML-Draft-019, ML-Draft-028" (the filed DP15 / DP22
   Canopi inserts). These need co-editor decisions.
7. **Open PRs:**
   - Bridgit-DAO/interface-gov-hub#1: Canopi intake keeps `patch_mode`. Not urgent, because the filer always
     sends `replace`, but needed before anything else calls the intake.
   - Bridgit-DAO/canopi#81: Synthesize advisory copy, closed editor modal hidden, Save/Approve gated on sign-in.
     The signed-in path is unverified.
8. **Book viewer tags Canopi posts to the wrong chapter**: 3 DP22 inserts were posted from the dp01, dp04 and dp07
   pages. It was spun off as a separate task; no fix is visible in git. Check `desirableproperties-book/viewer.htm`.
9. **BRC333 on-chain**: all inscribed chapters are older than the rails, and no reinscribe jobs exist. This is a
   later step and not part of Publish. The collector reported "inscribe-api inventory: connection refused" because
   the service moved.
10. **Parked by the user: ML-REQ → ADR → Code.** DP1 clone awaiting chairs; no ML-REQ-NNN published; generator
    `gov-hub-dev/services/ml_req_generate.py` is uncommitted local work (and `min_align_sha256_16` hashes the whole
    body); `overweb/intent/plan.md:10` stale; canopi-sdk overlay files untracked.

## Housekeeping left on this box

- Worktrees: `/home/ubuntu/canopi-agent-synth` (PR canopi#81) and `/home/ubuntu/gov-hub-agent-intake`
  (PR interface-gov-hub#1; holds a git-ignored copy of the dev `.env`). Remove once their PRs merge or close.
- Dev Gov Hub seed backups: `gov-hub-dev/instance_dev/datatracker_dev.backup_pre_dp_loop_seed_*` (4 files).
- Scratch build output: `challenge-site/.next/loop-check/`.

## Key files

| What | Path |
| --- | --- |
| Living ops doc | `docs/DP-LOOP-OPS.md` |
| Collector / monitor | `scripts/dp_loop_status.py`, `scripts/dp_loop_monitor.py` |
| Canopi filer | `scripts/canopi_patch_file_to_govhub.py` (+ `challenge-site/src/lib/canopi-patch-to-govhub.ts`, tests) |
| Staging sandbox | `scripts/govhub_seed_dev_dp_loop.py`, `scripts/staging_rail_sync.sh`, `scripts/staging_rail_sync_gh_shim.sh` |
| Gate 1 | `scripts/ml_req_regen_on_publish.py` |
| Dashboards | `challenge-site/src/app/admin/Loop{Book,Reqs}Panel.tsx`, `src/app/api/admin/loop-status/route.ts` |
| Review | `challenge-site/src/lib/workgroup-review-queue.ts`, `src/lib/canopi-filing-report.ts`, `src/components/workgroup/WorkgroupReviewPanel.tsx` |
| Process (user-facing) | `/process`, `challenge-site/src/data/dp-process.ts`, `docs/DP-PROCESS-GUIDE.md` |
