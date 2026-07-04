# Desirable Properties Book (`book.desirableproperties.org`)

Open-access BRC333 book satplication — same pattern as `BRC333/projects/metaweb-book-ordinal/`.

## Reader & cover

- **`viewer.htm`** — full book reader: 22 chapters (DP1–DP22) across 7 parts,
  mobile-responsive sidebar TOC, dark/light theme, Local/Inscribed mode toggle,
  smart-tag DP references (`DP1` inline becomes a clickable link), keyboard nav,
  bookmark via `#ch=dp-N`, JSON-LD book schema, and an inscription rail at the
  end of each chapter.
- **`index.html`** — cover landing page. Tap the cover or the start button to
  open the reader at the first chapter.

The reader is a single self-contained HTML page that loads its chapter content
from `assets/data/desirable-properties.json` (top-level) and `assets/data/dp{n}.json`
(provenance, alignments, clarifications, extensions).

## Structure

| File / directory | Role |
|------|------|
| `index.html` | Cover landing (gold-accented SVG cover, opens reader at DP1) |
| `viewer.htm` | Reader: sticky header + sidebar TOC + content area + progress bar |
| `assets/dp-site.css` | Shared layout primitives (container, progress bar, smart tag, rail) |
| `assets/dp-site-nav.css` | Sticky brand header (rebranded from metaweb-site-nav.css) |
| `assets/dp-site-nav.js` | Brand header behavior (theme toggle, profile dropdown) |
| `assets/dp-loading.js` | Spinner primitive (rebranded from metaweb-loading.js) |
| `assets/dp-dropdown-position.js` | Profile dropdown positioning (rebranded from auth-dropdown-position.js) |
| `assets/format-markdown.js` | Inline/block markdown + DP-tag smart-link renderer |
| `assets/profile-icon.svg` | Default profile avatar |
| `assets/favicon.svg` | Gold DP-mark favicon |
| `assets/data/desirable-properties.json` | Top-level book data (chapter titles, descriptions, elements) |
| `assets/data/dp1.json` … `dp22.json` | Per-DP provenance (alignments / clarifications / extensions) |
| `json/desirableproperties-book-manifest.json` | Web manifest (7 parts, 22 chapters, inscription IDs) |
| `json/graph-snapshot.json` | BRC333 §6.2 graph snapshot (placeholder — see BRC333 project) |
| `nginx/book.desirableproperties.org.conf` | nginx vhost (port 80/443, ordinals proxy, asset caching) |
| `deploy.sh` | Deploy script (rsync to `/var/www/desirableproperties-book/`) |
| `install-infra.sh` | First-time server setup (nginx, certbot) |

## Inscriptions (existing — no new inscribe for chapters)

- **Cover:** `64a9550abc8cb51d9825caf111f1477676cb69cd8ffde1fcddff12fcf12b9829i0`
- **ML-Draft-026:** `5d2d3082519f1b599c2c128072bbb25b15388c5dfdede1370286b395f085376ai0`
- **DP1–DP22:** from `challenge-site/src/data/dp-inscriptions.json`

The reader renders the inscription ID at the end of each chapter as a clickable
ordinals.com link. Local mode reads from the JSON files; Inscribed mode is a
banner hint that the canonical reference is the on-chain inscription.

## Reader features

- **Sticky brand header** with site name + avatar dropdown (theme toggle, profile).
- **Sidebar TOC drawer** — responsive: persistent on desktop, slide-in drawer on mobile.
- **Seven parts** (I–VII), each grouping the relevant DPs:
  - I — Trust & Agency (DP1–DP3)
  - II — Sovereignty & Privacy (DP4–DP6)
  - III — Interoperability & Communities (DP7–DP9)
  - IV — Learning & Multi-Modal Experience (DP10, DP21)
  - V — AI Governance & Safety (DP11–DP13)
  - VI — Trust, Sustainability & Feedback (DP14–DP20)
  - VII — Memory Stewardship (DP22)
- **Smart tags** — `DP1`, `DP2` … inline become clickable links that jump to the
  referenced chapter.
- **Reading progress bar** (top of header) + chapter label ("page X of 22").
- **Inscribed / Local mode toggle** — currently Inscribed mode shows a banner
  surfacing ordinals IDs; Local mode is the default (reads JSON files).
- **Bookmark support** — `#ch=dp-N` URL hash jumps directly to that chapter.
- **Keyboard navigation** — `←` / `→` between chapters.
- **Dark + light themes** — `data-theme` attribute with CSS variables; persisted in `localStorage`.
- **Mobile-safe-area padding** (`env(safe-area-inset-*)`).
- **JSON-LD Book schema** for SEO.

## Preview (BRC333 hub)

```text
https://app.brc333.xyz/preview.html?path=/projects/desirableproperties-book-ordinal/preview.html
```

Or direct with local config:

```text
https://app.brc333.xyz/projects/desirableproperties-book-ordinal/logic.htm?localSources=1&localFiles=1
```

## Deploy site

```bash
./deploy.sh
sudo certbot --nginx -d book.desirableproperties.org   # first time only
```

## Brand

- **Accent:** gold (`#d4af37`, hover `#e8c468`) — per the corrected brand palette.
- **Background:** deep navy/charcoal (`#0d1117` dark, `#f6f8fa` light).
- **Book pages:** warm off-white (`#f6f8fa`) with serif-free body — readable on both themes.

## Category parts (TOC-only)

Seven parts in `json/desirableproperties-book-manifest.json` → `parts`. Part VII is
**Memory Stewardship** (DP22). No extra ordinals for dividers.