#!/usr/bin/env python3
"""Generate the /share kit images (full-size image posts for LinkedIn and friends).

Three themes x two shapes (square 1080x1080, portrait 1080x1350), in the style of
public/images/v1/share-1200x630.jpg: dark navy to amber gradient, gold accents,
the 3D book render (public/images/v1/book-3d-1200.webp, which has an alpha
channel) or the launch video thumbnail.

Output: public/share/<theme>-<shape>-<hash8>.jpg (content-hashed, old copies of
the same stem are removed) and src/lib/share-kit-images.json (the manifest the
/share page reads).

Usage (needs Pillow):  python3 scripts/share-images.py
"""
from __future__ import annotations

import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
OUT_DIR = PUBLIC / "share"
MANIFEST = ROOT / "src" / "lib" / "share-kit-images.json"

BOOK = PUBLIC / "images" / "v1" / "book-3d-1200.webp"
THUMB = PUBLIC / "events" / "v1-launch" / "thumbnail.jpg"

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

GOLD = (244, 188, 29)
WHITE = (255, 255, 255)
SOFT = (226, 232, 240)
MUTED = (203, 213, 225)

W = 1080
SHAPES = {"square": 1080, "portrait": 1350}
MARGIN = 80


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def gradient(w: int, h: int) -> Image.Image:
    """Diagonal navy (top-left) to amber-brown (bottom-right), like the 1200x630 card."""
    stops = [(0.0, (3, 6, 23)), (0.45, (12, 20, 38)), (0.75, (30, 24, 26)), (1.0, (58, 32, 10))]
    small_w, small_h = 108, max(1, h // 10)
    im = Image.new("RGB", (small_w, small_h))
    px = im.load()
    for y in range(small_h):
        for x in range(small_w):
            t = (x / (small_w - 1)) * 0.6 + (y / (small_h - 1)) * 0.4
            for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
                if t0 <= t <= t1:
                    k = (t - t0) / (t1 - t0)
                    px[x, y] = tuple(round(a + (b - a) * k) for a, b in zip(c0, c1))
                    break
    return im.resize((w, h), Image.BICUBIC)


def wrap(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=f) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    for line in lines:
        if draw.textlength(line, font=f) > max_w:
            raise SystemExit(f"overflow: {line!r} is wider than {max_w}px")
    return lines


def balanced_wrap(draw, text, f, max_w):
    """Greedy wrap, then shrink the width until the line count would grow: avoids orphans."""
    lines = wrap(draw, text, f, max_w)
    if len(lines) < 2:
        return lines
    lo, hi = 1, max_w
    while lo < hi:
        mid = (lo + hi) // 2
        try:
            ok = len(wrap(draw, text, f, mid)) == len(lines)
        except SystemExit:
            ok = False
        if ok:
            hi = mid
        else:
            lo = mid + 1
    return wrap(draw, text, f, lo)


def text_block(draw, y, text, f, fill, max_w, gap=1.18, align="center", max_lines=3):
    lines = balanced_wrap(draw, text, f, max_w)
    if len(lines) > max_lines:
        raise SystemExit(f"too many lines ({len(lines)}) for {text!r}")
    asc, desc = f.getmetrics()
    lh = round((asc + desc) * gap)
    for line in lines:
        lw = draw.textlength(line, font=f)
        x = (W - lw) / 2 if align == "center" else MARGIN
        draw.text((x, y), line, font=f, fill=fill)
        y += lh
    return y


def paste_book(canvas: Image.Image, box_h: int, top: int) -> None:
    book = Image.open(BOOK).convert("RGBA")
    book = book.crop(book.getchannel("A").getbbox())
    scale = box_h / book.height
    book = book.resize((round(book.width * scale), box_h), Image.LANCZOS)
    x = (W - book.width) // 2
    # soft warm glow behind the book
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = W // 2, top + box_h // 2
    r = int(box_h * 0.55)
    gd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(244, 188, 29, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(book, (x, top))


def paste_thumb(canvas: Image.Image, top: int) -> int:
    thumb = Image.open(THUMB).convert("RGBA")
    tw = W - 2 * 60
    th = round(thumb.height * tw / thumb.width)
    thumb = thumb.resize((tw, th), Image.LANCZOS)
    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, th - 1), radius=28, fill=255)
    x = 60
    # shadow
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x + 6, top + 14, x + tw + 6, top + th + 14), radius=28, fill=(0, 0, 0, 170))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    canvas.paste(thumb, (x, top), mask)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((x, top, x + tw - 1, top + th - 1), radius=28, outline=GOLD + (255,), width=4)
    # play button in the bottom-right corner, clear of the cover and the "VERSION 1.0" lettering
    cx, cy, r = x + tw - 92, top + th - 92, 58
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(3, 6, 23, 190), outline=GOLD + (255,), width=6)
    tri = [(cx - 18, cy - 30), (cx - 18, cy + 30), (cx + 33, cy)]
    od.polygon(tri, fill=GOLD + (255,))
    canvas.alpha_composite(overlay)
    return top + th


