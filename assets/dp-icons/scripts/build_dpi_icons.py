#!/usr/bin/env python3
"""Build the DP icon system: 22 source SVGs, 22 badge SVGs, 22 cover SVGs.

Run from anywhere. Writes to:
  - assets/dp-icons/{source,badges,covers}/dp{NN}.svg
  - gov-hub-dev/static/images/dp-icons/{source,badges,covers}/dp{NN}.svg
  - gov-hub-prod/static/images/dp-icons/{source,badges,covers}/dp{NN}.svg

This is a build script, not runtime code. It encodes the design system
defined in assets/dp-icons/SPEC.md.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# --------------------------------------------------------------------------- #
# Paths                                                                       #
# --------------------------------------------------------------------------- #
REPO_DESIRABLE = Path("/home/ubuntu/desirable-properties")
REPO_DEV = Path("/home/ubuntu/gov-hub-dev")
REPO_PROD = Path("/home/ubuntu/gov-hub-prod")
DESIRABLE_ASSET_ROOT = REPO_DESIRABLE / "assets" / "dp-icons"

DP_JSON = REPO_DESIRABLE / "challenge-site" / "src" / "data" / "desirable-properties.json"

# --------------------------------------------------------------------------- #
# Design system tokens                                                        #
# --------------------------------------------------------------------------- #
GOLD_BORDER = "#b8860b"
GOLD_WASH = "#f5e9c8"
GOLD_CHIP = "#facc15"
INK = "#1f2937"
CAPTION = "#6b7280"
DARK_TEXT = "#1f1b0e"

FAMILIES = {
    "Trust": "#1d4ed8",
    "Governance": "#d97706",
    "Data": "#0d9488",
    "Experience": "#ef1d18",
}

# DP number → (name, family) per the reference infographic.
DP_TABLE = [
    (1,  "Federated Authentication & Accountability", "Trust"),
    (2,  "Participant Agency & Empowerment", "Trust"),
    (3,  "Adaptive Governance Supporting an Exponentially Growing Community", "Trust"),
    (4,  "Data Sovereignty & Privacy", "Trust"),
    (5,  "Decentralized Namespace", "Trust"),
    (6,  "Commerce", "Trust"),
    (7,  "Simplicity and Interoperability", "Trust"),
    (8,  "Collaborative Environment and Meta-Communities", "Governance"),
    (9,  "Developer and Community Incentives", "Governance"),
    (10, "Education", "Governance"),
    (11, "Safe and Ethical AI", "Governance"),
    (12, "Community-based AI Governance", "Governance"),
    (13, "AI Containment", "Governance"),
    (14, "Trust and Transparency", "Governance"),
    (15, "Security and Provenance", "Data"),
    (16, "Roadmap and Milestones", "Data"),
    (17, "Financial Sustainability", "Data"),
    (18, "Feedback Loops and Reputation", "Data"),
    (19, "Amplifying Presence and Community Engagement", "Data"),
    (20, "Community Ownership", "Data"),
    (21, "Multi-modal", "Data"),
    (22, "Civic Memory and Epistemic Continuity", "Experience"),
]

FONT_STACK = 'Inter, "SF Pro Text", "Segoe UI", system-ui, sans-serif'


# --------------------------------------------------------------------------- #
# DP titles                                                                   #
# --------------------------------------------------------------------------- #
def load_dp_titles() -> dict[int, str]:
    titles: dict[int, str] = {}
    if DP_JSON.is_file():
        with DP_JSON.open() as f:
            data = json.load(f)
        for entry in data.get("desirable_properties", []):
            m = re.match(r"DP(\d+)", entry["id"])
            if m:
                titles[int(m.group(1))] = entry["name"]
    # Fallbacks (JSON uses "Civic Memory & Epistemic Continuity" — keep).
    for n, name, _fam in DP_TABLE:
        titles.setdefault(n, name)
    return titles


# --------------------------------------------------------------------------- #
# Container shape per family                                                  #
# --------------------------------------------------------------------------- #
def container_svg(family: str, family_color: str) -> str:
    """Return the SVG fragment for the family container at 24x24 viewBox.

    Gold outer frame + 6% cream wash + bottom-right family-color corner dot.
    """
    if family == "Trust":
        # rounded square with double inner stroke (shield-seal feel)
        body = (
            '<rect x="1.5" y="1.5" width="21" height="21" rx="3" '
            f'fill="{GOLD_WASH}" fill-opacity="0.06" '
            f'stroke="{GOLD_BORDER}" stroke-width="1"/>'
            '<rect x="3" y="3" width="18" height="18" rx="2" '
            'fill="none" stroke="currentColor" stroke-width="0.6" '
            'stroke-opacity="0.55"/>'
        )
    elif family == "Governance":
        # rounded square, single bold stroke (codex feel)
        body = (
            '<rect x="1.5" y="1.5" width="21" height="21" rx="3" '
            f'fill="{GOLD_WASH}" fill-opacity="0.06" '
            f'stroke="{GOLD_BORDER}" stroke-width="1.5"/>'
        )
    elif family == "Data":
        # rounded square, top-right corner clipped at 45° (data-cube feel)
        # Use a path: start at top-left, go right but clip at corner.
        body = (
            '<path d="M 4.5 1.5 '
            'L 19.5 1.5 '
            'L 22.5 4.5 '
            'L 22.5 19.5 '
            'Q 22.5 22.5 19.5 22.5 '
            'L 4.5 22.5 '
            'Q 1.5 22.5 1.5 19.5 '
            'L 1.5 4.5 '
            'Q 1.5 1.5 4.5 1.5 Z" '
            f'fill="{GOLD_WASH}" fill-opacity="0.06" '
            f'stroke="{GOLD_BORDER}" stroke-width="1"/>'
        )
    elif family == "Experience":
        # rounded square with all four corners clipped (architectural)
        body = (
            '<path d="M 4.5 1.5 '
            'L 19.5 1.5 '
            'L 22.5 4.5 '
            'L 22.5 19.5 '
            'L 19.5 22.5 '
            'L 4.5 22.5 '
            'L 1.5 19.5 '
            'L 1.5 4.5 Z" '
            f'fill="{GOLD_WASH}" fill-opacity="0.06" '
            f'stroke="{GOLD_BORDER}" stroke-width="1"/>'
        )
    else:
        # Fallback rounded square
        body = (
            '<rect x="1.5" y="1.5" width="21" height="21" rx="3" '
            f'fill="{GOLD_WASH}" fill-opacity="0.06" '
            f'stroke="{GOLD_BORDER}" stroke-width="1"/>'
        )

    # Bottom-right family-color corner dot.
    corner_dot = (
        f'<circle cx="20" cy="20" r="1.4" fill="{family_color}" stroke="none"/>'
    )

    return body + "\n  " + corner_dot


# --------------------------------------------------------------------------- #
# Glyph compositions (24x24 viewBox)                                          #
# --------------------------------------------------------------------------- #
def glyph_svg(dp_num: int, family: str, family_color: str) -> str:
    """Return the SVG fragment for the DP-specific glyph (no container)."""
    a = family_color  # accent
    c = "currentColor"  # neutral charcoal
    # Helper: small filled dot in accent color
    def dot(cx, cy, r=0.6, color=None):
        col = color or a
        return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{col}" stroke="none"/>'

    if dp_num == 1:
        # 4 circles at cardinal points + central diamond
        return (
            f'<circle cx="12" cy="5" r="2" stroke="{c}" fill="none"/>'
            f'<circle cx="19" cy="12" r="2" stroke="{c}" fill="none"/>'
            f'<circle cx="12" cy="19" r="2" stroke="{c}" fill="none"/>'
            f'<circle cx="5" cy="12" r="2" stroke="{c}" fill="none"/>'
            # central diamond (accountability core)
            f'<path d="M12 9 L15 12 L12 15 L9 12 Z" stroke="{a}" fill="none"/>'
        )
    if dp_num == 2:
        # Central circle with 4 outward arcs
        return (
            f'<circle cx="12" cy="12" r="3" stroke="{c}" fill="none"/>'
            # 4 outward arcs (top, right, bottom, left)
            f'<path d="M12 5 A4 4 0 0 1 16 8" stroke="{a}" fill="none"/>'
            f'<path d="M19 12 A4 4 0 0 1 16 16" stroke="{a}" fill="none"/>'
            f'<path d="M12 19 A4 4 0 0 1 8 16" stroke="{a}" fill="none"/>'
            f'<path d="M5 12 A4 4 0 0 1 8 8" stroke="{a}" fill="none"/>'
        )
    if dp_num == 3:
        # 3 nested squares + central triangle
        return (
            f'<rect x="4" y="4" width="16" height="16" rx="1" stroke="{c}" fill="none" stroke-opacity="0.5"/>'
            f'<rect x="6.5" y="6.5" width="11" height="11" rx="0.8" stroke="{c}" fill="none" stroke-opacity="0.7"/>'
            f'<path d="M12 9.5 L15 14 L9 14 Z" stroke="{a}" fill="none"/>'
            f'{dot(4, 4)}{dot(20, 4)}{dot(4, 20)}{dot(20, 20)}'
        )
    if dp_num == 4:
        # Square with 4 corner triangles + central dot (vault)
        return (
            f'<rect x="4.5" y="4.5" width="15" height="15" rx="1.5" stroke="{c}" fill="none"/>'
            # corner triangles (vault reinforcements)
            f'<path d="M4.5 4.5 L8 4.5 L4.5 8 Z" stroke="{a}" fill="none"/>'
            f'<path d="M19.5 4.5 L16 4.5 L19.5 8 Z" stroke="{a}" fill="none"/>'
            f'<path d="M4.5 19.5 L8 19.5 L4.5 16 Z" stroke="{a}" fill="none"/>'
            f'<path d="M19.5 19.5 L16 19.5 L19.5 16 Z" stroke="{a}" fill="none"/>'
            f'{dot(12, 12, r=1.2)}'
        )
    if dp_num == 5:
        # 3 concentric arcs (quarter rotation each) around a central dot
        return (
            f'<circle cx="12" cy="12" r="1.2" stroke="none" fill="{a}"/>'
            f'<path d="M12 6 A6 6 0 0 1 18 12" stroke="{c}" fill="none"/>'
            f'<path d="M18 12 A6 6 0 0 1 12 18" stroke="{a}" fill="none"/>'
            f'<path d="M12 18 A6 6 0 0 1 6 12" stroke="{c}" fill="none"/>'
            f'<path d="M6 12 A6 6 0 0 1 12 6" stroke="{a}" fill="none"/>'
        )
    if dp_num == 6:
        # 2 circles connected by an arc with 3 event dots between
        return (
            f'<circle cx="6" cy="12" r="2.5" stroke="{c}" fill="none"/>'
            f'<circle cx="18" cy="12" r="2.5" stroke="{c}" fill="none"/>'
            # connecting arc above
            f'<path d="M6 12 Q12 5 18 12" stroke="{a}" fill="none"/>'
            f'{dot(9, 7)}{dot(12, 5.4)}{dot(15, 7)}'
        )
    if dp_num == 7:
        # 2 overlapping squares + central dot
        return (
            f'<rect x="3.5" y="6.5" width="11" height="11" rx="1" stroke="{c}" fill="none"/>'
            f'<rect x="9.5" y="6.5" width="11" height="11" rx="1" stroke="{a}" fill="none"/>'
            f'{dot(12, 12, r=1.4)}'
        )
    if dp_num == 8:
        # Hexagonal ring of 6 dots + central circle
        import math
        parts = [f'<circle cx="12" cy="12" r="2.5" stroke="{c}" fill="none"/>']
        for i in range(6):
            ang = math.pi / 6 + i * (math.pi / 3)
            cx = 12 + 7 * math.cos(ang)
            cy = 12 + 7 * math.sin(ang)
            parts.append(dot(round(cx, 2), round(cy, 2), r=0.9))
        return "\n".join(parts)
    if dp_num == 9:
        # Triangle with 3 ascending dots inside (incentive ladder)
        return (
            f'<path d="M12 5 L19 18 L5 18 Z" stroke="{c}" fill="none"/>'
            f'{dot(12, 14, r=0.9, color=c)}'
            f'{dot(12, 11, r=0.9, color=a)}'
            f'{dot(12, 8, r=0.9, color=a)}'
        )
    if dp_num == 10:
        # 2 nested circles with internal arcs flowing outward
        return (
            f'<circle cx="12" cy="12" r="3" stroke="{c}" fill="none"/>'
            f'<circle cx="12" cy="12" r="7" stroke="{c}" fill="none" stroke-opacity="0.5"/>'
            # 4 outward arcs from inner to outer
            f'<path d="M12 9 A3 3 0 0 1 15 12" stroke="{a}" fill="none"/>'
            f'<path d="M15 12 A3 3 0 0 1 12 15" stroke="{a}" fill="none"/>'
            f'<path d="M12 15 A3 3 0 0 1 9 12" stroke="{a}" fill="none"/>'
            f'<path d="M9 12 A3 3 0 0 1 12 9" stroke="{a}" fill="none"/>'
        )
    if dp_num == 11:
        # Central circle + 1 solid arc + 1 dashed arc
        return (
            f'<circle cx="12" cy="12" r="2.5" stroke="{c}" fill="none"/>'
            f'<path d="M12 4 A8 8 0 0 1 20 12" stroke="{a}" fill="none"/>'
            f'<path d="M12 20 A8 8 0 0 1 4 12" stroke="{a}" fill="none" '
            'stroke-dasharray="2 2"/>'
        )
    if dp_num == 12:
        # Triangle inscribed in circle + 3 dots at vertices
        return (
            f'<circle cx="12" cy="12" r="7" stroke="{c}" fill="none" stroke-opacity="0.5"/>'
            f'<path d="M12 6 L18 17 L6 17 Z" stroke="{a}" fill="none"/>'
            f'{dot(12, 6, r=1.0)}{dot(18, 17, r=1.0)}{dot(6, 17, r=1.0)}'
        )
    if dp_num == 13:
        # Square frame + central triangle + 4 corner arcs (containment)
        return (
            f'<rect x="3.5" y="3.5" width="17" height="17" rx="1" stroke="{c}" fill="none"/>'
            f'<path d="M12 9 L16 16 L8 16 Z" stroke="{a}" fill="none"/>'
            # 4 corner arcs
            f'<path d="M3.5 6 A2.5 2.5 0 0 1 6 3.5" stroke="{a}" fill="none"/>'
            f'<path d="M18 3.5 A2.5 2.5 0 0 1 20.5 6" stroke="{a}" fill="none"/>'
            f'<path d="M20.5 18 A2.5 2.5 0 0 1 18 20.5" stroke="{a}" fill="none"/>'
            f'<path d="M6 20.5 A2.5 2.5 0 0 1 3.5 18" stroke="{a}" fill="none"/>'
        )
    if dp_num == 14:
        # Central circle with 4 triangles at cardinal points
        return (
            f'<circle cx="12" cy="12" r="2.5" stroke="{c}" fill="none"/>'
            # top triangle (pointing up, tip away from center)
            f'<path d="M12 5 L10 8.5 L14 8.5 Z" stroke="{a}" fill="none"/>'
            f'<path d="M19 12 L15.5 10 L15.5 14 Z" stroke="{a}" fill="none"/>'
            f'<path d="M12 19 L14 15.5 L10 15.5 Z" stroke="{a}" fill="none"/>'
            f'<path d="M5 12 L8.5 14 L8.5 10 Z" stroke="{a}" fill="none"/>'
        )
    if dp_num == 15:
        # 3 circles connected by an arc (provenance chain)
        return (
            f'<circle cx="5" cy="12" r="2" stroke="{c}" fill="none"/>'
            f'<circle cx="12" cy="7" r="2" stroke="{c}" fill="none"/>'
            f'<circle cx="19" cy="12" r="2" stroke="{a}" fill="none"/>'
            # arc connecting
            f'<path d="M5 12 Q12 4 19 12" stroke="{a}" fill="none"/>'
            f'<path d="M5 12 Q12 20 19 12" stroke="{c}" fill="none" stroke-opacity="0.5"/>'
        )
    if dp_num == 16:
        # 4 dots connected by a single rising arc
        return (
            f'{dot(4.5, 19, r=1.0, color=c)}'
            f'{dot(9, 14, r=1.0, color=c)}'
            f'{dot(14, 9, r=1.0, color=a)}'
            f'{dot(19, 4.5, r=1.2, color=a)}'
            f'<path d="M4.5 19 Q11.5 7 19 4.5" stroke="{a}" fill="none"/>'
        )
    if dp_num == 17:
        # Triangle + inscribed circle + 3 dots along base (foundation)
        return (
            f'<path d="M12 4 L20 19 L4 19 Z" stroke="{c}" fill="none"/>'
            f'<circle cx="12" cy="14" r="4" stroke="{a}" fill="none"/>'
            f'{dot(7, 19, r=0.9, color=a)}'
            f'{dot(12, 19, r=0.9, color=a)}'
            f'{dot(17, 19, r=0.9, color=a)}'
        )
    if dp_num == 18:
        # 3/4 circular arrow + 3 dots along the arrow
        return (
            f'<path d="M18.5 8 A7 7 0 1 0 19 14" stroke="{a}" fill="none"/>'
            # arrowhead
            f'<path d="M18.5 8 L21 8 L18.5 11" stroke="{a}" fill="none"/>'
            f'{dot(7, 7.5, r=0.9)}'
            f'{dot(5.5, 12, r=0.9)}'
            f'{dot(7.5, 16.5, r=0.9)}'
        )
    if dp_num == 19:
        # Central triangle with 4 radiating arcs (broadcast)
        return (
            f'<path d="M12 9 L15.5 14 L8.5 14 Z" stroke="{c}" fill="none"/>'
            f'<path d="M12 9 A4 4 0 0 1 15.5 14" stroke="{a}" fill="none"/>'
            f'<path d="M15.5 14 A4 4 0 0 1 8.5 14" stroke="{a}" fill="none"/>'
            f'<path d="M8.5 14 A4 4 0 0 1 12 9" stroke="{a}" fill="none"/>'
            # outer radiating arcs
            f'<path d="M19 5 A3 3 0 0 1 19 19" stroke="{a}" fill="none" stroke-opacity="0.6"/>'
            f'<path d="M5 5 A3 3 0 0 0 5 19" stroke="{a}" fill="none" stroke-opacity="0.6"/>'
        )
    if dp_num == 20:
        # 4 squares at corners + central circle + connecting arcs
        return (
            f'<rect x="3" y="3" width="5" height="5" rx="0.5" stroke="{c}" fill="none"/>'
            f'<rect x="16" y="3" width="5" height="5" rx="0.5" stroke="{c}" fill="none"/>'
            f'<rect x="3" y="16" width="5" height="5" rx="0.5" stroke="{c}" fill="none"/>'
            f'<rect x="16" y="16" width="5" height="5" rx="0.5" stroke="{c}" fill="none"/>'
            f'<circle cx="12" cy="12" r="2.5" stroke="{a}" fill="none"/>'
            # connecting arcs from each corner toward center
            f'<path d="M8 5.5 Q10 9 10 10" stroke="{a}" fill="none"/>'
            f'<path d="M16 5.5 Q14 9 14 10" stroke="{a}" fill="none"/>'
            f'<path d="M5.5 16 Q9 14 10 14" stroke="{a}" fill="none"/>'
            f'<path d="M18.5 16 Q15 14 14 14" stroke="{a}" fill="none"/>'
        )
    if dp_num == 21:
        # 3 concentric circles with varying stroke weights
        return (
            f'<circle cx="12" cy="12" r="3" stroke="{a}" fill="none"/>'
            f'<circle cx="12" cy="12" r="6" stroke="{c}" fill="none" stroke-width="1.5"/>'
            f'<circle cx="12" cy="12" r="9" stroke="{c}" fill="none" stroke-width="1" stroke-opacity="0.5"/>'
        )
    if dp_num == 22:
        # Infinity loop passing through 3 nested circles
        return (
            f'<circle cx="6" cy="12" r="3" stroke="{c}" fill="none"/>'
            f'<circle cx="12" cy="12" r="3" stroke="{c}" fill="none"/>'
            f'<circle cx="18" cy="12" r="3" stroke="{a}" fill="none"/>'
            f'<path d="M6 12 C6 8 9 8 12 12 C15 16 18 16 18 12 C18 8 15 8 12 12 C9 16 6 16 6 12 Z" '
            f'stroke="{a}" fill="none" stroke-opacity="0.7"/>'
        )
    raise ValueError(f"No glyph for DP{dp_num}")


# --------------------------------------------------------------------------- #
# Build source SVG (24x24)                                                    #
# --------------------------------------------------------------------------- #
def build_source(dp_num: int, name: str, family: str) -> str:
    family_color = FAMILIES[family]
    container = container_svg(family, family_color)
    glyph = glyph_svg(dp_num, family, family_color)
    title = name.replace("&", "&amp;")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num} — {title}</title>
  {container}
  {glyph}
</svg>
"""


