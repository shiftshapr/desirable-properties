# Version 1.0 book PDF

`build.mjs` builds the downloadable PDF of *The Layered Web: The Desirable Properties of a Meta-Layer*
(served at `challenge-site/public/downloads/desirable-properties-v1.0.pdf` and linked from `/v1`).

It reads the published text from Gov Hub, the same source as the online book:

| Part | Rail (`desirableproperties-book/json/sources-sat.json`) | Gov Hub draft |
|---|---|---|
| Foreword by Vint Cerf | `foreword` | ML-Draft-057 |
| Preface: About This Digital Monument | `about` | ML-Draft-031 |
| Introduction | `ml-draft-026` | ML-Draft-026, or its Bitcoin inscription when Gov Hub cannot serve it |
| DP1–DP24 | `dp01` … `dp24` | per `sources-sat.json` |
| Acknowledgements | `acknowledgements` | ML-Draft-032 |

The cover is drawn by the script after the 3D cover mockup and saved as flat art (`out/cover.png`, the
trim size at about 384 dpi, or `--cover-png <file>`); the PDF uses that image as its cover page.
`--cover-image <file>` uses other flat art instead. Chapter
illustrations come from `challenge-site/public/images/dps/full/` (1200 px); other figures come
from `desirableproperties-book/content/local/assets/dp/`.

The PDF has a linked table of contents, running heads, roman folios for the front matter and
arabic from the Introduction, PDF bookmarks, in-book links for every `DPn` mention, and a link from each
chapter to its page in the online book.

## Run

```bash
cd scripts/v1-book-pdf && npm install     # once
node build.mjs                            # review copy -> out/desirable-properties-v1.0-review.pdf
node build.mjs --final --out ../../challenge-site/public/downloads/desirable-properties-v1.0.pdf
```

Useful flags: `--offline` (reuse the passages cached in `cache/`), `--only DP1,DP24`,
`--preview 1-8,40,end` (PNGs of pages in `out/preview/`), `--html-only`, `--chrome <path>`.
`out/manifest.json` records the draft and a hash of every rail used, so two runs can be compared.

Needs network access for Gov Hub and Google Fonts, and a Chrome binary (it finds the one Puppeteer
installs under `~/.cache/puppeteer`, or set `CHROME_PATH`).
