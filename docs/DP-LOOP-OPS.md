# DP loop operations (context + checklist)

Living operator file for the Desirable Properties governance loop. Keep this current; it is the
context an agent reloads before touching the loop.

## The loop

```
Propose (book Canopi Patch/Insert, Deepi, or Gov Hub draft patch)
  → Weigh in (workgroup members: yes/no + comment on Review tab)
  → Promote (coordinator: Gov Hub accept → unpublished working revision)
  → Publish (coordinator: working revision → next approved ML-Draft revision)
       ├─ Dashboard 1: rail sync → content/local/dpN.md → staging book → prod book
       │               → BRC333 web rails (localOverride) … on-chain reinscription is a later, separate job
       └─ Dashboard 2: generate-ml-reqs → unpublished ML-REQ working set (canonical:false)
                       → chairs publish ML-REQ-NNN → ML-ADR (surfaces) → Overweb coding (repos/CI)
```

Promote and Publish are two clicks. Synthesize is neither; it is advisory input.

## Dashboards

1. **DP → BRC333 → Book**: per DP, Gov Hub published revision vs rail stamp vs deployed staging/prod
   book vs BRC333 inscribed version; pending proposals / working-revision state.
2. **DP → ML-REQ → ML-ADR → Overweb coding**: per DP, published revision vs the revision the ML-REQ
   working set was generated from; REQ counts (MUST/SHOULD/COULD); chair-published ML-REQ-NNN;
   ADR sketches vs accepted ADRs; code references / CI.

## Checklist

(status: [ ] todo, [~] in progress, [x] done)

- [x] 1. Context file (this) + memory pointer
- [x] 2. Map data sources for every stage (below)
- [x] 3. Snapshot collector `scripts/dp_loop_status.py` → `data/loop/dp-loop-status.json` (gitignored)
- [x] 4. Dashboard 1: `/admin?tab=loop-book` (`LoopBookPanel.tsx`)
- [x] 5. Dashboard 2: `/admin?tab=loop-reqs` (`LoopReqsPanel.tsx`)
- [x] 6. Cron `*/30` `scripts/dp_loop_monitor.py`: Gate-1 fallback regen, collector refresh, Telegram on alert transitions (meta-console alerts.env)
- [~] 7. Canopi book patches → Gov Hub. Intake patch_mode bug fixed in Bridgit-DAO/interface-gov-hub#1. Converter `challenge-site/src/lib/canopi-patch-to-govhub.ts` done + tested; Review "File as Gov Hub patch" route/queue/panel pending (needs permission to read Review store/panel files). Auto-filing under original author needs Canopi user emails (permission denied; user decision).
- [x] 8. Synthesize advisory copy + hidden-modal fix + sign-in gating: Bridgit-DAO/canopi#81 (verify signed-in path on staging after deploy).
- [~] 9. Rail sync verified by dashboard 1 on every run; first real Publish not yet made (no `repository_dispatch` run ever). Stamp-refresh fix lands on next rail-sync after merge.
- [x] 10. Gate 1: `scripts/ml_req_regen_on_publish.py` (rail-sync deploy step + monitor) writes unpublished clones to `overweb/intent/astra/pending/`; `--adopt DPn --human-confirmed` to adopt. Baseline in `data/loop/ml-req-baseline.json`.
- [x] 11. BRC333 on-chain column is "idle" drift from inscribe-api inventory; never part of Publish.

## Findings (2026-09-28)