# --------------------------------------------------------------------------- #
# Build badge SVG (600x600)                                                   #
# --------------------------------------------------------------------------- #
def build_badge(dp_num: int, name: str, family: str) -> str:
    family_color = FAMILIES[family]
    # The 24x24 source gets scaled to 540x540 inside the 600x600 frame
    # (30 px gold margin on each side).
    # We re-emit the source's strokes via a nested <svg> with the same
    # viewBox so we get free scale.
    inner = build_source_inner_only(dp_num, family, family_color)
    title = name.replace("&", "&amp;")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num} — {title}</title>
  <!-- background -->
  <rect width="600" height="600" fill="#ffffff"/>
  <!-- gold outer frame -->
  <rect x="6" y="6" width="588" height="588" rx="18" fill="none" stroke="{GOLD_BORDER}" stroke-width="6"/>
  <!-- corner gold accent chip (top-left, behind DPnn label) -->
  <rect x="0" y="0" width="120" height="80" fill="{GOLD_CHIP}" fill-opacity="0.18"/>
  <!-- DPnn label, top-left -->
  <text x="36" y="68" font-family='{FONT_STACK}' font-size="64" font-weight="700" fill="{family_color}" letter-spacing="-1">DP{dp_num:02d}</text>
  <!-- family name, top-right -->
  <text x="564" y="68" font-family='{FONT_STACK}' font-size="22" font-weight="500" fill="{CAPTION}" text-anchor="end" letter-spacing="1.5">{family.upper()}</text>
  <!-- icon at 30,90 → 570,510 (540x540) -->
  <svg x="30" y="90" width="540" height="540" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    {inner}
  </svg>
