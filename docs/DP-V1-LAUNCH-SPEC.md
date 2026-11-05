# DP Version 1.0 launch: front matter, PDF, sharing and the home page

Status: draft for owner review, 2026-11-05.
Dates: editorial freeze Mon 2026-11-09 1pm PT; release Fri 2026-11-13.

This spec covers what has to exist on release day, plus the process that keeps the
book's front matter (Acknowledgements, About This Digital Monument, Introduction) in step
with the chapters. Today none of that front matter is maintained by a process:

| Page | Where it lives | Last synced | State |
|---|---|---|---|
| Acknowledgements | `desirableproperties-book/content/local/acknowledgements.md` (Gov Hub ML-Draft-032) | 2026-09-29 | Lists one contributor; "additional contributors will be appended" |
| About This Digital Monument | `content/local/about.md` (ML-Draft-031) | 2026-10-12 | Says "twenty-three Desirable Property chapters"; DP24 now exists |
| Introduction | Inscribed rail ML-Draft-026 (not a local file) | inscribed | Reinscribable; any V1 wording changes go through Gov Hub like the other front matter |
| Cover | `content/local/cover.md` (ML-Draft-033) | – | No version or date line for V1 |

## 1. Front matter process

### 1.1 Acknowledgements (generated, then verified by people)

Rules (owner, 2026-11-02):
- **Editors**: co-editors and steering committee members, listed together.
- **Contributors**: generated from the book itself –
  - proposers whose proposals were approved, revised or merged into the final text;
  - co-editors who held a seat and decided at least one proposal.
- Order: by first contribution date, matching the existing "in order of contribution" framing.
  Vint Cerf stays first as written.
- The page keeps its current prose; only the lists are generated.

Build:
- Gov Hub script `scripts/build_acknowledgements.py` (dry run by default, `--apply`):
  - reads accepted/revised/merged `DpProposal` rows for DP workgroups whose text is in the
    V1 published revision, co-editor seats with at least one decision, and the steering list;
  - writes a block between `<!-- ack:generated:start -->` and `<!-- ack:generated:end -->` in the
    working revision of ML-Draft-032, so the result goes through the usual publish step;
  - prints a diff and a review list: name, display name source, first contribution, DPs.
- Names: the display name on the person's Gov Hub profile; anyone without one is listed in the
  review output, not on the page, until they set one.
- Verification window Nov 11–12: each listed person gets a "check your name" notice (in-app, and
  email from daveed@bridgit.io only, never Gmail; no outreach to excluded people). They can
  correct the spelling or ask to be left off. The script reruns after corrections.
- Final run after steering's last decision on Nov 12; published with the V1 revision.

### 1.2 About This Digital Monument and Introduction (checked, then edited by proposal)

These are prose, so they are not generated. Instead:
- A **front matter check** runs with the rail sync and on the V1 build. It fails when:
  - a chapter count in words or digits disagrees with the number of chapters in V1;
  - a "Version 0.77" style label appears outside a history passage;
  - a link points to a chapter, page or PDF that does not exist in V1.
- Fixes go in as normal Gov Hub proposals on ML-Draft-031 (About) authored as @bridgitdao, for
  steering to approve before the freeze ends.
- Known fixes now: "twenty-three" → the V1 count; mention that this is Version 1.0 and its date.

The Introduction (ML-Draft-026) is inscribed and read from Bitcoin, so the same check reads it
from Gov Hub; a fix means a new revision of ML-Draft-026 and, if wanted, a reinscription.

## 2. The V1 PDF

- One PDF of the whole book: cover, About, Introduction, the chapters in order, Acknowledgements,
  a colophon (version 1.0, release date, Gov Hub revision of each chapter, inscription ids when known).
- Built from the published V1 revisions, not the rails' working text. Reuse
  `scripts/generate-astra-book-pdf.py` (WeasyPrint) with a `--release v1.0` source that reads the
  synced rails after the final sync, plus a table of contents with page numbers and PDF bookmarks.
- Per-chapter PDFs as today, renamed `DP1-1.0.pdf` … to replace the `-0.77X` files.
- File names: `the-layered-web-v1.0.pdf` at a stable URL
  (`https://desirableproperties.org/v1/the-layered-web-v1.0.pdf`) and also linked from the book.
