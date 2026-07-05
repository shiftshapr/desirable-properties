# Desirable Properties Icon System — Design Spec (v2)

This spec defines the DP (Desirable Properties) icon system used across
`desirable-properties.org` and `govhub.live`. It ships 22 SVG glyphs in
three sizes: 24×24 source (editable, themable), 600×600 badge (inscribed-
artifact aesthetic), and 1200×630 cover (workgroup OG image).

This is the **v2 redesign**. Compared to v1:

- **Recognizable metaphors** replace abstract five-primitive compositions.
- **Six thematic groups** replace the four ordinal families.
- **2-letter codes** (Au, Ag, Go, …) appear above each title.
- **Gold brand** stays non-negotiable: outer frame + DPnn label are gold.
- **DP22** is renamed to **"Epistemic Continuity & Digital Artifacts"**.

The single design principle: **every glyph must be immediately recognizable
to a stranger at 96×96 thumbnail size**.

---

## 1. Brand & palette

### 1.1 Brand color — gold

Gold is the brand identity of `desirable-properties.org`. It appears
consistently across all 22 badges and covers so a viewer always knows
they are looking at a Desirable Properties artifact.

| Role                | Hex       | Where it appears                                      |
|---------------------|-----------|-------------------------------------------------------|
| Container border    | `#b8860b` | `darkgoldenrod` — outer 6 px frame on the badge       |
| Cream wash (fill)   | `#f5e9c8` | inside the frame, at **4 % opacity**                  |
| DPnn label          | `#b8860b` | top-left of every badge, large bold sans-serif        |
| Group label (cover) | `#b8860b` | small caps under the 2-letter code on the cover       |
| Brand corner mark   | `#b8860b` | small circle bottom-right of every cover              |

### 1.2 Group palette — six thematic groups

The v2 taxonomy groups the 22 DPs into **six thematic groups** rather than
the v1 ordinal families. The groups come from the reference image the user
shared during the redesign. Each group has one accent color used for the
glyph and the 2-letter code.

| Group key | Group label                                   | Hex       | DPs                |
|-----------|-----------------------------------------------|-----------|--------------------|
| Auth      | Authentication, Agency & Accountability        | `#06b6d4` | DP1, DP2, DP3      |
| Sovereignty | Sovereignty & Privacy                        | `#10b981` | DP4, DP5, DP6      |
| Interop   | Interoperability & Participant Experience     | `#d946ef` | DP7, DP8, DP9, DP10, DP21 |
| AI        | AI Governance & Safety                        | `#7c3aed` | DP11, DP12, DP13   |
| Security  | Security, Transparency & Trust                | `#ef4444` | DP14, DP15, DP16, DP17 |
| Community | Community Participation & Feedback            | `#f59e0b` | DP18, DP19, DP20, DP22 |

**Why the change from v1 to v2:**

