# Desirable Properties Icon System — Design Spec

This spec defines the complete DP (Desirable Properties) icon system used across
`desirable-properties.org` and `govhub.live`. It ships 22 SVG glyphs in three
sizes: 24×24 source (editable, themable), 600×600 badge (inscribed-artifact
aesthetic), and 1200×630 cover (workgroup OG image).

---

## 1. Brand & palette

### 1.1 Brand color — gold

The user previously corrected that the project brand is **gold**, not navy.
Gold appears in the badge **container frame** so every DP badge reads as a
gold-framed artifact, even though the glyph itself is family-colored.

| Role                | Hex       | Notes                                       |
|---------------------|-----------|---------------------------------------------|
| Container border    | `#b8860b` | `darkgoldenrod` — outer 4 px frame          |
| Inner wash (fill)   | `#f5e9c8` | cream, applied at **6 % opacity**          |
| Corner chip accent  | `#facc15` | saturated gold — corner dots on the badge   |
| Dark text / labels  | `#1f1b0e` | warm near-black for type on cream washes    |

### 1.2 Family palette — non-gold identity colors

Family colors carry the **identity** of each DP cluster (per the reference
infographic). They appear as: the glyph's accent strokes, the `DPnn` label
corner chip, and the title strip on the cover variant.

| Family        | Hex       | Use             | DPs            |
|---------------|-----------|-----------------|----------------|
| Trust         | `#1d4ed8` | blue            | DP1 – DP7      |
| Governance    | `#d97706` | orange          | DP8 – DP14     |
| Data          | `#0d9488` | teal            | DP15 – DP21    |
| Experience    | `#ef1d18` | red             | DP22           |
| Intelligence  | `#7c3aed` | purple          | *(reserved DP23+)* |
| Resilience    | `#475569` | slate           | *(reserved DP23+)* |

> Note on the JSON ↔ image-spec mapping: the reference infographic defines
> the 4 used families by DP range. JSON `category` fields are 6 broader
> groupings (Authentication, Sovereignty, Interoperability, AI Governance,
> Security, Community). We follow the infographic for family color, since
> that is the canonical "color system" the user signed off on.

### 1.3 Neutrals

| Role          | Hex       | Where                          |
|---------------|-----------|--------------------------------|
| Glyph stroke  | `#1f2937` | neutral charcoal, `currentColor`-able |
| Caption text  | `#6b7280` | family-name captions on badges |
| Page ground   | `#ffffff` | canvas                         |

---

## 2. Source SVG rules (24×24 viewBox)

Every source SVG must follow these hard rules:

1. **viewBox = `0 0 24 24`**. No `width` / `height` attributes on `<svg>`.
2. **Stroke-only glyphs.** No `fill` on the glyph path; use `fill="none"` and
   `stroke="currentColor"` (or explicit `#1f2937`). Strokes are `2 px`,
   `stroke-linecap="round"`, `stroke-linejoin="round"`.
3. **No visible text** in the source. The `<title>` element is screen-reader
   only and contains the DP's full name.
4. **Inner padding 2 px.** Glyphs sit inside the box `(2, 2) → (22, 22)`.
5. **Container first, glyph second.** The container shape is the per-family
   frame (see §3); the glyph sits inside it.
6. **Family color is the accent.** Implemented via a CSS custom property
   `--accent` set on the root `<svg>`. The badge/cover variants override it.
7. **Gold + family color container.** Outer container fill is
   `#f5e9c8` at 6 % opacity; outer container stroke is `#b8860b` (gold);
   the bottom-right corner of the container carries a small family-color
   dot (4 px in source viewBox terms).
8. **All 22 glyphs have distinct silhouettes** — verified by silhouette
   thumbnail test (see §6).

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     style="--accent:#1d4ed8;color:#1f2937">
  <title>DP1 — Federated Authentication &amp; Accountability</title>
  <!-- container (gold) -->
  <rect x="1.5" y="1.5" width="21" height="21" rx="3"
        fill="#f5e9c8" fill-opacity="0.06"
        stroke="#b8860b" stroke-width="1"/>
  <!-- corner accent dot -->
  <circle cx="20" cy="20" r="1.2" fill="var(--accent)" stroke="none"/>
  <!-- glyph strokes -->
  ...
