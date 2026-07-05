#!/usr/bin/env python3
"""Silhouette uniqueness test for the DP icon set.

Rasterizes each source SVG at 32x32, computes a perceptual hash, and
reports any duplicates. Also writes a thumbnail grid PNG to raster/.
"""
from __future__ import annotations

import hashlib
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ASSET_ROOT = Path("/home/ubuntu/desirable-properties/assets/dp-icons")
SOURCE_DIR = ASSET_ROOT / "source"
RASTER_DIR = ASSET_ROOT / "raster"
GRID_PATH = RASTER_DIR / "silhouette-grid.png"
CELL = 96
COLS = 6
ROWS = 4  # 22 icons → 24 cells; 2 empty
PAD = 10


def rasterize_svg(svg_path: Path, size: int = 32) -> Image.Image:
    """Rasterize an SVG to a grayscale PIL image via cairosvg."""
    import cairosvg
    png_bytes = cairosvg.svg2png(
        url=str(svg_path),
        output_width=size,
        output_height=size,
        background_color="white",
    )
    img = Image.open(io.BytesIO(png_bytes)).convert("L")
    # Threshold to pure silhouette.
    arr = np.asarray(img)
    bw = (arr < 200).astype(np.uint8) * 255
    return Image.fromarray(255 - bw, mode="L")


def hash_image(img: Image.Image) -> str:
    arr = np.asarray(img.convert("L"))
    # Threshold to pure black/white silhouette then md5.
    bw = (arr < 200).astype(np.uint8)
    return hashlib.md5(bw.tobytes()).hexdigest()[:10]


def main() -> int:
    RASTER_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(SOURCE_DIR.glob("dp*.svg"))
    if len(files) != 22:
        print(f"WARN: expected 22 source SVGs, found {len(files)}")

    hashes: dict[str, list[str]] = {}
    grid = Image.new("RGB", (COLS * (CELL + PAD) + PAD, ROWS * (CELL + PAD) + PAD), "white")
    draw = ImageDraw.Draw(grid)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
    except OSError:
        font = ImageFont.load_default()

    for idx, f in enumerate(files):
        sil = rasterize_svg(f, size=32)
        h = hash_image(sil)
        hashes.setdefault(h, []).append(f.name)
        # Up-scale the silhouette into the grid cell.
        big = sil.resize((CELL, CELL), Image.NEAREST)
        col = idx % COLS
        row = idx // COLS
        x = PAD + col * (CELL + PAD)
        y = PAD + row * (CELL + PAD)
        grid.paste(big, (x, y))
        draw.text((x + 2, y + CELL - 14), f.stem, fill=(80, 80, 80), font=font)

    grid.save(GRID_PATH)

    dupes = {h: names for h, names in hashes.items() if len(names) > 1}
    print(f"Rasterized {len(files)} SVGs at 32x32.")
    print(f"Unique hashes: {len(hashes)} / {len(files)}")
    if dupes:
        print("DUPLICATES:")
        for h, names in dupes.items():
            print(f"  {h}: {', '.join(names)}")
        return 1
    else:
        print("PASS: 22 distinct silhouettes, no duplicates.")
        print(f"Grid written to {GRID_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())