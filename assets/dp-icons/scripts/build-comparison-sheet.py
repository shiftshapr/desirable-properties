#!/usr/bin/env python3
"""Build v2 comparison sheets for the 22 DP icon badges.

Produces two PNGs in `assets/dp-icons/`:

1. `comparison-sheet-v2.png`             — full badges (600×600) on a
   dark background, grouped by the six v2 thematic groups, with
   gold family dividers and 2-letter codes visible on each badge.
2. `comparison-sheet-v2-source-only.png` — the bare 24×24 source
   glyphs rasterized at 128×128 each (the "recognizable metaphors" view).

The dark background lets the gold frame pop while still letting the
group color read clearly on each glyph.

Requirements:
    pip install cairosvg Pillow
"""

from __future__ import annotations

import io
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]  # …/assets/dp-icons
BADGES_DIR = ROOT / "badges"
SOURCE_DIR = ROOT / "source"
OUTPUT_DIR = ROOT

# Dark canvas background — deep space that lets the gold frame pop.
BG_COLOR = (10, 14, 26)  # #0a0e1a

# v2 six-group palette (RGB tuples for PIL).
G_AUTH = (6, 182, 212)          # #06b6d4  cyan
G_SOV = (16, 185, 129)          # #10b981  green
G_INTEROP = (217, 70, 239)      # #d946ef  magenta
G_AI = (124, 58, 237)           # #7c3aed  deep purple
G_SEC = (239, 68, 68)           # #ef4444  red
G_COMM = (245, 158, 11)         # #f59e0b  amber

# Brand gold (matches the build script).
GOLD = (184, 134, 11)           # #b8860b
GOLD_BRIGHT = (250, 204, 21)    # #facc15 — accent gold for DPnn text

# Neutral text colors.
WHITE = (240, 240, 240)
NEUTRAL_GRAY = (160, 160, 168)

# DP table: (group_color, 2-letter code, short_title, group_key)
DP_INFO: dict[int, tuple[tuple[int, int, int], str, str, str]] = {
    1:  (G_AUTH,    "Au", "Federated Auth",     "Auth"),
    2:  (G_AUTH,    "Ag", "Participant Agency",  "Auth"),
    3:  (G_AUTH,    "Go", "Adaptive Governance", "Auth"),
    4:  (G_SOV,     "So", "Data Sovereignty",   "Sovereignty"),
    5:  (G_SOV,     "Ns", "Decentralized NS",    "Sovereignty"),
    6:  (G_SOV,     "Co", "Commerce",            "Sovereignty"),
    7:  (G_INTEROP, "Si", "Simplicity",          "Interop"),
    8:  (G_INTEROP, "Cm", "Collaboration",       "Interop"),
    9:  (G_INTEROP, "In", "Incentives",          "Interop"),
    10: (G_INTEROP, "Ed", "Education",           "Interop"),
    11: (G_AI,      "Ai", "Safe AI",             "AI"),
    12: (G_AI,      "Cg", "AI Governance",       "AI"),
    13: (G_AI,      "Ac", "AI Containment",      "AI"),
    14: (G_SEC,     "Tt", "Trust",               "Security"),
    15: (G_SEC,     "Sp", "Security",            "Security"),
    16: (G_SEC,     "Rm", "Roadmap",             "Security"),
    17: (G_SEC,     "Fs", "Sustainability",      "Security"),
    18: (G_COMM,    "Fr", "Feedback",            "Community"),
    19: (G_COMM,    "Ap", "Amplifying Presence", "Community"),
    20: (G_COMM,    "Ow", "Community Ownership", "Community"),
    21: (G_INTEROP, "Mm", "Multi-modal",         "Interop"),
    22: (G_COMM,    "Ep", "Epistemic Continuity","Community"),
}

# Group rows in display order (left-to-right).
GROUP_ROWS: list[tuple[str, tuple[int, int, int], list[int]]] = [
    ("AUTHENTICATION, AGENCY",          G_AUTH,    [1, 2, 3]),
    ("SOVEREIGNTY & PRIVACY",           G_SOV,     [4, 5, 6]),
    ("INTEROPERABILITY",                G_INTEROP, [7, 8, 9, 10, 21]),
    ("AI GOVERNANCE",                   G_AI,      [11, 12, 13]),
    ("SECURITY, TRUST",                 G_SEC,     [14, 15, 16, 17]),
    ("COMMUNITY",                       G_COMM,    [18, 19, 20, 22]),
]