</svg>
```

---

## 3. Per-family container treatment

The container is **per-family distinct** so a viewer can recognize the
family from silhouette alone, even before reading color.

### Trust (DP1–DP7) — double inner stroke

A rounded square (radius 3) with **two parallel strokes** inset by 1 px.
Reads as a shield/seal — appropriate for identity, authentication, and
authority DPs.

### Governance (DP8–DP14) — single bold stroke

A rounded square (radius 3) with a single thicker-looking stroke (1.5 px
in source). Reads as a codex/code-book — appropriate for rule-bound DPs.

### Data (DP15–DP21) — one corner clipped

A rounded square (radius 3) where the **top-right corner is clipped at 45°**
across 3 px. Reads as a data-cube / folder-tab — appropriate for storage,
provenance, and pipelines.

### Experience (DP22) — all four corners clipped

A rounded square with **all four corners clipped at 45°** (2 px). Reads as
an architectural plan or altar — appropriate for civic memory and continuity.

### Intelligence (reserved) — circuit hairlines

A rounded square with a thin internal grid of hairline "circuit" segments
inside the border. Not used in DP1–DP22.

### Resilience (reserved) — infinity-loop motif

A rounded square whose inner stroke is replaced with a stylized infinity
loop along the bottom edge. Not used in DP1–DP22.

All six container variants share the **gold outer frame** and the
**family-color bottom-right corner dot** so the gold brand is constant.

---

## 4. Glyph composition grammar

Every glyph is composed exclusively from **five primitives**:

| Primitive | SVG element         | Meaning                                 |
|-----------|---------------------|-----------------------------------------|
| Circle    | `<circle>`          | entity / actor / node / identity        |
| Arc       | path with `A` command | flow / connection / propagation       |
| Square    | `<rect>`            | container / boundary / vault            |
| Triangle  | `<polygon>` 3-pt    | force / direction / incentive / gravity |
| Dot       | `<circle r≤0.6>`    | event / milestone / instantiation       |

Rules:

- **No literal metaphors.** No shield+check, no book, no temple, no
  dollar sign, no key, no lock, no handshake. Each glyph is an
  **abstract property visualization** built from primitives.
- **Anchor primitive.** Each glyph has exactly one anchor primitive that
  the eye lands on first; the other primitives orbit or support it.
- **Distinct silhouette.** Two glyphs may share primitives but their
  arrangement must be visibly different when reduced to a 32×32 black
  silhouette (see §6 for the test method).
- **Strokes only.** No fills on glyph paths. The corner-dot on the
  container is the single filled element.

---

## 5. Per-DP glyph design rationale

| DP  | Name                                       | Glyph composition                                                              | Rationale |
|-----|--------------------------------------------|--------------------------------------------------------------------------------|-----------|
| 1   | Federated Authentication & Accountability | 4 circles at cardinal points + central diamond                                 | Mutual attestation: four actors surround a shared accountability core |
| 2   | Participant Agency & Empowerment           | Central circle with 4 outward arcs                                              | Agency radiates from the participant outward |
| 3   | Adaptive Governance Supporting an Exponentially Growing Community | 3 nested squares + central triangle                              | Layered governance scales outward from a single decision core |
| 4   | Data Sovereignty & Privacy                 | Square with 4 corner triangles + central dot                                    | Vault with reinforced corners; central dot is the participant |
| 5   | Decentralized Namespace                    | 3 concentric arcs at 90° rotation around a central dot                          | Namespace resolution as orbit, not money |
| 6   | Commerce                                   | 2 circles connected by an arc with 3 event dots between                         | Two parties exchanging through a transactional arc |
| 7   | Simplicity & Interoperability              | 2 overlapping squares + central dot                                             | Two systems overlapping with shared substrate |
| 8   | Collaborative Environment & Meta-Communities | Hexagonal ring of 6 dots + central circle                                       | Six-member community surrounding shared purpose |
| 9   | Developer & Community Incentives           | Triangle with 3 ascending dots inside                                           | Incentive ladder climbing inside a force vector |
| 10  | Education                                  | 2 nested circles with internal arcs flowing outward                             | Knowledge propagating from a teacher outward |
| 11  | Safe & Ethical AI                          | Central circle surrounded by 1 solid arc + 1 dashed arc                         | Dual-bound AI: solid rule + dashed transparency |
| 12  | Community-based AI Governance              | Triangle inscribed in a circle + 3 dots at vertices                            | Community governance at the three corners of the triangle |
| 13  | AI Containment                             | Square frame + central triangle + 4 corner arcs                                 | Boundary with directional containment at corners |
| 14  | Trust & Transparency                       | Central circle with 4 triangles at cardinal points                              | Open four-way trust radiating from a transparent core |
| 15  | Security & Provenance                      | 3 circles connected by an arc (chain)                                           | Content lineage traced through three provenance nodes |
| 16  | Roadmap & Milestones                       | 4 dots connected by a single rising arc                                         | Path of milestones rising toward completion |
| 17  | Financial Sustainability                   | Triangle + inscribed circle + 3 dots along the base                             | Foundation resting on multiple revenue streams |
| 18  | Feedback Loops & Reputation                | 3/4 circular arrow + 3 dots along the arrow                                    | Continuous feedback cycle with discrete touch points |
| 19  | Amplifying Presence & Community Engagement | Central triangle with 4 radiating arcs                                          | Broadcast force vector amplified outward |
| 20  | Community Ownership                        | 4 squares at corners + central circle + connecting arcs                         | Four-participant grid with a shared commons |
| 21  | Multi-modal                                | 3 concentric circles with varying stroke weights                                | Layered sensory modalities stacking on a single node |
| 22  | Civic Memory & Epistemic Continuity        | Infinity loop passing through 3 nested circles                                  | Memory flowing through generations |

---

## 6. Silhouette uniqueness test

After the source SVGs are written, run the silhouette check:

```bash
# from the desirable-properties repo root
python3 assets/dp-icons/scripts/silhouette-test.py
```

The script:
1. Loads each `source/dpNN.svg`.
2. Rasterizes via PIL/CairoSVG at 32×32, black silhouette.
3. Hashes the bitmap and reports duplicate hashes.
4. Writes a 4×6 thumbnail grid PNG to `raster/silhouette-grid.png` for
   human inspection.

Pass criterion: zero duplicate hashes, and visually 22 distinct shapes in
the grid. Any duplicate requires glyph redesign.

---

## 7. Badge variant (600×600)

Each badge (`badges/dpNN.svg`) renders the icon at full 600×600 with:

- 24 px gold outer frame (the inscribed-artifact frame).
- `DP01`–`DP22` label, top-left, family color, **96 px** sans-serif,
  bold.
- Family name, top-right, neutral `#6b7280`, 36 px sans-serif, regular.
- Family-color bottom-right corner dot, 18 px diameter.
- 6 % gold wash behind the icon container (same as source).

