#!/usr/bin/env bash
# Rasterize the DP icon SVGs to PNG at deployment sizes.
#
# Output:
#   raster/badge-dp{NN}.png        600×600 (badge)
#   raster/cover-dp{NN}.png       1200×630 (workgroup cover / OG image)
#   raster/source-dp{NN}.png        96×96  (icon at standard web size)
#
# Requirements: Python 3 with cairosvg + Pillow installed.
#   pip install cairosvg pillow
#
set -euo pipefail

cd "$(dirname "$0")/.."

python3 <<'PY'
from pathlib import Path
import cairosvg

ROOT = Path(".").resolve()
RASTER = ROOT / "raster"
RASTER.mkdir(exist_ok=True)

for dp_num in range(1, 23):
    nn = f"{dp_num:02d}"

    src = ROOT / "source" / f"dp{nn}.svg"
    cairosvg.svg2png(
        url=str(src),
        write_to=str(RASTER / f"source-dp{nn}.png"),
        output_width=96, output_height=96,
    )

    bdg = ROOT / "badges" / f"dp{nn}.svg"
    cairosvg.svg2png(
        url=str(bdg),
        write_to=str(RASTER / f"badge-dp{nn}.png"),
        output_width=600, output_height=600,
    )

    cov = ROOT / "covers" / f"dp{nn}.svg"
    cairosvg.svg2png(
        url=str(cov),
        write_to=str(RASTER / f"cover-dp{nn}.png"),
        output_width=1200, output_height=630,
    )

print(f"Rasterized 22 DPs × 3 variants to {RASTER}/")
PY