# Grid layout: 6 group columns × 5 row max depth.
COLS = 6   # 6 groups, one column each
THUMB = 200

CELL_W = 240
CELL_H = 320

# Padding / margins
LEFT_MARGIN = 24
RIGHT_MARGIN = 24
TOP_MARGIN = 130
BOTTOM_MARGIN = 40
COL_GUTTER = 8   # horizontal gap between group columns


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Try a few common sans-serif font paths, falling back to PIL default."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/inter/Inter-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/inter/Inter-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    # Last-ditch: bitmap default
    return ImageFont.load_default()


def rasterize_svg(svg_path: Path, size: int) -> Image.Image:
    """Rasterize an SVG file to a square RGBA PIL Image at the given size."""
    png_bytes = cairosvg.svg2png(
        url=str(svg_path),
        output_width=size,
        output_height=size,
    )
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def paste_centered(canvas: Image.Image, img: Image.Image,
                   cx: int, cy: int) -> None:
    """Paste `img` centered at (cx, cy) on the RGBA canvas."""
    x = cx - img.width // 2
    y = cy - img.height // 2
    canvas.alpha_composite(img, dest=(x, y))


def text_size(draw: ImageDraw.ImageDraw, text: str,
              font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    """Return (width, height) of `text` rendered with `font`."""
    try:
        l, t, r, b = draw.textbbox((0, 0), text, font=font)
        return (r - l, b - t)
    except AttributeError:
        return draw.textsize(text, font=font)  # type: ignore[attr-defined]


def draw_centered_text(draw: ImageDraw.ImageDraw, text: str,
                       cx: int, cy: int, font: ImageFont.FreeTypeFont,
                       fill: tuple[int, int, int]) -> None:
    w, h = text_size(draw, text, font)
    draw.text((cx - w // 2, cy - h // 2), text, font=font, fill=fill)


def draw_text(draw, text, x, y, font, fill, anchor="start"):
    """Pillow text with anchor support (start/middle/end)."""
    w, h = text_size(draw, text, font)
    if anchor == "middle":
        x -= w // 2
    elif anchor == "end":
        x -= w
    draw.text((x, y - h // 2), text, font=font, fill=fill)


# ---------------------------------------------------------------------------
# Cell rendering
# ---------------------------------------------------------------------------


def col_x(col: int) -> int:
    """Left x of column `col` (0-indexed)."""
    return LEFT_MARGIN + col * (CELL_W + COL_GUTTER)


def render_cell(draw: ImageDraw.ImageDraw, thumb: Image.Image | None,
                dp_num: int | None, col: int, row: int) -> None:
    """Render a single grid cell at (col, row)."""
    cx = col_x(col) + CELL_W // 2
    cy = TOP_MARGIN + row * CELL_H + CELL_H // 2

    if thumb is not None and dp_num is not None:
        # Thumb centered slightly above middle
        thumb_cy = cy - 30
        paste_centered(canvas_canvas_ref["img"], thumb, cx, thumb_cy)

        family_color, code, short_title, _group_key = DP_INFO[dp_num]
        dp_label = f"DP{dp_num:02d}"

        # 2-letter code in family color (mid-large, prominent)
        code_font = load_font(26, bold=True)
        draw_centered_text(draw, code, cx, cy + 90, code_font, family_color)

        # Short title in neutral gray, smaller
        title_font = load_font(13, bold=False)
        draw_centered_text(draw, short_title, cx, cy + 118, title_font,
                           NEUTRAL_GRAY)

        # DPnn in small gold text below the title
        dp_font = load_font(11, bold=True)
        draw_centered_text(draw, dp_label, cx, cy + 138, dp_font, GOLD_BRIGHT)


canvas_canvas_ref: dict[str, Image.Image] = {}


# ---------------------------------------------------------------------------
# Sheet assembly
# ---------------------------------------------------------------------------


def build_sheet(*, use_badges: bool) -> tuple[Image.Image, tuple[int, int]]:
    """Compose the comparison sheet."""
    rows = max(len(dps) for _, _, dps in GROUP_ROWS)
    grid_w = COLS * CELL_W + (COLS - 1) * COL_GUTTER
    grid_h = rows * CELL_H
    canvas_w = LEFT_MARGIN + grid_w + RIGHT_MARGIN
    canvas_h = TOP_MARGIN + grid_h + BOTTOM_MARGIN

    canvas = Image.new("RGBA", (canvas_w, canvas_h), BG_COLOR + (255,))
    canvas_canvas_ref["img"] = canvas
    draw = ImageDraw.Draw(canvas)

    # ---- Title block -------------------------------------------------------
    title_font = load_font(28, bold=True)
    title_text = "DP ICON SYSTEM v2 — RECOGNIZABLE METAPHORS"
    draw_centered_text(draw, title_text, canvas_w // 2, 44, title_font,
                       WHITE)

    # Subtitle: six groups with colored dots
    subtitle_font = load_font(13, bold=False)
    sub_y = 90
    parts = []
    for fam_name, fam_color, _ in GROUP_ROWS:
        parts.append((fam_name, fam_color))

    # Measure total width with dots
    dot_r = 4
    dot_gap = 6
    text_gap = 8
    sep_gap = 18  # gap between groups
    total_w = 0
    measured = []
    for i, (text, color) in enumerate(parts):
        w, _ = text_size(draw, text, subtitle_font)
        measured.append((text, color, w))
        total_w += 2 * dot_r + dot_gap + text_gap + w
        if i < len(parts) - 1:
            total_w += sep_gap
    total_w -= text_gap  # no trailing gap after last item

    cursor_x = (canvas_w - total_w) // 2
    for i, (text, color, w) in enumerate(measured):
        # Draw dot
        draw.ellipse(
            [cursor_x, sub_y - dot_r, cursor_x + 2 * dot_r, sub_y + dot_r],
            fill=color,
        )
        cursor_x += 2 * dot_r + dot_gap
        # Draw text
        th = text_size(draw, text, subtitle_font)[1]
        draw.text((cursor_x, sub_y - th // 2), text,
                  font=subtitle_font, fill=color)
        cursor_x += w + text_gap
        if i < len(measured) - 1:
            cursor_x += sep_gap

    # ---- Grid --------------------------------------------------------------
    for col, (fam_name, fam_color, dps) in enumerate(GROUP_ROWS):
        for row, dp_num in enumerate(dps):
            if use_badges:
                thumb = rasterize_svg(BADGES_DIR / f"dp{dp_num:02d}.svg",
                                      THUMB)
            else:
                thumb = rasterize_svg(SOURCE_DIR / f"dp{dp_num:02d}.svg",
                                      128)
            render_cell(draw, thumb, dp_num, col, row)

    # ---- Gold column dividers between groups ------------------------------
    for col in range(1, COLS):
        x = LEFT_MARGIN + col * CELL_W + (col - 1) * COL_GUTTER + COL_GUTTER // 2
        draw.line(
            [(x, TOP_MARGIN - 10),
             (x, TOP_MARGIN + grid_h)],
            fill=GOLD,
            width=2,
        )

    # ---- Group column headers (above the grid) ----------------------------
    for col, (fam_name, fam_color, dps) in enumerate(GROUP_ROWS):
        cx = col_x(col) + CELL_W // 2
        header_y = TOP_MARGIN - 18
        header_font = load_font(12, bold=True)
        # Background pill behind the label
        text_w, text_h = text_size(draw, fam_name, header_font)
        pill_w = text_w + 24
        pill_h = 22
        pill_x0 = cx - pill_w // 2
        pill_y0 = header_y - pill_h // 2
        draw.rounded_rectangle(
            [pill_x0, pill_y0, pill_x0 + pill_w, pill_y0 + pill_h],
            radius=pill_h // 2,
            fill=fam_color,
        )
        draw_centered_text(draw, fam_name, cx, header_y, header_font,
                           (15, 15, 20))

    # ---- Outer border (subtle) ---------------------------------------------
    draw.rectangle(
        [LEFT_MARGIN - 16, TOP_MARGIN - 16,
         canvas_w - RIGHT_MARGIN + 16, canvas_h - BOTTOM_MARGIN + 16],
        outline=GOLD,
        width=1,
    )

    return canvas.convert("RGB"), (canvas_w, canvas_h)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Building v2 full-badge comparison sheet…")
    full_img, full_size = build_sheet(use_badges=True)
    full_path = OUTPUT_DIR / "comparison-sheet-v2.png"
    full_img.save(full_path, "PNG", optimize=True)
    print(f"  → {full_path}  ({full_size[0]}×{full_size[1]})")

    print("Building v2 source-only comparison sheet…")
    src_img, src_size = build_sheet(use_badges=False)
    src_path = OUTPUT_DIR / "comparison-sheet-v2-source-only.png"
    src_img.save(src_path, "PNG", optimize=True)
    print(f"  → {src_path}  ({src_size[0]}×{src_size[1]})")

    print("Done.")


if __name__ == "__main__":
    main()