</svg>
"""


def build_source_inner_only(dp_num: int, family: str, family_color: str) -> str:
    """Like build_source but returns only the container + glyph fragments
    (no <svg> wrapper) for embedding inside another viewBox."""
    return container_svg(family, family_color) + "\n    " + glyph_svg(dp_num, family, family_color)


# --------------------------------------------------------------------------- #
# Build cover SVG (1200x630)                                                  #
# --------------------------------------------------------------------------- #
def build_cover(dp_num: int, name: str, family: str) -> str:
    family_color = FAMILIES[family]
    title = name.replace("&", "&amp;")
    # Word-wrap the title for the right strip. Title strip is at x=600,
    # width=600. We split the title manually into ~3 lines at 64px font.
    lines = _wrap_title(name, max_chars=22)

    # Icon at left half: 480x480 centered in 0→600.
    inner = build_source_inner_only(dp_num, family, family_color)

    # Build title strip lines as <text> elements.
    line_y_start = 220
    line_height = 80
    text_lines = []
    for i, line in enumerate(lines):
        safe = line.replace("&", "&amp;")
        text_lines.append(
            f'<text x="640" y="{line_y_start + i * line_height}" '
            f'font-family=\'{FONT_STACK}\' font-size="64" font-weight="700" '
            f'fill="{DARK_TEXT}">{safe}</text>'
        )
    lines_svg = "\n  ".join(text_lines)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num} — {title}</title>
  <!-- background -->
  <rect width="1200" height="630" fill="#ffffff"/>
  <!-- gold border -->
  <rect x="4" y="4" width="1192" height="622" rx="6" fill="none" stroke="{GOLD_BORDER}" stroke-width="4"/>
  <!-- title strip background, family color at 12% -->
  <rect x="600" y="4" width="596" height="622" fill="{family_color}" fill-opacity="0.10"/>
  <!-- divider line -->
  <line x1="600" y1="4" x2="600" y2="626" stroke="{family_color}" stroke-width="2" stroke-opacity="0.5"/>
  <!-- icon at left half: 480x480 centered -->
  <svg x="60" y="75" width="480" height="480" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    {inner}
  </svg>
  <!-- DPnn big label, above title -->
  <text x="640" y="120" font-family='{FONT_STACK}' font-size="32" font-weight="700" fill="{family_color}" letter-spacing="3">DP{dp_num:02d}</text>
  <!-- title text lines -->
  {lines_svg}
  <!-- caption bottom-left -->
  <text x="32" y="600" font-family='{FONT_STACK}' font-size="22" font-weight="500" fill="{CAPTION}" letter-spacing="1.5">DP{dp_num:02d} · {family.upper()}</text>
  <!-- family-color corner dot bottom-right -->
  <circle cx="1170" cy="600" r="10" fill="{family_color}"/>
</svg>
"""


