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

## PDFs

- `scripts/v1-book-pdf/build.mjs` (the book PDF, and with `--chapters-out` one PDF per chapter) builds an
  edition from exactly its list: each revision's stored text from `<hub>/doc/draft/<submissionId>.txt`,
  checked against the list's sha256 (any mismatch stops the build), split into blocks at blank lines as
  Gov Hub's chapter-passages does; the Edition page from the list's book-repo file. Images referenced by an
  inscription (`/content/<id>`) print the site's higher-resolution copy of the same picture where one was shown
  to match (`SHARPER_COPIES` in build.mjs: About figure 1, DP23, DP24), else the inscribed bytes; the text and its
  links stay exactly as listed. The edition page says "rebuilt <date> from the
  <Edition> edition list"; the book PDF's Keywords carry `dp-edition`, `dp-edition-status`,
  `dp-manifest-sha256` and `dp-edition-rails-sha256`, each chapter PDF `dp-edition`, `dp-rail`,
  `dp-submission`. Version 1.0: `challenge-site/public/downloads/desirable-properties-v1.0.pdf` and
  `challenge-site/public/downloads/dp-v1.0/dpNN-v1.0.pdf`.
- **Chapter downloads follow the edition.** The site's `/dp/<n>` pages and the book viewer's Download button offer
  the newest released edition's chapter PDF: file, URL (`/downloads/dp-v<id>/dpNN-v<id>.pdf`) and label
  ("Download PDF · Version 1.0") all come from `editions.json`. The canonical set is
  `challenge-site/public/downloads/dp-v<id>/`; the book site serves an identical copy in
  `desirableproperties-book/downloads/dp-v<id>/` (the agreement check fails if they differ). When an edition is
  released, its chapter PDFs are built with `build.mjs --edition <id> --chapters-out` into both folders, and the
  links move to them with the manifest. Until then a chapter changed in the edition in progress still offers its
  last released edition's PDF, labelled with that edition.
- The retired "0.77X" composites (`/downloads/dp/DPn-0.77X.pdf` and `/downloads/dp/dpN.pdf`, removed 15 Nov
  2026, kept in git history) redirect permanently to the Version 1.0 chapter PDFs: `challenge-site/next.config.ts`
  for desirableproperties.org, and `desirableproperties-book/nginx/book.desirableproperties.org.conf` (staging:
  `staging.book.desirableproperties.org.nginx.conf`) for the book host.
- Astra's PDFs (`challenge-site/public/downloads/astra/`) are reference material outside editions: Astra's
  2026-09-05 editorial synthesis is not Gov Hub revision text, so no edition lists it.
- `scripts/stamp_pdf_edition.py` stamps an existing PDF whose text is exactly a revision on an edition
  list: Keywords only, as an incremental update (the original bytes stay a prefix; page text is checked
  unchanged). Owner rule: stamp proven matches first; rebuild the rest from an edition's list only where
  the builder can get that exact text (a released edition: from production Gov Hub's `?edition=` routes,
  after release); leave the rest untouched.