- All 23 rail stamps lagged Gov Hub by one revision while bodies matched (sync compared stamp-stripped bodies). Fixed: `sync_marker_is_stale()` rewrites stamp-only changes.
- Rails = Gov Hub served bodies = staging = prod book, byte-for-byte (0 body drift).
- 22/22 inscribed chapters are older on-chain than rails (inscribed May–June, pre Gov Hub rev 02); no reinscribe jobs exist.
- Gov Hub publish → `dispatch_dp_rail_sync` has never fired (`repository_dispatch` count 0); no working revision exists; dispatch outcome only goes to app log.
- ML-REQ working sets (Astra `2026-09-05-integrated`) equal what the published Gov Hub text generates for 22/23 DPs. DP1 differs in 5 REQs (Astra carries unpublished DP1 edits) → pending clone opened.
- Canopi intake `/api/internal/canopi/contributions` exists but nothing calls it; it also drops `patch_mode` (inserts would file as replace-of-anchor). 10 Canopi book inserts (DP15×7, DP22×3) are Canopi-only.
- Three DP22 inserts were tagged to viewer/dp01, dp04, dp07 pages (book viewer page identity bug; spun off as separate task).
- Staging challenge-site points at prod Gov Hub (`ecosystem.staging.config.js`), contrary to STAGING.md.
- gov-hub-dev `ml_req_generate.py`: `min_align_sha256_16` hashes the whole body.
- `overweb/intent/plan.md:10` still names the Visibility-tab ADR; superseded by SDK overlay lock.
- canopi-sdk `OVERLAY_CONFORMANCE.md` / `conforming-overlay.ts` untracked, so theoverweb.org `/adrs/sdk/` links 404.

## Open PRs

- shiftshapr/desirable-properties#10: dashboards, collector, Gate-1 hook, monitor, stamp fix
- Bridgit-DAO/canopi#81: Synthesize advisory + UX
- Bridgit-DAO/interface-gov-hub#1: Canopi intake keeps patch_mode

## Staging sandbox (end-to-end rehearsal, built 2026-09-28)

```
staging.desirableproperties.org Review ──► DEV Gov Hub (dev.interfacehub.net, :8001)
   (evals/events → Postgres desirable_properties_staging)        │ Publish
                                                                  ▼
             dispatch_dp_rail_sync → GH_BIN shim (scripts/staging_rail_sync_gh_shim.sh)
                                                                  ▼
             scripts/staging_rail_sync.sh → /home/ubuntu/desirableproperties-book-staging/content/local
                                            (no git commit, never the prod book)
```

| Piece | Where |
| --- | --- |
| Staging site → dev hub | `challenge-site/ecosystem.staging.config.js` `GOVHUB_BASE_URL`, `GOVHUB_INTERNAL_BASE_URL` |
| Staging DB | `.env.local` `DP_DATABASE_URL_STAGING` (snapshot of prod DP Postgres, 2026-09-28) |
| Dev hub seeded from prod | `scripts/govhub_seed_dev_dp_loop.py` (additive; users, layers, DP workgroups, members, chairs, links, proposals; backups `instance_dev/*.backup_pre_dp_loop_seed_*`) |
| Dev publish hook | `gov-hub-dev/.env`: `GOVHUB_DP_RAIL_SYNC_DISPATCH=true`, `DP_RAIL_SYNC_ENV=dev`, `GH_BIN=…/staging_rail_sync_gh_shim.sh`, `CANOPI_SIGNING_SECRET` (dev-only) |
| Evidence | `data/loop/staging-rail-sync-dispatch.json`, `staging-rail-sync-last.json`, `logs/staging-rail-sync.log`; dashboard 1 "Staging sandbox" column = staging book vs dev served rev |
| Web3Auth | dev and prod hub use the same devnet client id, so staging sign-in tokens verify on dev |

Canopi → Gov Hub filing: `scripts/canopi_patch_file_to_govhub.py --env prod|staging --apply` (monitor runs both). Author = Canopi `AppUser.email` → Gov Hub user; inserts anchored on the markup-free edge sentence (must be in Gov Hub plain text *and* verbatim in markdown for Promote to splice). Report `data/loop/canopi-filing-<env>.json` feeds Review ("Filed in another chapter"). 2026-09-28: 10 prod posts filed (DP15 ×7 → ML-Draft-019, DP22 ×3 → ML-Draft-028).

