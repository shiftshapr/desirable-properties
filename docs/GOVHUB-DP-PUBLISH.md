# Publishing DP chapters to Gov Hub

How the local book chapters in `desirableproperties-book/content/local/dpN.md` get published
to Gov Hub as new draft revisions, and how to audit sentence-level patches afterwards.

Scripts live in `scripts/`:

| Script | Purpose |
| --- | --- |
| `govhub_publish_dp_revisions.py` | Publish `content/local/dpN.md` as a new Gov Hub revision per DP |
| `govhub_port_draft_prod_to_dev.py` | Copy one approved draft family from PROD to DEV (unblocks DEV-only gaps) |
| `govhub_patch_applicability_audit.py` | Report whether existing patches still anchor to the new chapter text |

## Environments

| | Host | Port | Flask env | SQLite |
| --- | --- | --- | --- | --- |
| DEV | `dev.hub.themetalayer.org` | 8001 | `development` | `gov-hub-dev/instance_dev/datatracker_dev.db` |
| PROD | `hub.themetalayer.org` | 8000 | `production` | `gov-hub-dev/instance/datatracker.db` |

Both run as user systemd units: `datatracker-dev.service` and `datatracker.service`.

> The DEV service holds the SQLite file open in WAL mode. Never swap the `.db` file
> underneath a running service — stop the unit first, remove `-wal`/`-shm`, restore, then start.
> Swapping it live corrupts the database.

## Revision model

A revision is a **new `Submission` row**, not an edit of the existing one. History is preserved.
Each revision carries:

- `is_revision = True`
- `parent_draft_name` → the parent submission's `draft_name`
- `revision_number` → zero-padded, incremented within the family (`01`, `02`, …)
- `what_changed` → free-text note (the publish script records the source path here)
- its own `draft_name`, `content_hash`, `pages`, `words`, and uploaded file

The parent must be **approved**; Gov Hub refuses revisions on a `submitted` parent.

Uploads accept `.txt`, `.pdf`, `.xml`, `.doc`, `.docx` — not `.md`. The publish script copies each
chapter to a uniquely-named `.txt`. Gov Hub's text extractor detects markdown in `.txt` and
renders it correctly, so the payload stays byte-identical to the source `.md`.

## Publishing

Dry run first — it prints the resolved parent and next revision number per DP without writing:

```bash
cd /home/ubuntu/desirable-properties
python3 scripts/govhub_publish_dp_revisions.py \
  --govhub-root /home/ubuntu/gov-hub-dev \
  --flask-env development \
  --dry-run
```

Then publish. `--approve` marks each new revision `approved` and carries the parent's `ml_number`
across, which is what makes it the served body:

```bash
python3 scripts/govhub_publish_dp_revisions.py \
  --govhub-root /home/ubuntu/gov-hub-dev \
  --flask-env development \
  --what-changed "Refreshed from content/local (book working copy)" \
  --submitted-by "book-pipeline" \
  --approve
```

Useful flags: `--only dp13,dp22` to scope to specific DPs, `--content-dir` / `--sources-sat` to
point at a different working copy. DP→ML-Draft mapping is read from `sources-sat.json`
(`railKey` → `mlNumber`); the script never invents ML numbers.

Without `--approve`, revisions land as `submitted` and need admin approval in the Gov Hub UI.

### If a draft exists on PROD but not DEV

DP23 (`ML-Draft-030`) hit this: approved on PROD, absent from DEV, and an unrelated DEV test row
was squatting on the same ML number with status `submitted`. Port just that family:

```bash
python3 scripts/govhub_port_draft_prod_to_dev.py --ml ML-Draft-030 --clear-conflicting-ml
```

This copies the root submission, its revisions, and the upload files, backs up the DEV database
first, and blanks `ml_number` on conflicting **non-approved** DEV rows. It does not wipe DEV.

### Manual fallback

If the scripts can't be used, per DP: open the draft in Gov Hub → **Submit revision** →
upload `content/local/dpN.md` renamed to `.txt` → set "what changed" → submit → approve as admin.
The ML number and workgroup are inherited from the parent.

## Verifying a publish

Byte-comparison against the stored upload is the reliable check. Comparing rendered HTML to raw
markdown produces false negatives, because `&` becomes `&amp;` and `**bold**` is rendered away.

