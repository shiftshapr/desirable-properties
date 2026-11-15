# Editions of The Layered Web

The edition is a **record**. Gov Hub holds it; the book repo's manifest is generated from it; every draft
revision, every proposal incorporated into a revision, every inscription record and every PDF carries an
edition, and they must agree. Bridges carry no edition (a bridge pinned to an archived revision can have
that revision's edition looked up; it is never stored on the bridge).

| Edition | Status | What it is |
| --- | --- | --- |
| 0.77 | released | The Introduction and DP1–DP22 text inscribed on Bitcoin in May 2026 |
| 1.0 | released 13 Nov 2026 | The book signed off in four steering stages |
| 1.1 | in progress | Every change since 1.0 |

Rulings: Tension 3 and the Decisions table in [LAYERED-WEB-BRIEF.md](LAYERED-WEB-BRIEF.md); the Gov Hub API
is `GET /api/doc/editions/?work=desirableproperties-book` (contract: `~/handoff/specs/edition-record-contract.md`).

## Two words

- **Stamp = the edition a revision was made for.** Set once, when the revision is created, from the edition
  in progress; never changes. Revisions up to and including the 0.77 one are 0.77, later ones up to the 1.0
  release are 1.0, after that 1.1. A proposal takes the stamp of the revision it was incorporated into.
- **List = membership.** An edition lists exact revisions, one per rail. An unchanged chapter is carried
  forward, so the 1.1 list can hold a revision stamped 1.0. Exactly one edition is in progress.

## Files

| File | Written by | What it holds |
| --- | --- | --- |
| `desirableproperties-book/json/editions.json` | rail sync (generated, never by hand) | Each edition: Gov Hub's fields (`editionId`, `label`, `status`, `releasedAt`, `predecessorEditionId`, `decisionRef`, `manifestSha256`) plus `coverImageInscriptionId`; per rail Gov Hub's `railKey`, `mlNumber`, `revision`, `submissionId`, `sha256`, `revisionEdition`, and what only the book repo knows: `localPath`/`localSha256` (the file in `content/local`), `archiveKey`/`archiveRev` (the copy at `/viewer/<key>/<rev>`), `inscriptionId` (only where those exact bytes are inscribed). Top level: `currentEdition` (in progress), `liveEdition` (the label of the live book), `source` (where it came from) |
| `desirableproperties-book/json/editions.source.json` | rail sync | Gov Hub's answer the manifest was generated from (so CI can regenerate it) |
| `json/sources-sat.json` | rail sync adds the stamps | `currentEdition`, `editionsManifest`; per inscription record the hand-recorded facts `inscriptionSha256` (sha256 of the inscribed bytes) and `inscribedRevision` (the Gov Hub revision with those bytes, if any), and the generated `inscriptionEdition`, `inscriptionOnEditionList` (and `inscriptionEditionNote` when no edition can be named) |
| `json/chapter-archives.json` | rail sync adds the stamps | Per archive entry `edition` (its revision's stamp); top level `current_label`, `current_edition`, `current_edition_status` derived from the manifest |

The Edition page has no Gov Hub document: Gov Hub lists it with nulls and the book repo fills its `sha256`
from `content/local/edition.md`. A released edition's entry for it is frozen at the text it had.

The cover image belongs to the edition whose cover it is: `bookCoverInscriptionId` (the 2026 *Layered Web*
art inscribed on 14 Nov 2026) is recorded as Version 1.0's `coverImageInscriptionId`.

The Introduction's inscription (block 950007, 22 May 2026, a near-1.0 draft) is part of 0.77 (owner ruling,
15 Nov 2026). No Gov Hub revision has its bytes, so its 0.77 entry has a null `submissionId` and the
sha256 of the inscribed bytes, like DP22's.

## How it is made

`scripts/govhub_sync_rails_from_hub.py` fetches the edition record **before** touching any rail. If the
endpoint is missing or its answer is malformed (no edition in progress, two in progress, a broken
predecessor line, a rail missing from the list in progress, a stamp later than the list it sits on, an ML
number the book does not map, …) it exits 3 and changes nothing. Otherwise it syncs the rails, generates
the manifest and stamps from Gov Hub's answer plus the rail files, checks that the edition in progress
lists exactly the revisions Gov Hub serves, then writes everything and runs the agreement check.

```bash
python3 scripts/govhub_sync_rails_from_hub.py                       # rails + editions from production
python3 scripts/govhub_sync_rails_from_hub.py --editions-only       # editions from the rails on disk
python3 scripts/govhub_sync_rails_from_hub.py --editions-only \
  --editions-fixture scripts/fixtures/govhub-editions-desirableproperties-book.json   # recorded answer
```

Commit with `[rail-sync]` in the message. The committed manifest is production's. Production Gov Hub has
no editions endpoint until the owner releases it, so it was generated from the recorded fixture
(`source.kind: "fixture"`): its 0.77 list is byte-identical to dev Gov Hub's live answer, and its 1.0 and
1.1 lists are the revisions production serves. The first production run replaces it.

Gov Hub resolves rails per database (dev: book_cover is ML-Draft-054, dp24 ML-Draft-057, no Foreword).
The sync fetches each rail by the document the edition in progress names, skips a rail with no document
there (the book repo fills it from `content/local`), and before writing anything checks that every rail,
fetched or not, holds the revision the edition in progress lists. `manifestSha256` is verified by the
contract's method (rails reduced to `railKey`, `mlNumber`, `revision`, `submissionId`, `sha256`; canonical
JSON); a mismatch is a malformed answer.