Review findings 2026-09-28: 14 prior pending prod proposals → 7 apply (all splice), 6 needs-review, 1 obsolete; Review now blocks Promote unless Gov Hub applicability = applies. Open policy question: approved co-leads get Review Promote/Publish buttons (Gov Hub `can_edit`) but Gov Hub accept/publish allow only coordinator / approved chair / layer admin / staff.

## Operating

```bash
python3 scripts/dp_loop_status.py --print          # refresh snapshot (≈15 s)
python3 scripts/dp_loop_monitor.py --no-send       # what cron runs, without Telegram
python3 scripts/ml_req_regen_on_publish.py --dry-run
python3 scripts/ml_req_regen_on_publish.py --adopt DP1 --human-confirmed   # chair decision only
tail -f data/loop/logs/monitor.log
```

## Data sources

(filled in as mapped)

### Dashboard 1 stages

| Stage | Source |
| --- | --- |
| Gov Hub revisions / working revision / proposals | prod SQLite `gov-hub-prod/instance/datatracker.db` (opened `mode=ro`): `submission` family by `parent_draft_name`, `status='working'`, `dp_proposal` |
| Served body | `submission.file_path` (under `/home/ubuntu/data-tracker/uploads/`) |
| Rails | `desirableproperties-book/content/local/dpN.md` + `govhub-sync` stamp |
| Rail sync runs | `gh run list -R shiftshapr/desirable-properties --workflow govhub-rail-sync.yml` |
| Deployed books | `https://{,staging.}book.desirableproperties.org/content/local/dpN.md` |
| BRC333 | `desirableproperties-book/json/sources-sat.json` (localOverride) + `http://127.0.0.1:8766/v1/projects/desirableproperties-book-ordinal/inventory` (localDiffersFromSynced, queue) |

### Review / propose stage (challenge-site)

| Piece | Where |
| --- | --- |
| Review queue / eval / pick / publish | `challenge-site/src/app/api/workgroups/[id]/review/{route,eval,pick,publish}` → Gov Hub `/api/doc/draft/<ref>/proposals/…`, `/working-revision/…` (user Bearer idToken) |
| Evals | Postgres `workgroup_review_eval` (item_key `govhub:<id>` / `canopi:<msgId>`); events `workgroup_activity_event` (`review_promote/drop/publish`) |
| Canopi book patches | `GET {CANOPI_API_BASE}/api/messages?communityId=c0f30bc5…&pageId=…` (unauth); dedupe via Gov Hub `source_channel='canopi'` + `external_id` |
| Synthesize judgments | Canopi `anchor_synthesis_judgments`, `/v1/synthesis-judgments` (advisory) |
| DP ↔ ML-Draft | `challenge-site/src/data/dp-ml-draft-map.json` (from `sources-sat.json`) |
| Dashboards host | `/admin?tab=…` (`src/lib/dp-admin-tabs.ts`, `DpAdminClient.tsx`, `requireDpAdmin()`) |

Finding: `ecosystem.staging.config.js` sets `GOVHUB_BASE_URL=https://interfacehub.net` (prod) while `STAGING.md` says staging uses dev hub.

### Dashboard 2 stages

