#!/usr/bin/env python3
"""Build v2 comparison sheet for the DP icon system.

Produces:
  - assets/dp-icons/comparison-sheet-v2.png             (22 badges, 6-row grid)
  - assets/dp-icons/comparison-sheet-v2-source-only.png  (bare source glyphs)
"""
from __future__ import annotations

import io
import random
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BADGES_DIR = ROOT / "badges"
SOURCE_DIR = ROOT / "source"
OUTPUT_DIR = ROOT

BG_COLOR = (10, 14, 26)
GOLD = (184, 134, 11)
GOLD_HIGHLIGHT = (250, 204, 21)
WHITE = (240, 240, 240)
INK_MUTED = (160, 160, 168)

GROUP_COLORS = {
    "Au.Ag.Go":       (6, 182, 212),
    "So.Ns.Co":       (16, 185, 129),
    "Si.Cm.In.E.Mm":  (217, 70, 239),
    "Ai.Cg.Ac":       (124, 58, 237),
    "Tt.Sp.Rm.Fs":    (239, 68, 68),
    "Fr.Ap.Ow.Ep":    (245, 158, 11),
}
GROUP_LONG = {
    "Au.Ag.Go":       "Authentication, Agency & Accountability",
    "So.Ns.Co":       "Sovereignty & Privacy",
    "Si.Cm.In.E.Mm":  "Interoperability & Participant Experience",
    "Ai.Cg.Ac":       "AI Governance & Safety",
    "Tt.Sp.Rm.Fs":    "Security, Transparency & Trust",
    "Fr.Ap.Ow.Ep":    "Community Participation & Feedback",
}

SHORT_TITLE = {
    1:  "Federated Auth",   2:  "Participant Agency",   3:  "Adaptive Governance",
    4:  "Data Sovereignty", 5:  "Decentralized NS",     6:  "Commerce",
    7:  "Simplicity",       8:  "Collaboration",        9:  "Incentives",
    10: "Education",        11: "Safe AI",              12: "AI Governance",
    13: "AI Containment",   14: "Trust",                15: "Security",
    16: "Roadmap",          17: "Sustainability",       18: "Feedback",
    19: "Amplifying",       20: "Ownership",            21: "Multi-modal",
    22: "Epistemic Cont.",
}

CODE = {
    1:"Au", 2:"Ag", 3:"Go", 4:"So", 5:"Ns", 6:"Co", 7:"Si", 8:"Cm",
    9:"In", 10:"Ed", 11:"Ai", 12:"Cg", 13:"Ac", 14:"Tt", 15:"Sp",
    16:"Rm", 17:"Fs", 18:"Fr", 19:"Ap", 20:"Ow", 21:"Mm", 22:"Ep",
}

# 6 thematic groups, each on its own row.
LAYOUT = [
    ("Au.Ag.Go",      [1, 2, 3]),
    ("So.Ns.Co",      [4, 5, 6]),
    ("Si.Cm.In.E.Mm", [7, 8, 9, 10, 21]),
    ("Ai.Cg.Ac",      [11, 12, 13]),
    ("Tt.Sp.Rm.Fs",   [14, 15, 16, 17]),
    ("Fr.Ap.Ow.Ep",   [18, 19, 20, 22]),
]

COLS = 5
ROWS = 6
CELL_W = 304
CELL_H = 320
THUMB = 200

LEFT_MARGIN = 220
RIGHT_MARGIN = 40
TOP_MARGIN = 200
BOTTOM_MARGIN = 110
GRID_GUTTER = 12


def load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def text_size(draw, text, font):
    try:
        l, t, r, b = draw.textbbox((0, 0), text, font=font)
        return (r - l, b - t)
    except AttributeError:
        return draw.textsize(text, font=font)