def gold_rule(draw, y, width=120):
    draw.rectangle(((W - width) // 2, y, (W + width) // 2, y + 6), fill=GOLD)


def bottom_bar(draw, h):
    draw.rectangle((0, h - 12, W, h), fill=GOLD)


def render(theme: str, shape: str) -> Image.Image:
    h = SHAPES[shape]
    portrait = shape == "portrait"
    canvas = gradient(W, h).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    max_w = W - 2 * MARGIN

    if theme == "book":
        book_h = 640 if portrait else 560
        top = 60 if portrait else 44
        paste_book(canvas, book_h, top)
        draw = ImageDraw.Draw(canvas)
        y = top + book_h + (44 if portrait else 26)
        y = text_block(draw, y, "VERSION 1.0 · RELEASED 13 NOV 2026", font(FONT_BOLD, 36), GOLD, max_w)
        y += 14 if portrait else 6
        y = text_block(draw, y, "The Layered Web", font(FONT_BOLD, 92 if portrait else 84), WHITE, max_w, gap=1.08)
        y += 4
        y = text_block(draw, y, "The Desirable Properties of a Meta-Layer", font(FONT_BOLD, 46 if portrait else 40), SOFT, max_w)
        y += 20 if portrait else 12
        gold_rule(draw, y)
        y += 30 if portrait else 22
        y = text_block(draw, y, "desirableproperties.org/v1", font(FONT_REG, 44 if portrait else 40), MUTED, max_w)
    elif theme == "launch":
        top = 90 if portrait else 70
        y = paste_thumb(canvas, top)
        draw = ImageDraw.Draw(canvas)
        y += 70 if portrait else 50
        y = text_block(draw, y, "LAUNCH EVENT · 13 NOV 2026", font(FONT_BOLD, 36), GOLD, max_w)
        y += 16 if portrait else 8
        y = text_block(draw, y, "Watch the Version 1.0 launch", font(FONT_BOLD, 80 if portrait else 70), WHITE, max_w, gap=1.1)
        y += 10
        if portrait:
            y = text_block(draw, y, "The Layered Web: The Desirable Properties of a Meta-Layer", font(FONT_BOLD, 40), SOFT, max_w)
            y += 26
        else:
            y += 6
        gold_rule(draw, y)
        y += 30 if portrait else 24
        y = text_block(draw, y, "desirableproperties.org/launch", font(FONT_REG, 44 if portrait else 40), MUTED, max_w)
    elif theme == "v1-1":
        top = 70 if portrait else 60
        y = text_block(draw, top, "THE LAYERED WEB · VERSION 1.1", font(FONT_BOLD, 36), GOLD, max_w)
        y += 14
        y = text_block(draw, y, "Help shape Version 1.1", font(FONT_BOLD, 88 if portrait else 78), WHITE, max_w, gap=1.08)
        y += 12
        y = text_block(
            draw, y, "Suggest a change, take a co-editor seat, join steering",
            font(FONT_BOLD, 44 if portrait else 38), SOFT, max_w,
        )
        y += 30 if portrait else 22
        book_h = 620 if portrait else 450
        bottom_reserved = 150 if portrait else 120
        book_h = min(book_h, h - bottom_reserved - y)
        paste_book(canvas, book_h, y)
        draw = ImageDraw.Draw(canvas)
        y += book_h + (30 if portrait else 18)
        gold_rule(draw, y)
        y += 28 if portrait else 20
        y = text_block(draw, y, "desirableproperties.org/improve", font(FONT_REG, 44 if portrait else 40), MUTED, max_w)
    else:
        raise ValueError(theme)

    if y > h - 30:
        raise SystemExit(f"{theme}-{shape}: content ends at {y}px, past the {h}px canvas")
    bottom_bar(draw, h)
    return canvas.convert("RGB")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}
    for theme in ("book", "launch", "v1-1"):
        for shape, h in SHAPES.items():
            im = render(theme, shape)
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=84, optimize=True, progressive=True)
            data = buf.getvalue()
            digest = hashlib.sha256(data).hexdigest()[:8]
            stem = f"{theme}-{shape}"
            for old in OUT_DIR.glob(f"{stem}-*.jpg"):
                old.unlink()
            name = f"{stem}-{digest}.jpg"
            (OUT_DIR / name).write_bytes(data)
            manifest[stem] = {"src": f"/share/{name}", "file": name, "width": W, "height": h, "bytes": len(data)}
            print(f"{name}  {W}x{h}  {len(data) // 1024} KB")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {MANIFEST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