| Stage | Source | Notes |
| --- | --- | --- |
| ML-REQ working sets | `/home/ubuntu/overweb/intent/astra/dp{1..23}-reqs.json` + `index.json` (repo Bridgit-DAO/overweb-intent) | schema `ml-req-working-set/v1`, all `canonical:false,status:working`; 147 REQs / 286 MUST |
| Generator | `gov-hub-dev/scripts/generate-ml-reqs` → `services/ml_req_generate.py` | default input Astra `2026-09-05-integrated`, overwrites in place; `diff_req_sets()` exists but unused |
| Provenance | working set `source.{release,path,body_sha256_16}` | no Gov Hub revision id / timestamp; bug: `min_align_sha256_16` hashes full body (line ~458) |
| Candidate packages | `GET/POST /api/doc/draft/<ref>/req-packages/` (`routes/dp_proposals.py:638`) | status `candidate` only, no pick/promote endpoint |
| Chair-published ML-REQ-NNN | Gov Hub `doc_type=req` submissions | none published; meta-console YAML ML-REQ-004..008 are local drafts (number collision risk) |
| ML-ADR | sketches in working sets (18 ids); accepted only in meta-console YAML (ML-ADR-003, -005) | NEXT-CANOPI-ADR.md = operator-locked SDK overlay sketch (DP8-REQ-01, DP2-REQ-06, DP1-REQ-02) |
| Overweb coding | canopi-sdk (`OVERLAY_CONFORMANCE.md`, `conforming-overlay.ts` untracked, not pushed), meta-console `estate req verify` | 0 GitHub issues/PRs cite REQs; no Studio gate; `overweb/intent/plan.md:10` stale |
| Public surfaces | theoverweb.org `/reqs/`, `/adrs/` (`scripts/build-ml-catalog.py`), `/dash/` (`scripts/build-sdlc-dash.py`, static, manual) | |

## Log

- 2026-09-28: file created; sources mapped; collector, dashboards, Gate-1 hook, monitor cron built on branch `agent/dp-loop-dashboards`; DP1 regen clone opened.
- 2026-10-05: Canopi Discuss now carries Astra's reconciled set instead of the raw CFI proposals. Posted 95 changes (`cfiPatchId` = `astra:2026-09-05-integrated:<change id>`, source_app `hermes-dp`). The other 22 of Astra's 117 are the 26 existing human Discuss posts, left as-is. Soft-deleted the 197 per-proposal "Astra editorial integrate (P###)" posts from 2026-09-05/06 via `message_deletions`. The 2026-08-24 batch was already deleted on 2026-09-03. Fixed Hermes `contribution-activity.js` to exclude deleted messages (it was counting them). /contribution-activity went from 361 to 149. Backup + undo data: `/home/ubuntu/backups/canopi-astra-cleanup-20261005/`. Gov Hub CFI patch nodes still carry `canopi_message_id` pointing at the deleted posts.
- 2026-10-05 (later): Backdated the 95 Astra Canopi posts to the earliest replaced post (89× 2026-09-06, 2× 2026-09-05); the 3 Gov Hub-sourced changes use their dp_proposal dates and dp04-change-001 the release time. Gov Hub `d4661feaa` (prod `80a3c5e66`) refuses promotes for Astra-covered patches (409) and shows "Superseded by Astra" on /admin/cfi-patches. All 275 CfiProposedPatch nodes now carry `astra_release`/`astra_disposition`/`astra_change_ids`/`astra_discuss_hrefs`. The 197 dead Canopi links moved to `canopi_withdrawn_*`, and `canopi_message_id` was cleared. `dp-memory-graph/scripts/cfi-patches-export.mjs` exports the new fields (uncommitted, alongside pre-existing uncommitted work). The `verify.py prod` failures (/doc/draft/, /documents, /_deploy/status) are a stale endpoint list, not this change.
- 2026-10-05 (review + filer): Gov Hub prod proposals reviewed as daveed via `consider_proposal`/`decline_proposal` (events fired; DB backup in /home/ubuntu/backups/canopi-astra-cleanup-20261005/). Considered: 202ea843, 7f0121ec, 2bc46fdc (Astra-integrated; move to incorporated when a published revision contains them). Declined: 7aecb8d7, eb450977, 4b94d052 (Astra not_integrated) plus 9 DP11 test edits (incl. 121014d7, which was "accepted" but never reached a DP11 file). The Canopi→Gov Hub filer now reads https://api.canopi.live (with an explicit User-Agent for Cloudflare) across both book communities. It skips CFI/Astra posts (`cfiPatchId`) and Canopi posts already decided by an Astra release. Prod dry run: 95 skipped_cfi, 26 skipped_astra, 10 already_filed, 8 would_file, 8 blocked. Filing is paused by `data/loop/canopi-filing.paused` (monitor dry-runs while it exists). Delete it to resume.