def draw_centered_text(draw, text, cx, cy, font, fill):
    w, h = text_size(draw, text, font)
    draw.text((cx - w // 2, cy - h // 2), text, font=font, fill=fill)


def paste_centered(canvas, img, cx, cy):
    canvas.alpha_composite(img, dest=(cx - img.width // 2, cy - img.height // 2))


def rasterize_svg(svg_path, size):
    png_bytes = cairosvg.svg2png(url=str(svg_path), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def make_canvas():
    grid_w = COLS * CELL_W
    grid_h = ROWS * CELL_H
    canvas_w = LEFT_MARGIN + grid_w + RIGHT_MARGIN
    canvas_h = TOP_MARGIN + grid_h + BOTTOM_MARGIN
    canvas = Image.new("RGBA", (canvas_w, canvas_h), BG_COLOR + (255,))
    draw = ImageDraw.Draw(canvas)
    return canvas, draw, canvas_w, canvas_h


def add_starfield(canvas):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    rng = random.Random(43)
    n = int(canvas.width * canvas.height / 6500)
    for _ in range(n):
        cx = rng.uniform(0, canvas.width)
        cy = rng.uniform(0, canvas.height)
        r = rng.uniform(0.3, 1.1)
        op = int(rng.uniform(40, 110))
        col = rng.choice([(255, 255, 255), (250, 204, 21), (200, 220, 255)])
        odraw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col + (op,))
    canvas.alpha_composite(overlay)


def add_outer_frame(draw, canvas_w, canvas_h):
    draw.rectangle([20, 20, canvas_w - 20, canvas_h - 20], outline=GOLD, width=2)
    corner = 18
    for cx, cy in [(20, 20), (canvas_w - 20, 20), (20, canvas_h - 20), (canvas_w - 20, canvas_h - 20)]:
        draw.line([cx - corner, cy, cx + corner, cy], fill=GOLD_HIGHLIGHT, width=2)
        draw.line([cx, cy - corner, cx, cy + corner], fill=GOLD_HIGHLIGHT, width=2)


def add_title_block(draw, canvas_w):
    title_font = load_font(34, bold=True)
    draw_centered_text(draw, "DP ICON SYSTEM v2  (DP01 \u2013 DP22)", canvas_w // 2, 50, title_font, WHITE)
    sub_font = load_font(15, bold=False)
    draw_centered_text(
        draw,
        "Recognizable metaphors on dark space  \u2014  gold brand + six group colors  \u2014  reference quality",
        canvas_w // 2, 86, sub_font, INK_MUTED,
    )
    strip_y = 130
    strip_font = load_font(11, bold=True)
    brand_values = [
        ("PROSPERITY",   (245, 158, 11)),
        ("AGENCY",       (6, 182, 212)),
        ("KNOWLEDGE",    (217, 70, 239)),
        ("EMPOWERMENT",  (16, 185, 129)),
        ("COMMUNITY",    (124, 58, 237)),
    ]
    seg_w = 145
    total_strip_w = seg_w * len(brand_values)
    strip_x0 = (canvas_w - total_strip_w) // 2
    for i, (label, color) in enumerate(brand_values):
        cx = strip_x0 + i * seg_w + seg_w // 2
        draw.ellipse([cx - 25 - 5, strip_y - 5, cx - 25 + 5, strip_y + 5], fill=color)
        draw.text((cx - 25 + 10, strip_y - 7), label, font=strip_font, fill=color)


def render_cells(canvas, draw, use_badges):
    label_font = load_font(20, bold=True)
    title_font_sm = load_font(14, bold=False)
    code_font = load_font(12, bold=True)
    for ri, (gk, dps) in enumerate(LAYOUT):
        fam_color = GROUP_COLORS[gk]
        for ci, dp in enumerate(dps):
            cell_x = LEFT_MARGIN + ci * CELL_W
            cell_y = TOP_MARGIN + ri * CELL_H
            cell_cx = cell_x + CELL_W // 2
            thumb_top = cell_y + 60
            if use_badges:
                thumb = rasterize_svg(BADGES_DIR / f"dp{dp:02d}.svg", THUMB)
            else:
                thumb = rasterize_svg(SOURCE_DIR / f"dp{dp:02d}.svg", THUMB)
                card = Image.new("RGBA", (THUMB + 16, THUMB + 16), BG_COLOR + (255,))
                ImageDraw.Draw(card).rectangle(
                    [4, 4, THUMB + 12, THUMB + 12], outline=GOLD, width=3,
                )
                ImageDraw.Draw(card).rectangle(
                    [12, 12, THUMB + 4, THUMB + 4], outline=fam_color, width=1,
                )
                card.alpha_composite(thumb, dest=(8, 8))
                thumb = card
            paste_centered(canvas, thumb, cell_cx, thumb_top + thumb.height // 2)
            dp_label = f"DP{dp:02d}"
            draw_centered_text(draw, dp_label, cell_cx, cell_y + CELL_H - 80, label_font, fam_color)
            draw_centered_text(draw, SHORT_TITLE[dp], cell_cx, cell_y + CELL_H - 50, title_font_sm, WHITE)
            draw_centered_text(draw, CODE[dp], cell_cx, cell_y + CELL_H - 22, code_font, INK_MUTED)


def render_family_labels(canvas, draw):
    fam_label_font = load_font(24, bold=True)
    fam_sub_font = load_font(13, bold=False)
    fam_long_font = load_font(13, bold=True)
    bar_x = 50
    for ri, (gk, dps) in enumerate(LAYOUT):
        fam_color = GROUP_COLORS[gk]
        ry = TOP_MARGIN + ri * CELL_H + CELL_H // 2
        bar_y = ry - CELL_H // 2 + 30
        bar_h = CELL_H - 70
        draw.rectangle([bar_x - 4, bar_y, bar_x + 4, bar_y + bar_h], fill=fam_color)
        draw.ellipse([bar_x - 10, bar_y - 10, bar_x + 10, bar_y + 10], fill=fam_color)
        draw.ellipse([bar_x - 10, bar_y + bar_h - 10, bar_x + 10, bar_y + bar_h + 10], fill=fam_color)

        hex_str = "#" + "".join(f"{c:02x}" for c in fam_color)
        hw, hh = text_size(draw, hex_str, fam_sub_font)
        draw.text((bar_x - hw // 2, bar_y + bar_h + 14), hex_str, font=fam_sub_font, fill=GOLD)

        text = gk.upper()
        tw, th = text_size(draw, text, fam_label_font)
        rot_img = Image.new("RGBA", (tw + 50, th + 50), (0, 0, 0, 0))
        rd = ImageDraw.Draw(rot_img)
        rd.text((25, 25), text, font=fam_label_font, fill=fam_color)
        rot_img = rot_img.rotate(90, expand=True)
        canvas.alpha_composite(
            rot_img,
            dest=(
                (bar_x - 35 - rot_img.size[0] // 2),
                ry - rot_img.size[1] // 2,
            ),
        )

        long_label = GROUP_LONG[gk]
        lines = []
        if len(long_label) > 20:
            for sep in [" & ", " and "]:
                if sep in long_label:
                    a, _, b = long_label.partition(sep)
                    lines.append(a + " " + sep.strip().upper())
                    lines.append(b.upper())
                    break
            else:
                lines.append(long_label)
        else:
            lines.append(long_label)

        line_imgs = []
        max_w = 0
        for line in lines:
            ltw, lth = text_size(draw, line.upper(), fam_long_font)
            img = Image.new("RGBA", (ltw + 20, lth + 20), (0, 0, 0, 0))
            ImageDraw.Draw(img).text((10, 10), line.upper(), font=fam_long_font, fill=INK_MUTED)
            line_imgs.append(img)
            max_w = max(max_w, ltw)

        total_h = sum(img.height for img in line_imgs) + 10 * (len(line_imgs) - 1)
        combined = Image.new("RGBA", (max_w + 20, total_h + 20), (0, 0, 0, 0))
        y = 10
        for img in line_imgs:
            combined.alpha_composite(img, dest=(10, y))
            y += img.height + 10
        combined = combined.rotate(90, expand=True)
        canvas.alpha_composite(combined, dest=(bar_x + 35, ry - combined.size[1] // 2))


def render_row_dividers(draw, canvas_w):
    for ri in range(1, ROWS):
        y = TOP_MARGIN + ri * CELL_H - GRID_GUTTER // 2 - 4
        draw.line(
            [(LEFT_MARGIN - 20, y), (canvas_w - RIGHT_MARGIN - 10, y)],
            fill=GOLD, width=1,
        )
        mx = (LEFT_MARGIN + canvas_w - RIGHT_MARGIN) // 2
        draw.ellipse([mx - 4, y - 4, mx + 4, y + 4], fill=GOLD_HIGHLIGHT)


def render_bottom_legend(draw, canvas_w, canvas_h):
    legend_y = canvas_h - 70
    draw.line([(40, legend_y), (canvas_w - 40, legend_y)], fill=GOLD, width=2)
    legend_font = load_font(14, bold=False)
    legend_font_b = load_font(14, bold=True)
    draw.text((60, legend_y + 12), "Est. 2026", font=legend_font_b, fill=GOLD_HIGHLIGHT)
    draw.text((60, legend_y + 32), "Desirable Properties \u2014 Meta-Layer", font=legend_font, fill=INK_MUTED)
    draw.text(
        (canvas_w // 2, legend_y + 22),
        "Gov Hub  \u00b7  Communal infrastructure desirable-properties.org",
        font=legend_font, fill=WHITE,
    )
    draw.text(
        (canvas_w - 280, legend_y + 12),
        "Six groups  \u00b7  22 DPs  \u00b7  v2 release",
        font=legend_font_b, fill=GOLD,
    )
    draw.text(
        (canvas_w - 280, legend_y + 32),
        "For full glyph detail, see SPEC.md",
        font=legend_font, fill=INK_MUTED,
    )


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Building full-badge v2 comparison sheet\u2026")
    canvas, draw, canvas_w, canvas_h = make_canvas()
    add_starfield(canvas)
    add_outer_frame(draw, canvas_w, canvas_h)
    add_title_block(draw, canvas_w)
    render_cells(canvas, draw, use_badges=True)
    render_family_labels(canvas, draw)
    render_row_dividers(draw, canvas_w)
    render_bottom_legend(draw, canvas_w, canvas_h)
    canvas.convert("RGB").save(OUTPUT_DIR / "comparison-sheet-v2.png", "PNG", optimize=True)
    print(f"  \u2192 comparison-sheet-v2.png  ({canvas_w}\u00d7{canvas_h})")

    print("Building source-only v2 comparison sheet\u2026")
    canvas2, draw2, canvas_w2, canvas_h2 = make_canvas()
    add_starfield(canvas2)
    add_outer_frame(draw2, canvas_w2, canvas_h2)
    add_title_block(draw2, canvas_w2)
    render_cells(canvas2, draw2, use_badges=False)
    render_family_labels(canvas2, draw2)
    render_row_dividers(draw2, canvas_w2)
    render_bottom_legend(draw2, canvas_w2, canvas_h2)
    canvas2.convert("RGB").save(OUTPUT_DIR / "comparison-sheet-v2-source-only.png", "PNG", optimize=True)
    print(f"  \u2192 comparison-sheet-v2-source-only.png  ({canvas_w2}\u00d7{canvas_h2})")


if __name__ == "__main__":
    main()