```bash
python3 - <<'PY'
import json, pathlib, sqlite3
BOOK='/home/ubuntu/desirable-properties/desirableproperties-book'
srcs={s['railKey']:s for s in json.loads(pathlib.Path(BOOK+'/json/sources-sat.json').read_text())['sources']}
con=sqlite3.connect('file:/home/ubuntu/gov-hub-dev/instance_dev/datatracker_dev.db?mode=ro',uri=True)
by_ml={r[0]:r for r in con.execute("SELECT ml_number,file_path FROM submission "
       "WHERE is_revision=1 AND what_changed LIKE '%content/local%'")}
for n in range(1,24):
    s=srcs['dp%02d'%n]
    local=pathlib.Path(BOOK+s['localOverride']).read_bytes()
    stored=pathlib.Path(by_ml[s['mlNumber']][1]).read_bytes()
    print(f"DP{n:<3} {s['mlNumber']:<13} identical={stored==local}")
PY
```

`content_hash` is **not** a plain `sha256` of the file — Gov Hub hashes normalized extracted text
via `services.submission_dedup.compute_content_hash_for_file`. Use that function to re-verify.

### Which body a read URL serves

An ML number names the **document**, so it serves the newest approved revision. A `draft_name`
or submission id names **one stored row**, so it serves exactly that body.

| URL | Body served |
| --- | --- |
| `/doc/draft/<ml_number>/read/` | Newest approved revision in the family |
| `/doc/draft/<revision_draft_name>/read/` | That revision |
| `/doc/draft/<parent_draft_name>/read/` | Rev 00, the original |

The reader toolbar names the revision on screen and links to `/doc/draft/<ref>/revisions/`.

Earlier builds served the Rev 00 parent body for the ML-number URL, so notes written before
2026-08-01 may still say to link readers to the revision `draft_name`. Either link works now.

## Patch applicability audit

```bash
python3 scripts/govhub_patch_applicability_audit.py \
  --govhub-root /home/ubuntu/gov-hub-dev \
  --flask-env development \
  --report /tmp/patch_audit.json \
  --markdown docs/GOVHUB-PATCH-AUDIT.md
```

For every `DpProposal` it checks whether the anchor text is present in the Gov Hub body currently
served, in the newest revision, and in the local chapter, then assigns a verdict:

| Verdict | Meaning |
| --- | --- |
| `applies` | Anchor still present in the new chapter text |
| `needs-review` | Anchor exists in an older body only; needs re-anchoring |
| `obsolete` | Anchor absent everywhere in the family |
| `not-a-dp` | Targets a non-DP document; unaffected |

Note that the DEV `dp_proposal` table accumulates fixtures every time the Gov Hub test suite runs
(`test_dp_proposals.py` creates real rows). Filter them out when reading the matrix — they are
recognizable by a `proposed_text` that just appends `Revised.` to the anchor.

### Applicability inside Gov Hub

Gov Hub now computes the same verdict itself and shows it in the UI, so the audit script is a
cross-check rather than the only view:

| Gov Hub label | `classify_proposal_location` | Meaning |
| --- | --- | --- |
| Applies to this text | `current` | Anchor is in the revision being served |
| Needs re-anchoring | `superseded` | Anchor only exists in an earlier revision |
| (hidden) | `bogus` | Anchor exists in no revision; dropped from lists |

Where it shows up:

- `/doc/draft/<ref>/patches/` — a per-patch chip, a per-passage chip, and a tally at the top.
- `/doc/draft/<ref>/read/` — an **N unmatched** toolbar dropdown listing passages that are not in
  the revision on screen, since those patches have no text to highlight.
- `/doc/draft/<ref>/revisions/` — per-revision counts of patches written against that revision.
- `GET /api/doc/draft/<ref>/proposals/` — `applicability`, `applicability_label`,
  `created_on_revision_label` per patch, plus `counts_by_applicability`.

Patches and comments are scoped to the **document family**, not to one revision. A patch is
attributed to the revision whose `content_hash` matches its `content_hash_at_create`, falling back
to the newest revision that existed at `created_at`.

## Promoting to PROD

1. Re-run the publish script with `--flask-env production` and `--dry-run`, confirming the parent
   and next revision number resolved per DP.
2. Back up `instance/datatracker.db`.
3. Publish. Prefer omitting `--approve` so a human approves in the UI.
4. Re-run the patch audit against PROD and re-anchor `needs-review` patches.
5. Sanity-check a few `…/doc/draft/<draft_name>/read/` and `…/doc/draft/<ml_number>/read/` URLs;
   both should show the newest revision in the toolbar chip.