## Two environments, kept apart

| | Production | Staging |
| --- | --- | --- |
| Gov Hub | interfacehub.net | dev.interfacehub.net |
| Who generates the manifest | `.github/workflows/govhub-rail-sync.yml` (`--env main`) | `scripts/staging_rail_sync.sh` (`--env dev`) |
| Where it is written | `desirableproperties-book/json/editions.json`, committed with `[rail-sync]` | the staging web root (`~/desirableproperties-book-staging/json/`), never committed |
| Rails it must agree with | the committed `content/local` | the staging root's `content/local`, synced from dev |
| Site API reads | the committed manifest | `BOOK_EDITIONS_MANIFEST` pointing at the staging root's manifest |

Nothing from dev is committed: dev's lists only ever reach the staging root. A staging deploy copies the
repo's book tree (production manifest and rails) into the staging root; the next staging rail sync replaces
both with dev's. Until it has run, the staging root shows production's text and labels.

## What "agree" checks

`scripts/check_editions_agree.py`, run by CI on every pull request and push to staging/main
(`.github/workflows/editions-agree.yml`) and by the rail sync:

1. **One edition in progress**, `currentEdition` is it, and `sources-sat.json` points at the manifest.
2. **Rails:** for the edition in progress, each rail's `localSha256` equals the sha256 of its file in
   `content/local`, and the file's `govhub-sync` marker names the listed submission and revision. For a
   released edition, a rail no longer live must match its archive copy, or be on chain; otherwise it is
   listed as a gap (the text is not kept in the repo).
3. **Archive stamps:** every archive entry has `edition` equal to its revision's stamp, its file matches
   its sha256, and `current_label` / `current_edition` match the manifest.
4. **Inscription records:** each has `inscriptionSha256`; `inscriptionEdition` is the edition whose list
   holds those bytes (`inscriptionOnEditionList: true`), or the stamp of the Gov Hub revision with those
   bytes (`false`: a real mismatch, recorded), or unset, listed as a gap, when neither exists; the manifest names an
   `inscriptionId` on exactly the rails whose text those bytes are.
5. **PDFs:** a chapter PDF's Keywords stamp (`dp-edition`, `dp-rail`, `dp-submission`) names a revision on
   a list with that stamp; a book PDF's `dp-edition-rails-sha256` equals the hash of its edition's list.
   PDFs with no stamp are listed as gaps.
6. **Generated, not typed:** regenerating from `editions.source.json` and the repo reproduces
   `editions.json`, the stamps and `current_label` byte for byte, and (in CI) every commit that changed
   the manifest says `[rail-sync]`.

Disagreements fail. Gaps are printed on every run and fail only with `--strict`.

## Readers and API callers

- **Label rule** (the same on Gov Hub, the viewer and the API): a served revision is labelled with the
  newest released edition whose list holds it, else the edition in progress.
- **Book viewer:** with the manifest present, under each chapter: "Version 1.0" while the live revision is
  the 1.0 one, "Version 1.1, in progress" once a later revision is live; in Onchain mode the inscribed text
  is labelled from the manifest ("Version 0.77"); archive pages say
  "a Version 1.0 draft". Without the manifest the viewer behaves as before.
