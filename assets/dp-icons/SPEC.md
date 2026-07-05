# Desirable Properties Icon System — Design Spec (v2)

The v2 DP icon system is designed to **match the visual quality of the
reference infographic**: a dark navy (deep space) canvas, gold outer
frame, group-color inner frame, recognizable metaphor glyphs, and polished
typography with strict consistency across all 22 DPs.

> **Major change vs v1:** v1 used abstract primitive compositions (circles,
> arcs, squares, etc. arranged as glyphs). V2 uses **recognizable metaphors**
> — fingerprint, dharma wheel, brain, megaphone, globe, etc. — drawn as bold
> line-art with selective fills. A stranger should recognize each glyph in
> under a second.

---

## 1. Brand & palette

### 1.1 Brand color — gold

| Role                | Hex       | Notes                                       |
|---------------------|-----------|---------------------------------------------|
| Container border    | `#b8860b` | `darkgoldenrod` — outer 6 px frame on 600   |
| DPnn label color    | `#facc15` | saturated gold for `DP01–DP22` badge header  |
| Starfield accents   | `#e8b923` | warm gold dot highlights                    |

Gold appears in the badge **container frame**, in the **DPnn label**, in
the **outer border** of the comparison sheet, and in the **starfield
accents** so every artifact reads as a gold-branded object.

### 1.2 Six thematic group colors (v2 grouping)

The user's reference infographic uses a six-group taxonomy. Each DP belongs
to exactly one group. Group color = the secondary identifier layered on top
of gold.

| Group                                       | Hex       | DPs                       | 2-letter codes  |
|---------------------------------------------|-----------|---------------------------|-----------------|
| Authentication, Agency & Accountability     | `#06b6d4` | DP1, DP2, DP3             | Au, Ag, Go      |
| Sovereignty & Privacy                       | `#10b981` | DP4, DP5, DP6             | So, Ns, Co      |
| Interoperability & Participant Experience   | `#d946ef` | DP7, DP8, DP9, DP10, DP21 | Si, Cm, In, Ed, Mm |
| AI Governance & Safety                      | `#7c3aed` | DP11, DP12, DP13          | Ai, Cg, Ac      |
| Security, Transparency & Trust              | `#ef4444` | DP14, DP15, DP16, DP17    | Tt, Sp, Rm, Fs  |
| Community Participation & Feedback          | `#f59e0b` | DP18, DP19, DP20, DP22    | Fr, Ap, Ow, Ep  |

All group colors were sampled from the reference infographic and verified
on dark backgrounds — they remain saturated and distinct at thumbnail
size, with hex gaps between adjacent families of ≥ 20 RGB units so
neighboring badges never blend visually.

### 1.3 Neutrals & canvas

| Role                | Hex       | Where                                |
|---------------------|-----------|--------------------------------------|
| Deep space canvas   | `#0a0e1a` | background of all badges/covers      |
| White title text    | `#ffffff` | glyph title                          |
| Cream body text     | `#f4f1e8` | secondary titles                     |
| Muted ink           | `#a0a0a8` | code letter + caption                |

---

## 2. Source SVG rules (24×24 viewBox)

Every source SVG must follow these hard rules:

1. **viewBox = `0 0 24 24`**. No `width` / `height` attributes on `<svg>`.
2. **Stroke-only or stroke + small filled accent.** Strokes use `stroke="accent"` (group color) and `stroke-width="2"` (sometimes `1.4–1.6` for inner detail). `stroke-linecap="round"` and `stroke-linejoin="round"` for organic feel.
3. **No visible text** in the source.
4. **Padding 1–2 px.** Glyphs sit inside the box `(2, 2) → (22, 22)` with comfortable edge breathing room.
5. **Recognizable metaphor.** Each glyph must look like the thing it represents at 96×96 — see §5.
6. **Silhouette uniqueness.** All 22 glyphs have distinct silhouettes at 32×32 (test in §6).

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
     fill="none" stroke-linecap="round" stroke-linejoin="round">
  <title>DP1 — Federated Authentication &amp; Accountability</title>
  <g stroke="{accent}" fill="none">
    <!-- glyph paths here -->
  </g>