- v1 used ordinal families (Trust / Governance / Data / Experience /
  Resilience) that conflated unrelated DPs. DP14 ("Trust & Transparency")
  sat in Governance next to "AI Governance", and DP15 ("Security &
  Provenance") sat in Data next to "Roadmap". This was the user's chief
  complaint: "DP14 in Governance and DP15 in Data — wrong."
- v2 groups DPs by **what they are about**, not by ordinal position. The
  six group names match the categories in `desirable-properties.json`
  exactly, so a reader who knows the JSON immediately recognizes the
  grouping on the comparison sheet.

### 1.3 Neutrals

| Role             | Hex       | Where                                   |
|------------------|-----------|-----------------------------------------|
| Page ground      | `#ffffff` | canvas                                  |
| Full title text  | `#1f1b0e` | warm near-black for cover title         |
| Caption text     | `#6b7280` | neutral gray for short titles on badges |

---

## 2. Container — single frame, no family-name caption

Every badge has the **same frame**: a single rounded square with a gold
border. There is no per-family container variant, no corner chip, no
inner group-color frame. Family color appears only on the glyph and the
2-letter code.

```
┌─────────────────────────────────┐
│ DP01                       Au   │  ← DPnn (gold) + 2-letter code (family)
│                                 │
│           ┌─────┐               │
│           │     │               │
│           │ ~~~ │               │  ← 24×24 source glyph in family color
│           │     │               │
│           └─────┘               │
│                                 │
│  ───────  AUTH  ───────         │  ← Group label (gold, small caps)
│  Federated Auth                 │  ← Short title (neutral gray)
└─────────────────────────────────┘
```

Source frame (24×24 viewBox): rounded rectangle at `(1,1) → (23,23)` with
2.4 px corner radius. Stroke `#b8860b`, 0.18 px. Cream wash fill
`#f5e9c8` at 4 % opacity.

Badge frame (600×600): rounded rectangle at `(8,8) → (592,592)` with
14 px corner radius. Stroke `#b8860b`, 6 px. Optional inner border at
`(22,22) → (578,578)` with 8 px corner radius, stroke `#b8860b` at
1.5 px and 35 % opacity (subtle depth).

---

## 3. Glyph philosophy — recognizable metaphors

v1 glyphs were abstract compositions of five primitives (circle, arc,
square, triangle, dot). They were principled but **not recognizable** at
thumbnail size. The user's complaint was direct: "I like the recognizable
ones much better, and I think people getting the badge will appreciate
something recognizable more than something not recognizable."

v2 replaces every glyph with a **literal-but-elevated metaphor**:

- **Recognizable in 1 second** to a person who's never seen the DP system.
- **Distinct silhouette** from the other 21 glyphs at 96×96.
- **Filled or thick-stroked** (2.2 px primary, 1.4 px secondary) — no
  thin hairlines that disappear when scaled down.
- **Single dominant shape** per glyph, with at most 1–2 supporting
  elements. No busy compositions.

### 3.1 Per-DP glyph composition

| DP | Code | Group             | Glyph metaphor            | Recognition note                                     |
|----|------|-------------------|---------------------------|------------------------------------------------------|
| 1  | Au   | Auth              | Fingerprint               | 4 concentric arc ridges + core dot; immediately read  |
| 2  | Ag   | Auth              | Person, arms outstretched  | Head + body + arms forming a "Y" silhouette           |
| 3  | Go   | Auth              | Two interlocking gears     | Big cog (6 teeth) + small cog (4 teeth) meshing       |
| 4  | So   | Sovereignty       | Shield with keyhole        | Classic shield outline + filled keyhole at center     |
| 5  | Ns   | Sovereignty       | Dharma wheel / orbit       | Two concentric rings + 8 spokes + 8 outer nodes       |
| 6  | Co   | Sovereignty       | Shopping cart              | Trapezoidal cart body + two wheels                    |
| 7  | Si   | Interop           | Puzzle piece               | Single piece with one tab + one slot                  |
| 8  | Cm   | Interop           | Network of nodes           | Central node + 6 satellite nodes connected            |
| 9  | In   | Interop           | Rocket                     | Bullet body + porthole + fins + flame                 |
| 10 | Ed   | Interop           | Open book + lightbulb      | Bulb above an open-book shape                         |
| 11 | Ai   | AI                | Brain                      | Two hemispheres + central fissure + lobe details      |
| 12 | Cg   | AI                | Triangle + vertex nodes    | Triangle outline with 3 dots at vertices + 1 center   |
| 13 | Ac   | AI                | Padlock                    | Shackle + body + keyhole                              |
| 14 | Tt   | Security          | Handshake                  | Two forearms meeting, with thumbs wrapping the clasp  |
| 15 | Sp   | Security          | Shield with checkmark      | Shield outline + bold check inside                    |
| 16 | Rm   | Security          | Roadmap with flag          | Dashed winding path + 3 milestones + flag at peak     |
| 17 | Fs   | Security          | Dollar in circle           | Outer circle + vertical bar + S-curve                |
| 18 | Fr   | Community         | Message bubble             | Speech bubble with tail + 3 dots inside               |
| 19 | Ap   | Community         | Megaphone                  | Cone + handle + radiating sound waves                 |
| 20 | Ow   | Community         | Globe with people          | Globe circle + 4 person heads at corners              |
| 21 | Mm   | Interop           | Waveform                   | 6 vertical bars of varying heights                    |
| 22 | Ep   | Community         | Open scroll                | Scroll body + 3 text lines + corner curls            |

---

## 4. DP22 rename — "Epistemic Continuity & Digital Artifacts"

The v1 JSON had DP22 as **"Civic Memory & Epistemic Continuity"**. The
reference image shipped with the v2 redesign renames it to
**"Epistemic Continuity & Digital Artifacts"**. We adopt the reference
image's name (the JSON rename is a separate change tracked outside this
spec).