- **Site API** (`/api/steering/<ml>/text`, `/api/workgroups/<id>/review/passages`): with no edition named,
  the live text plus `edition`, `editionStatus`, `editionLabel`, `revision`, `revisionEdition`,
  `submissionId`; `?edition=<id>` returns that edition's text: the live text when it is that
  edition's revision, else Gov Hub `chapter-passages/?edition=<id>`, whose 404s (`EDITION_NOT_FOUND`,
  `NOT_IN_A_BOOK`, `NOT_IN_EDITION`) are passed on; an answer naming another revision is refused (502).

## Releasing an edition's PDFs

**Everything is automatic.** When Gov Hub releases an edition, the backend job on the box that serves the site
(`scripts/edition_pdfs.py run`, on a 15-minute timer) builds its PDFs, runs the gate, and publishes them by one
atomic step in Gov Hub. No commit, no push, no person. The sites ask Gov Hub what is latest.

1. **Build** (`scripts/v1-book-pdf/build.mjs --edition <id>`): the book and one PDF per chapter, exactly from the
   edition list. Every rail's text is the listed revision (Gov Hub `chapter-passages/?edition=` cross-checked with
   the stored `<hub>/doc/draft/<submissionId>.txt`, whose sha256 must equal the list's); the Edition page is the
   list's book-repo file (or its version in git history). Nothing names an edition or assumes the rail set: the
   chapters, their order, the Contents, page numbers, titles, the edition-page line ("<label> · built <date> from
   the <label> edition list") and file names come from the list. Images referenced by an inscription print the
   site's higher-resolution copy of the same picture where one was shown to match (`SHARPER_COPIES`), else the
   inscribed bytes. The edition in progress builds a preview instead (`edition_pdfs.py preview`): its title page
   and every page footer say "<label>, in progress, built <date>, not a released edition", written to
   `<store>/previews/`, which nothing serves or links.
2. **Gate** (all machine-checked; the first failure names its check):
   - `sources`: every source text's sha256 equals the edition list's;
   - `pdf`: each PDF opens and parses, fonts are embedded, every referenced image is present at a sane size and
     placed;
   - `text`: each part's text in the book, and each chapter PDF's, equals the listed revision word for word after
     normalisation (lowercase letters and digits only; the builder's template lines such as "Read, annotate and
     discuss this chapter online" removed), nothing missing, nothing extra;
   - `structure`: every rail once, in list order; Contents numbers equal the real page numbers (as computed and as
     printed); no blank page except before a part or after the edition page; no page holding only a heading or a
     closing note; no text outside the printable area;
   - `stamps`: the book's edition, rails hash and manifest hash; each chapter's edition, rail and submission;
   - `sanity`: page count within 0.5–2.5× and file size within 0.3–3.5× of the predecessor edition's book, else the
     reason is printed and nothing publishes;
   - `links`: internal links resolve (stop); external links answer (warning only, listed in the record).
3. **Store**: `<store>/<edition>/book.pdf` and `<rail>.pdf` with `SHA256SUMS`, read-only, never overwritten.
   Store: production `~/dp-edition-pdfs/store` on box #1, staging `~/dp-edition-pdfs-staging/store` on box #2
   (outside any checkout and outside the `rsync --delete` deploy targets `~/desirable-properties` and the book roots).
4. **Publish**: `flask book-editions pdf-publish` in Gov Hub (the same host, no HTTP write, no secret) flips the set
   to `published`: from that moment `GET /api/doc/editions/pdfs/` names it `latest`.
5. **Check from outside**: every URL answers 200 with the recorded sha256 and the edition stamp; if not,
   `pdf-unpublish` rolls back (the previous edition is latest again) and the reason is recorded.
6. **Archive copy**: one copy of each released edition's published files goes into the repo at
   `desirableproperties-book/downloads/editions/<edition>/` (`SHA256SUMS`, `record.json`), committed by the
   `edition-pdf-archive` workflow through the rail sync's automated-commit route (its deploy key, a `[rail-sync]`
   commit), dispatched by the job and retried hourly until it is there. It is never what is served, never blocks or
   undoes a publish, and its state (`pending | committed | failed`) is in Gov Hub's record. CI refuses any change to
   an existing edition's folder; the agreement check compares each committed file's sha256 with Gov Hub's record.
   Version 1.0's archive copy was committed with this change (built from the production 1.0 list on 15 Nov 2026,
   gated); on its first run the production job rebuilds 1.0 from the same list and build date, gates it, and, when
   the archived files say the same word for word, publishes those very files ("adopt"), so the archive and the
   store are one set. Until a box's job has published an edition, the site serves the archived files and offers
   the newest archived edition (a last-resort fallback, never the normal path).
   Size: about 38 MB per edition (book ~16 MB, 24 chapters ~22 MB), so the repository grows by that much per
   release, forever (PDFs do not delta-compress). The repo uses neither Git LFS nor release assets today; either
   would keep clones small, but the owner asked for a plain folder.