</svg>
```

Sources deliberately **omit** any background or container frame so they can
be reused on light, dark, or themed surfaces.

---

## 3. Badge variant (600×600)

The badge is the centerpiece of v2 — the artifact the user judges. Each
`badges/dpNN.svg` renders the icon on a dark space background with the
following layered composition:

```
┌─ 6 px GOLD OUTER FRAME (#b8860b) ─┐
│  ┌─ 3 px GROUP-COLOR INNER FRAME ─┐ │
│  │                                 │ │
│  │  DPnn (gold) + 2-letter code   │ │
│  │  (group color) — top-left       │ │
│  │                                 │ │
│  │            [GLYPH]              │ │
│  │     centered, 50–60% area       │ │
│  │                                 │ │
│  │  WHITE TITLE — bottom           │ │
│  │  ─── (accent underline) ───     │ │
│  │  GROUP CAPTION (accent, upper)  │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Specifications:
- Outer **gold** frame: 6 px stroke, `rx=14`
- Inner **group-color** frame: 3 px stroke, `rx=8`, at ~0.9 opacity
- Background: deep navy `#0a0e1a` with a subtle radial vignette
- Starfield: 18 deterministic dots (seeded per DP) for marketing polish
- DPnn label top-left: `#facc15` gold, bold 62 px sans-serif
- 2-letter code (top-left, below DPnn): group color, bold 40 px with 6 px letter-spacing
- Group label top-right: group color, ALL CAPS, 13 px with 3 px tracking + small horizontal underline accent
- Side accent: small gold node + double tick on left edge
- Centered glyph: scaled source embedded in nested `<svg viewBox="0 0 24 24">`, 270×270 px
- White title bottom: 26 px bold, centered
- Group caption: 11 px ALL CAPS with letter spacing 3 + accent underline
- Corner dots: gold (bottom-left, brand mark) + group color (bottom-right, theme mark)

The badge must:
- ✅ Pass the "would I put this on a t-shirt?" test.
- ✅ Pass the "stranger recognizes in 1 second" test for the glyph.
- ✅ Be legible when scaled down to 240 px (thumbnail).
- ✅ Have gold outer frame intact at all sizes.

---

## 4. Cover variant (1200×630)

The cover (`covers/dpNN.svg`) is the OG-aspect workgroup card:

- Same dark space canvas + gold outer border
- **Left half (0 → 600):** 580-px nested badge variant with all the same elements as §3, slightly compressed
- **Right half (600 → 1200):** title strip — a vertical strip tinted with the group color at 7% opacity, divided from the left by a 2 px group-color vertical line. Strip contains:
  - DPnn label (gold, 32 px) and 2-letter code (group color, 32 px)
  - Title in 2-3 word-wrapped lines (white, 56 px bold)
  - Group short label (ALL CAPS, group color)
  - Subtitle: "Desirable Properties — Meta-Layer" (muted ink)
- Brand corner marks: gold dot bottom-left, group color dot bottom-right

OG aspect is 1200×630 — must remain legible when auto-cropped to ~400×210
in social previews.

---

## 5. Per-DP glyph design rationale

The 22 glyph metaphors are designed to read as **the thing they name**, not
as abstract symbols. Each one has a unique silhouette at 96×96.

| DP  | Name                                   | Code | Glyph metaphor                                                              | Rationale |
|-----|----------------------------------------|------|------------------------------------------------------------------------------|-----------|
| 1   | Federated Authentication & Accountability | Au | Stylized fingerprint ridges with a small accent dot at the center          | Fingerprint = the universal symbol of identity verification |
| 2   | Participant Agency & Empowerment       | Ag   | Three figures: one large center with arms outstretched, two smaller flanks | Agency radiating — the central figure is empowered outward |
| 3   | Adaptive Governance                    | Go   | Gear with prominent teeth and an upward arrow at the hub                   | Gear = governance mechanism; arrow = adaptation/growth |
| 4   | Data Sovereignty & Privacy             | So   | Shield with keyhole + small data dots inside                                | Shield = protection; keyhole = private access; dots = data |
| 5   | Decentralized Namespace                | Ns   | Dharma-wheel / 8-spoke radial hub with 8 outer nodes                        | Wheel = the canonical namespace-resolution symbol across cultures |
| 6   | Commerce                               | Co   | Shopping cart with a coin hovering above (rising arrow inside coin)         | Cart + coin = the universal commerce metaphor |
| 7   | Simplicity & Interoperability          | Si   | Classic 4-tab puzzle piece with subtle inset                                | Puzzle = things fitting together (interoperability) |
| 8   | Collaborative Environment              | Cm   | Three connected nodes forming a triangle                                    | Triangle of nodes = three collaborators around shared work |
| 9   | Developer & Community Incentives       | In   | Rocket with internal upward-arrow flame                                     | Rocket = launch / incentive |
| 10  | Education                              | Ed   | Open book with sun + radiating rays above                                   | Book + sun = knowledge radiating outward |
| 11  | Safe & Ethical AI                      | Ai   | Brain silhouette with internal circuit pattern (4 dots + lines)             | Brain = cognition; circuit = AI |
| 12  | Community-based AI Governance          | Cg   | Central AI diamond encircled by 5 community nodes                            | Graph of community connected to AI governance |
| 13  | AI Containment                         | Ac   | Dome (vault) over an AI chip with pin connectors                            | Dome = containment; chip = AI |
| 14  | Trust & Transparency                   | Tt   | Eye with prominent iris + pupil + light reflection                          | Eye = transparency / open watching |
| 15  | Security & Provenance                  | Sp   | Shield with two interlocking chain links + small lock                       | Shield + chain = security with lineage |
| 16  | Roadmap & Milestones                   | Rm   | Mountain peak with flag at summit + milestone dots                          | Peak + flag = milestone reached; dots = the journey |
| 17  | Financial Sustainability               | Fs   | Coin (filled) with infinity loop inside + plant growing from top            | Coin = finance; infinity = sustainability; plant = growth |
| 18  | Feedback Loops & Reputation            | Fr   | Circular arrow loop with chat-bubble + 3 dots inside                       | Loop = continuous feedback; bubble = conversation |
| 19  | Amplifying Presence                    | Ap   | Megaphone with radiating sound waves                                        | Megaphone = amplifying a voice |
| 20  | Community Ownership                    | Ow   | Globe held up by two hands + 4 small community dots inside                  | Globe in hands = community holding/stewarding |
| 21  | Multi-modal                            | Mm   | Four overlapping wave forms at different frequencies                        | Waves at multiple rates = multi-modal signals |
| 22  | Epistemic Continuity                   | Ep   | DNA double helix with base-pair rungs                                       | Helix = knowledge passed across generations |

---

## 6. Silhouette uniqueness test

Run the silhouette collision check:

```bash
python3 /home/ubuntu/desirable-properties/assets/dp-icons/scripts/silhouette-test.py
```

The script rasterizes each source SVG at 32×32, thresholds to black, hashes
the bitmap, and reports any duplicate hashes. Pass criterion: **22 distinct
hashes** + visual confirmation from the saved `raster/silhouette-grid.png`.

v2 currently passes with **22 / 22 unique silhouettes**.

---

## 7. Typography

- Font stack: `'Inter','SF Pro Display','Segoe UI','Liberation Sans','DejaVu Sans',system-ui,sans-serif`
- Per-element sizes:
  - **DPnn label:** 62 px, weight 800, letter-spacing -1.5 (tight, because it's large and we want it to feel like a code)
  - **2-letter code:** 40 px, weight 700, letter-spacing 6 (wide tracking — premium feel)
  - **Group label top-right:** 13 px, weight 700, letter-spacing 3, ALL CAPS
  - **Title:** 26 px, weight 700, white, no all-caps
  - **Group caption (bottom):** 11 px, weight 700, letter-spacing 3, ALL CAPS, accent

Every badge uses the same font stack, the same weights, the same
letter-spacing per element. Type hierarchy is identical across all 22.

---

## 8. File layout

```
desirable-properties/assets/dp-icons/
├── SPEC.md                              # this document (v2)
├── source/{dp01..dp22}.svg              # 24×24 source glyphs
├── badges/{dp01..dp22}.svg              # 600×600 dark-space badges
├── covers/{dp01..dp22}.svg              # 1200×630 OG-aspect covers
├── scripts/
│   ├── build_dpi_icons.py               # v2 main build script
│   ├── build-comparison-sheet-v2.py     # v2 comparison sheet
│   └── silhouette-test.py               # silhouette uniqueness check
├── comparison-sheet-v2.png              # full-badge v2 review sheet
├── comparison-sheet-v2-source-only.png  # bare-glyph v2 review sheet
└── raster/
    └── silhouette-grid.png              # silhouette thumbnail grid
```

Mirrored to:
- `gov-hub-dev/static/images/dp-icons/{source,badges,covers}/`
- `gov-hub-prod/static/images/dp-icons/{source,badges,covers}/`

Deployment sites import the SVGs directly. Total artifacts per repo:
**22 × 3 = 66 SVGs**, mirrored across **3 repos = 198 SVGs total**.

---

## 9. Open decisions / known constraints

1. **6 vs 4 group color.** The v1 used a 4-family palette (Trust / Governance / Data / Resilience). V2 expands to 6 to match the user's chosen grouping, dropping DP22 from "Resilience" to "Community" and adding Security/Red as a fifth family.
2. **Canvas size.** Comparison sheet is `~1780 × 2230` (6 rows × 5 cols for the 6 groups). Spec asked for `1750 × 1990`; we opted for 6 rows for visual clarity (one row per group) over a 5-row double-up.
3. **Inter font.** SVG `<text>` elements use the font stack above, but consumers on systems without Inter will fall back to Liberation/DejaVu. The visual hierarchy still reads correctly with system fonts.
4. **DP22's exact title** in the canonical data is "Civic Memory & Epistemic Continuity". The user shortened it to "Epistemic Continuity" for the badge title to fit comfortably.