- Checks before publishing: every chapter present, no `**MTP:**` labels, no unresolved
  conflict markers, page count and size printed, SHA-256 recorded in the colophon page of the
  site (not inside the PDF itself).
- Claude does the final style/content pass on the built PDF; the owner signs off.

## 3. Launch page: `/v1`

A permanent page for the release, linked from the home page panel, the book and share cards.

Sections, top to bottom:
1. **Title block**: "The Layered Web: The Desirable Properties of a Meta-Layer – Version 1.0",
   release date, one-sentence description, cover image.
2. **Primary actions**: Read online (book), Download PDF (with size), Share.
3. **What is in V1**: the chapter list (number, title, tagline, Massive Transformational Purpose),
   each linking to its book chapter and its PDF.
4. **How it was made**: short numbers – proposals filed, decided and merged, contributors,
   workgroups, the dates of the process – drawn from Gov Hub at build time and frozen into the page.
5. **Who made it**: Editors and Contributors, the same lists as Acknowledgements.
6. **Onchain**: the inscription status of each chapter, linking to `/onchain`, when inscriptions exist.
7. **What next**: how V1.1 proposals work after release, with a link to Participate.

## 4. Sharing

- Share button opens: copy link, X, LinkedIn, Bluesky, email (a `mailto:` the reader sends
  themselves), and the native share sheet on phones.
- Each chapter gets a share link `/v1/dp/<n>` that redirects to the book chapter and carries its
  own preview card.
- Open Graph and Twitter cards: a generated image per page (cover for `/v1`; chapter number,
  title and Massive Transformational Purpose for each chapter), built with Next's `opengraph-image`.
- Quote sharing: selecting text in the book offers "share this quote" with a link to the anchor.
  Optional for launch; the deep link script (`dp-deep-link.js`) already supports anchors.
- No tracking pixels; count shares on our own server only.

## 5. Home page top panel

Replace the top of the home page on release day (switched by date, so nobody has to deploy at 9am):
Recommendation: the release panel **replaces** the hero for launch week, and the hero returns
below it after that. Two full-height panels stacked make the page start with two competing
headlines; on a phone the release would push the existing hero (and its three buttons) far down,
or the hero would push the release below the fold. One headline – "Version 1.0 is here" – is the
launch. After Nov 20 the panel shrinks to a one-line banner above the hero.

- **Before release** (now → Nov 13 9am PT): the current hero; the countdown overlay that is
  hidden today can show "Version 1.0 releases November 13".
- **Release panel** (Nov 13 → Nov 20): in place of `LayerHero`, a full-width panel –
  - "Version 1.0 is here" with the cover, release date and one sentence;
  - buttons: Read V1, Download PDF, Share;
  - a line of numbers (chapters, contributors, proposals merged);
  - a link to `/v1`.
- The "Current DP Challenge – Version 0.77 is open for review" block becomes "Version 1.0 –
  released November 13" and points to V1.1 participation.
- The hero's version labels and dates read from one constant (`V1_RELEASE_DATE` in
  `data/dp-process.ts`), not from scattered strings.

The book site (`book.desirableproperties.org`) gets the same banner at the top of `index.html`,
with Download PDF and Share.

## 6. Order of work

| By | What |
|---|---|
| Nov 6 | Owner answers the open questions below; acknowledgements script built and run as a dry run on staging |
| Nov 7 | Front matter check in CI; About fix proposals filed as @bridgitdao; `/v1` page and home panel on staging behind the date switch |
| Nov 9 | Freeze. Only steering acts |
| Nov 10 | Share cards and per-chapter links on staging; first full PDF build from staging data |
| Nov 11 | Acknowledgements generated from production; name check notices go out |
| Nov 12 | Final acknowledgements run; final PDF; Claude's final pass; owner sign-off |
| Nov 13 | Releases merged; panel switches on by date at 9am PT |

## Open questions for the owner

1. DP24 is on production as of 2026-11-05 (owner); the book is 24 chapters. Confirm DP24 is in V1
   even though its workgroup has no co-editors yet (steering would approve it).
2. Release panel replaces the hero for launch week (recommended above) – confirm.
3. Should Editors be listed by name only, or name plus the DPs they edited?
4. Which share targets: are X, LinkedIn, Bluesky and email the right four?
5. PDF size: letter, A4, or both?