Badge is intended for hero placements on each DP landing page. Sized for
screens; legible when scaled to ~200 px.

---

## 8. Cover variant (1200×630)

Each cover (`covers/dpNN.svg`) renders the icon large on the **left half**
and a clean type strip on the **right half**:

- Left half (0 → 600 px): 480 px icon centered.
- Right half (600 → 1200 px): title strip with family color as background
  at 12 % opacity, title text in dark `#1f1b0e`, 64 px sans-serif bold.
- Bottom-left: `DPnn · Family Name` caption in neutral gray, 28 px.
- Gold border around the full 1200×630 canvas, 4 px.

Cover is OG-image aspect and must survive being downscaled to 400×210 in
card previews. The title is the DP's `name` pulled from
`desirable-properties.json` (or `dpNN.json` for DP22 which has its own
file).

---

## 9. File layout

```
desirable-properties/assets/dp-icons/
├── SPEC.md                    # this document
├── source/
│   └── dp{01..22}.svg        # 24×24 source glyph + container
├── badges/
│   └── dp{01..22}.svg        # 600×600 badge with DPnn label
├── covers/
│   └── dp{01..22}.svg        # 1200×630 workgroup cover
├── scripts/
│   ├── silhouette-test.py    # uniqueness check
│   └── rasterize-dp-icons.sh # optional PNG export
└── raster/                    # (optional) generated PNG exports
```

The same tree is mirrored to:

- `gov-hub-dev/static/images/dp-icons/`
- `gov-hub-prod/static/images/dp-icons/`

Deployment sites can rasterize on demand via the included script, or
import the SVGs directly into their existing pipelines.

---

## 10. Open decisions for David

These were decided on David's behalf during implementation; surface in
the PR for review:

1. **Exact gold hex.** Used `#b8860b` (border) / `#facc15` (corner chip)
   / `#f5e9c8` (cream wash). The reference image shows only the family
   palette, not the gold, so a single consistent hex was chosen from the
   plausible gold set.
2. **Font family.** Used the CSS stack `Inter, "SF Pro Text", "Segoe UI",
   system-ui, sans-serif`. Custom font is not required for the icons to
   render correctly; consumers can override the font with their own
   stylesheet.
3. **Commit + push.** Per the workspace commit-after-changes rule, all
   three repos are committed and pushed directly to their default
   branches (`main`, `main`, `production`). No PR opened.