- Source SVG `<title>`: `DP22 — Ep — Epistemic Continuity & Digital Artifacts`
- Cover title strip: `Epistemic Continuity / & Digital Artifacts`
- Comparison sheet caption: `Epistemic Continuity`
- Short title in badge: `Epistemic Continuity`

---

## 5. 2-letter code system

Each DP gets a 2-letter abbreviation in its family color, displayed
above the title. The codes come from the reference image.

| DP | Code | DP  | Code | DP  | Code |
|----|------|-----|------|-----|------|
| 1  | Au   | 9   | In   | 17  | Fs   |
| 2  | Ag   | 10  | Ed   | 18  | Fr   |
| 3  | Go   | 11  | Ai   | 19  | Ap   |
| 4  | So   | 12  | Cg   | 20  | Ow   |
| 5  | Ns   | 13  | Ac   | 21  | Mm   |
| 6  | Co   | 14  | Tt   | 22  | Ep   |
| 7  | Si   | 15  | Sp   |     |      |
| 8  | Cm   | 16  | Rm   |     |      |

The 2-letter code is rendered:
- 48 px bold sans-serif, top-right of the badge, in family color.
- 64 px bold sans-serif on the cover, in family color.

---

## 6. Source SVG rules (24×24 viewBox)

Every source SVG must follow these hard rules:

1. **viewBox = `0 0 24 24`**. No `width` / `height` attributes on `<svg>`.
2. **Filled shapes for instant recognition.** Strokes are `2.2 px` for
   primary forms, `1.4 px` for secondary detail. No hairlines.
3. **No visible text** in the source. The `<title>` element is screen-reader
   only and contains the DP's full name + 2-letter code.
4. **Inner padding 1 px.** Glyphs sit inside `(2, 2) → (22, 22)`.
5. **Frame first, glyph second.** The frame is the gold rounded square
   (see §2). The glyph sits inside.
6. **Family color is the accent.** Implemented via an inline `fill` or
   `stroke` attribute set to the group hex.
7. **All 22 glyphs have distinct silhouettes** — verified by the
   silhouette test (see §8).

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" role="img" aria-labelledby="t">
  <title id="t">DP1 — Au — Federated Authentication &amp; Accountability</title>
  <!-- container (gold) -->
  <rect x="1.0" y="1.0" width="22" height="22" rx="2.4"
        fill="#f5e9c8" fill-opacity="0.04"
        stroke="#b8860b" stroke-width="0.18"/>
  <!-- glyph (cyan family color) -->
  ...
</svg>
```

---

## 7. Badge variant (600×600)

Each badge (`badges/dpNN.svg`) renders the icon at full 600×600 with:

- White background.
- 6 px gold outer frame (`#b8860b`).
- 1.5 px subtle inner gold border (35 % opacity) for depth.
- `DP01`–`DP22` label, **top-left**, gold `#b8860b`, **64 px** sans-serif
  bold.
- 2-letter code (Au, Ag, …), **top-right**, family color, **48 px**
  sans-serif bold.
- 24×24 source glyph scaled to 480×480 in the center (60 → 540 horizontal,
  150 → 630 vertical).
- Group label, **small caps**, gold, **13 px** sans-serif, letter-spacing
  2.5, centered above the title.
- Short title, **bottom-center**, neutral gray `#6b7280`, **22 px**
  sans-serif, max ~34 chars/line, up to 2 lines.

---

## 8. Silhouette uniqueness test

After the source SVGs are written, run the silhouette check:

```bash
python3 assets/dp-icons/scripts/silhouette-test.py
```

The script:

1. Loads each `source/dpNN.svg`.
2. Rasterizes via cairosvg at 32×32, black silhouette.
3. Hashes the bitmap and reports duplicate hashes.
4. Writes a 4×6 thumbnail grid PNG to `raster/silhouette-grid.png` for
   human inspection.

**Pass criterion:** 22 unique hashes / 22 files, and visually 22 distinct
shapes in the grid. Any duplicate requires glyph redesign.

The current v2 set passes: 22/22 distinct silhouettes.

---

## 9. Cover variant (1200×630)

Each cover (`covers/dpNN.svg`) renders the icon large on the **left half**
and a clean type strip on the **right half**:

- Left half (0 → 600 px): 480 px icon centered, with the gold frame and
  gold DPnn label at the top of the icon.