**On failure** nothing flips: the previous edition stays latest and offered; Gov Hub's record shows
`state: "failed"` and the reason, and its `status` lines read "<label> PDFs: not published, gate failed,
<reason>" (the notifier reads them). The job exits non-zero. A re-run after a fix (the next timer tick, once the
list or the builder changes, or `edition_pdfs.py run --retry-failed`) publishes with no further steps.

**Serving and caching** (built once per edition, never generated on request):
- `/downloads/<edition>/<file>`: the stored file, `Cache-Control: public, max-age=31536000, immutable`, a strong
  `ETag` (its sha256), 304 on `If-None-Match`; the saved name carries the edition (`desirable-properties-v1.1.pdf`,
  `dp07-v1.1.pdf`).
- `/downloads/latest/book.pdf`, `/downloads/latest/<rail>.pdf`: 302 to the latest published file,
  `Cache-Control: private, max-age=60`, so "latest" moves within a minute.
- The site and the book viewer get labels and links from Gov Hub through the site (`/api/book/edition-pdfs`,
  `max-age=120`), cached 3 minutes with the last good answer kept, then the job's local copy
  (`<store>/latest.json`); with nothing at all they still offer `/downloads/latest/<rail>.pdf`.
- Cloudflare is in front of both hosts. It caches `.pdf` responses by their headers: an edition file for a year
  (it never changes, so no purge). A `latest` redirect is `private`, so Cloudflare does not keep it (its zone's
  4-hour Browser Cache TTL rewrote a short public `max-age` to 4 hours on staging; it leaves `private` alone). The
  API answer has no file extension and is not cached by Cloudflare. No purge is ever needed.
- Old addresses redirect permanently: `/downloads/desirable-properties-v1.0.pdf` → `/downloads/1.0/book.pdf`,
  `/downloads/dp-v1.0/dpNN-v1.0.pdf`, `/downloads/dp/DPn-0.77X.pdf` and `/downloads/dp/dpN.pdf` →
  `/downloads/1.0/dpNN.pdf`.

**What a person still does: nothing per release.** One-time setup on each box. Staging (box #2) is set up:
the tool folder, the store and the timer. Production (box #1), at the owner's next release of staging to main:
1. `python3 scripts/edition_pdfs.py --env production install` (the builder's node modules and a Python venv in
   `~/dp-edition-pdfs/tool`, the store folder);
2. the timer it prints: `*/15 * * * * ~/dp-edition-pdfs/tool/venv/bin/python ~/desirable-properties/scripts/edition_pdfs.py --env production run >> ~/dp-edition-pdfs/job.log 2>&1`;
3. Gov Hub's release that carries `book_edition_pdf_set` (Gov Hub PRs #155, #157);
4. `gh auth status` working on box #1 for the archive dispatch (Gov Hub already dispatches the rail sync this way);
   the archive workflow uses the rail sync's existing `MAIN_PUSH_DEPLOY_KEY` and fails, naming it, without it.
No nginx change: the site serves the store. No new secret.

## Other PDFs

- Astra's PDFs (`challenge-site/public/downloads/astra/`) are reference material outside editions: Astra's
  2026-09-05 editorial synthesis is not Gov Hub revision text, so no edition lists it.
- The 0.77 inscription PDFs (`docs/dp-pdfs/dpN-<name>.pdf`, `desirable-property-inscriptions.pdf`) carry their
  0.77 stamp, added by `scripts/stamp_pdf_edition.py` (Keywords only, as an incremental update: the original bytes
  stay a prefix and every page's text is checked unchanged).