def _wrap_title(title: str, max_chars: int) -> list[str]:
    """Naive word-wrap. Targets max_chars per line for 64 px sans-serif."""
    words = title.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= max_chars:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines[:3]  # at most 3 lines


# --------------------------------------------------------------------------- #
# Main                                                                        #
# --------------------------------------------------------------------------- #
def main() -> int:
    titles = load_dp_titles()

    # Source / Badges / Covers for desirable-properties
    targets = [
        DESIRABLE_ASSET_ROOT / "source",
        REPO_DEV / "static" / "images" / "dp-icons" / "source",
        REPO_PROD / "static" / "images" / "dp-icons" / "source",
    ]
    for t in targets:
        t.mkdir(parents=True, exist_ok=True)

    badge_targets = [
        DESIRABLE_ASSET_ROOT / "badges",
        REPO_DEV / "static" / "images" / "dp-icons" / "badges",
        REPO_PROD / "static" / "images" / "dp-icons" / "badges",
    ]
    for t in badge_targets:
        t.mkdir(parents=True, exist_ok=True)

    cover_targets = [
        DESIRABLE_ASSET_ROOT / "covers",
        REPO_DEV / "static" / "images" / "dp-icons" / "covers",
        REPO_PROD / "static" / "images" / "dp-icons" / "covers",
    ]
    for t in cover_targets:
        t.mkdir(parents=True, exist_ok=True)

    for dp_num, name, family in DP_TABLE:
        title_name = titles.get(dp_num, name)
        src = build_source(dp_num, title_name, family)
        bdg = build_badge(dp_num, title_name, family)
        cov = build_cover(dp_num, title_name, family)

        for d in targets:
            (d / f"dp{dp_num:02d}.svg").write_text(src)
        for d in badge_targets:
            (d / f"dp{dp_num:02d}.svg").write_text(bdg)
        for d in cover_targets:
            (d / f"dp{dp_num:02d}.svg").write_text(cov)

    print(f"Wrote {len(DP_TABLE)} DPs × 3 variants × 3 sites = "
          f"{len(DP_TABLE) * 3 * 3} SVG files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())