- Right half (600 → 1200 px):
  - DPnn in gold, 36 px sans-serif bold, top-left of the strip.
  - 2-letter code in family color, 64 px sans-serif bold, below DPnn.
  - Group label, small caps, gold, 14 px, letter-spacing 3.
  - Thin gold divider line below the header.
  - Full title in `#1f1b0e`, 46 px sans-serif bold, wrapped to ≤ 18
    chars/line, up to 3 lines, vertically centered in the strip.
  - Family-color wash at 8 % opacity on the strip background.
- Gold 4 px border around the full 1200×630 canvas.
- Bottom-left: `DPnn · Code · GROUP` caption, neutral gray, 20 px.
- Bottom-right: gold accent dot, 10 px radius.

Cover is OG-image aspect and must survive being downscaled to 400×210 in
card previews.

---

## 10. File layout

```
desirable-properties/assets/dp-icons/
├── SPEC.md                    # this document
├── source/
│   └── dp{01..22}.svg        # 24×24 source glyph + frame
├── badges/
│   └── dp{01..22}.svg        # 600×600 badge with DPnn label
├── covers/
│   └── dp{01..22}.svg        # 1200×630 workgroup cover
├── scripts/
│   ├── silhouette-test.py    # uniqueness check
│   ├── build_dpi_icons.py    # source of truth for all 66 SVGs
│   ├── build-comparison-sheet.py  # rasterizes comparison sheets
│   └── rasterize-dp-icons.sh # bash wrapper for PNG export
└── raster/                    # generated PNG exports
    ├── badge-dp{NN}.png
    ├── cover-dp{NN}.png
    ├── source-dp{NN}.png
    ├── silhouette-grid.png   # 4×6 silhouette thumbnail grid
    ├── comparison-sheet.png  # full badges on dark (v1)
    ├── comparison-sheet-v2.png       # full badges (v2)
    ├── comparison-sheet-source-only.png     # bare glyphs (v1)
    └── comparison-sheet-v2-source-only.png # bare glyphs (v2)
```

The same tree is mirrored to:

- `gov-hub-dev/static/images/dp-icons/`
- `gov-hub-prod/static/images/dp-icons/`

Deployment sites can rasterize on demand via the included script, or
import the SVGs directly into their existing pipelines.

---

## 11. What changed from v1 to v2

| Aspect                       | v1                                   | v2                                          |
|------------------------------|--------------------------------------|---------------------------------------------|
| Glyphs                       | Abstract five-primitive compositions | Recognizable literal metaphors              |
| Container                    | Per-family container variant         | Single frame (no per-family variants)       |
| Group color                  | Carried the badge's identity         | Thematic accent only (gold is the brand)    |
| DPnn label color             | Family color                         | Gold (`#b8860b`)                            |
| 2-letter code                | Not used                             | Displayed above title, in family color      |
| DP22 name                    | "Civic Memory & Epistemic Continuity"| "Epistemic Continuity & Digital Artifacts"  |
| Number of families           | 4 ordinal (Trust/Governance/...)     | 6 thematic (Auth/Sovereignty/Interop/...)   |
| DP14, DP15 family            | Governance, Data (wrong per user)    | Security, Transparency & Trust              |
| Glyph philosophy             | Five-primitive grammar               | "Recognizable in 1 second"                  |
| Background                   | White                                | White (kept) — gold border is the brand     |

---

## 12. Open decisions surfaced in the PR

1. **Group hex codes.** The reference image uses full-saturation neons
   on a dark background; we tuned the hex codes slightly for legibility
   on the white badge background. Specifically:
   - Magenta `#d946ef` (Interop) — picked over `#a855f7` for higher
     contrast against white.
   - Red `#ef4444` (Security) — picked over `#dc2626` for vibrance.
   - Amber `#f59e0b` (Community) — picked over `#fbbf24` for depth.
2. **Font stack.** `Inter, "SF Pro Text", "Segoe UI", system-ui, sans-serif`.
   The icons render correctly without custom font installation.
3. **DP22 rename.** Adopted from the reference image. The underlying JSON
   (`desirable-properties.json`) still has the v1 name; the build script
   overrides it at write time.
4. **Commit + push.** Per the workspace commit-after-changes rule, all
   three repos are committed and pushed directly to their default
   branches (`main`, `main`, `production`). No PR opened.