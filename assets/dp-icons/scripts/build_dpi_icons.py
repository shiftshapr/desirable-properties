#!/usr/bin/env python3
"""Build the DP icon system v2 — recognizable metaphors on gold-framed badges.

Design rationale (see assets/dp-icons/SPEC.md):
  * Recognizability is the lead principle. Every glyph must read in 1
    second to a stranger at 96x96.
  * Six thematic groups (per the user's reference image).
  * Gold brand is non-negotiable: outer frame + DPnn label are gold.
  * Group color is the *thematic accent*, applied to the glyph and the
    2-letter code.
  * Each glyph is a literal-but-elevated metaphor (fingerprint, brain,
    megaphone, etc.) — not an abstract five-primitive composition.
  * White background inside the gold frame.

Outputs (per repo):
  - source/dp{NN}.svg    : 24x24 source glyph
  - badges/dp{NN}.svg    : 600x600 white badge with gold frame + glyph + labels
  - covers/dp{NN}.svg    : 1200x630 cover (badge left + title strip right)

Mirrored to:
  - /home/ubuntu/desirable-properties/assets/dp-icons/
  - /home/ubuntu/gov-hub-dev/static/images/dp-icons/
  - /home/ubuntu/gov-hub-prod/static/images/dp-icons/
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

DP_JSON = REPO_DESIRABLE / "web-app" / "data" / "desirable-properties.json"

# --------------------------------------------------------------------------- #
# Brand & palette tokens                                                       #
# --------------------------------------------------------------------------- #
# Brand
GOLD_BORDER = "#b8860b"        # darkgoldenrod — outer frame (brand)
GOLD_WASH = "#f5e9c8"          # cream wash inside the frame (4% opacity)

# Neutrals
WHITE = "#ffffff"
INK = "#1f2937"                # neutral charcoal (used sparingly)
CAPTION = "#6b7280"            # neutral gray for full titles in badges
DARK_TEXT = "#1f1b0e"          # warm near-black for cover title text

# Six thematic groups (per the user's reference image).
# Group colors are tuned for legibility at 96x96 on a white background
# inside a gold frame.
GROUPS = {
    "Auth":        "#06b6d4",  # cyan      — Authentication, Agency & Accountability
    "Sovereignty": "#10b981",  # green     — Sovereignty & Privacy
    "Interop":     "#d946ef",  # magenta   — Interoperability & Participant Experience
    "AI":          "#7c3aed",  # deep purple — AI Governance & Safety
    "Security":    "#ef4444",  # red       — Security, Transparency & Trust
    "Community":   "#f59e0b",  # amber     — Community Participation & Feedback
}

# Group display names (used in the comparison sheet and cover).
GROUP_LABEL = {
    "Auth":        "Authentication, Agency & Accountability",
    "Sovereignty": "Sovereignty & Privacy",
    "Interop":     "Interoperability & Participant Experience",
    "AI":          "AI Governance & Safety",
    "Security":    "Security, Transparency & Trust",
    "Community":   "Community Participation & Feedback",
}

# DP number → (full title, 2-letter code, group, glyph_id, short_title)
# Title comes from desirable-properties.json where possible; DP22 is
# overridden to "Epistemic Continuity & Digital Artifacts" per the user's
# reference image (the JSON still says "Civic Memory & Epistemic
# Continuity"; the reference image rename is what we ship).
DP_TABLE = [
    (1,  "Federated Authentication & Accountability",                        "Au", "Auth",       "fingerprint",  "Federated Auth"),
    (2,  "Participant Agency & Empowerment",                                  "Ag", "Auth",       "person",       "Participant Agency"),
    (3,  "Adaptive Governance Supporting an Exponentially Growing Community", "Go", "Auth",       "gears",        "Adaptive Governance"),
    (4,  "Data Sovereignty & Privacy",                                        "So", "Sovereignty","shield_keyhole","Data Sovereignty"),
    (5,  "Decentralized Namespace",                                           "Ns", "Sovereignty","dharma_wheel", "Decentralized Namespace"),
    (6,  "Commerce",                                                          "Co", "Sovereignty","cart",         "Commerce"),
    (7,  "Simplicity & Interoperability",                                     "Si", "Interop",    "puzzle",       "Simplicity"),
    (8,  "Collaborative Environment & Meta-Communities",                      "Cm", "Interop",    "network",      "Collaboration"),
    (9,  "Developer & Community Incentives",                                  "In", "Interop",    "rocket",       "Incentives"),
    (10, "Education",                                                         "Ed", "Interop",    "book_bulb",    "Education"),
    (11, "Safe & Ethical AI",                                                 "Ai", "AI",         "brain",        "Safe AI"),
    (12, "Community-Based AI Governance",                                     "Cg", "AI",         "community_graph","AI Governance"),
    (13, "AI Containment",                                                    "Ac", "AI",         "padlock",      "AI Containment"),
    (14, "Trust & Transparency",                                              "Tt", "Security",   "handshake",    "Trust"),
    (15, "Security & Provenance",                                             "Sp", "Security",   "shield_check", "Security"),
    (16, "Roadmap & Milestones",                                              "Rm", "Security",   "roadmap",      "Roadmap"),
    (17, "Financial Sustainability",                                          "Fs", "Security",   "dollar_circle","Sustainability"),
    (18, "Feedback Loops & Reputation",                                       "Fr", "Community",  "message_loop", "Feedback"),
    (19, "Amplifying Presence & Community Engagement",                        "Ap", "Community",  "megaphone",    "Amplifying Presence"),
    (20, "Community Ownership",                                               "Ow", "Community",  "globe_people", "Community Ownership"),
    (21, "Multi-modal",                                                       "Mm", "Interop",    "waveform",     "Multi-modal"),
    (22, "Epistemic Continuity & Digital Artifacts",                          "Ep", "Community",  "scroll",       "Epistemic Continuity"),
]

DP22_OVERRIDE_TITLE = "Epistemic Continuity & Digital Artifacts"

FONT_STACK = 'Inter, "SF Pro Text", "Segoe UI", system-ui, sans-serif'

# Stroke widths in the 24x24 viewBox.
GLYPH_STROKE = 2.2
GLYPH_FINE_STROKE = 1.4
FRAME_STROKE = 0.18  # gold frame stroke at source viewBox scale


# --------------------------------------------------------------------------- #
# Title loading                                                                #
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
    # Apply DP22 override (per reference image) + DP_TABLE fallbacks.
    titles[22] = DP22_OVERRIDE_TITLE
    for n, name, _code, _group, _glyph, _short in DP_TABLE:
        titles.setdefault(n, name)
    return titles


# --------------------------------------------------------------------------- #
# Frame                                                                       #
# --------------------------------------------------------------------------- #
def frame_svg() -> str:
    """Return the SVG fragment for the badge frame at 24x24 viewBox.

    Single rounded square. Gold outer frame, cream wash inside. Identical
    across all 22 badges — family color appears only on the glyph and
    2-letter code.
    """
    return (
        f'<rect x="1.0" y="1.0" width="22" height="22" rx="2.4" '
        f'fill="{GOLD_WASH}" fill-opacity="0.04" '
        f'stroke="{GOLD_BORDER}" stroke-width="{FRAME_STROKE}"/>'
    )


# --------------------------------------------------------------------------- #
# Glyph compositions (24x24 viewBox)                                          #
# --------------------------------------------------------------------------- #
def glyph_svg(glyph_id: str, family_color: str) -> str:
    """Return the SVG fragment for the named glyph in `family_color`."""
    a = family_color
    sw = GLYPH_STROKE
    sw2 = GLYPH_FINE_STROKE

    def path(d, fill="none", stroke=a, stroke_width=sw,
             stroke_opacity=1.0, linejoin="round", linecap="round",
             stroke_dasharray=None):
        da = f' stroke-dasharray="{stroke_dasharray}"' if stroke_dasharray else ""
        return (
            f'<path d="{d}" fill="{fill}" stroke="{stroke}" '
            f'stroke-width="{stroke_width}" stroke-opacity="{stroke_opacity}" '
            f'stroke-linejoin="{linejoin}" stroke-linecap="{linecap}"{da}/>'
        )

    def circle(cx, cy, r, fill="none", stroke="none", stroke_width=sw,
               stroke_opacity=1.0):
        return (
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" '
            f'stroke="{stroke}" stroke-width="{stroke_width}" '
            f'stroke-opacity="{stroke_opacity}"/>'
        )

    # ----------------------------------------------------------------- #
    if glyph_id == "fingerprint":
        # Concentric arcs forming a fingerprint (open at the bottom).
        return "".join([
            # Outer ridge
            path("M 5 10 Q 5 4 12 4 Q 19 4 19 11", stroke=a, stroke_width=sw),
            # Mid ridge
            path("M 7 13 Q 7 7 12 7 Q 17 7 17 13", stroke=a, stroke_width=sw),
            # Inner ridge
            path("M 9 15 Q 9 10 12 10 Q 15 10 15 14", stroke=a, stroke_width=sw),
            # Lower arc
            path("M 6 17 Q 8 19 12 19 Q 16 19 18 17", stroke=a, stroke_width=sw),
            # Core dot
            circle(12, 13, 1.0, fill=a, stroke="none"),
        ])

    if glyph_id == "person":
        # Single figure with arms outstretched — agency/empowerment.
        return "".join([
            # Head
            circle(12, 5, 2.4, fill=a, stroke="none"),
            # Body (rounded shoulders)
            path(
                "M 7 21 L 7 16 Q 7 12 12 12 Q 17 12 17 16 L 17 21",
                fill="none", stroke=a, stroke_width=sw,
            ),
            # Outstretched arms
            path("M 7 14 L 3 11", fill="none", stroke=a, stroke_width=sw),
            path("M 17 14 L 21 11", fill="none", stroke=a, stroke_width=sw),
        ])

    if glyph_id == "gears":
        # Two interlocking gears — simple cog outlines.
        return "".join([
            # Large gear (top-left): cog with 6 visible teeth
            '<path d="M 9 4.0 L 10.2 4.0 L 10.5 6.0 '
            'A 3.6 3.6 0 0 1 12.0 6.5 '
            'L 13.4 5.0 L 14.3 5.9 L 13.0 7.4 '
            'A 3.6 3.6 0 0 1 13.6 8.9 '
            'L 15.5 9.2 L 15.5 10.4 L 13.6 10.7 '
            'A 3.6 3.6 0 0 1 13.0 12.2 '
            'L 14.3 13.7 L 13.4 14.6 L 12.0 13.1 '
            'A 3.6 3.6 0 0 1 10.5 13.6 '
            'L 10.2 15.6 L 9.0 15.6 L 8.7 13.6 '
            'A 3.6 3.6 0 0 1 7.2 13.1 '
            'L 5.8 14.6 L 4.9 13.7 L 6.2 12.2 '
            'A 3.6 3.6 0 0 1 5.6 10.7 '
            'L 3.7 10.4 L 3.7 9.2 L 5.6 8.9 '
            'A 3.6 3.6 0 0 1 6.2 7.4 '
            'L 4.9 5.9 L 5.8 5.0 L 7.2 6.5 '
            'A 3.6 3.6 0 0 1 8.7 6.0 '
            'L 9.0 4.0 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Inner hole of large gear
            circle(9.6, 9.8, 1.2, fill=a, stroke="none"),
            # Small gear (bottom-right): smaller cog with 4 visible teeth
            '<path d="M 16 13.5 L 16.9 13.5 L 17.1 14.7 '
            'A 2.4 2.4 0 0 1 18.1 15.1 '
            'L 19.0 14.4 L 19.6 15.0 L 19.0 16.0 '
            'A 2.4 2.4 0 0 1 19.3 17.0 '
            'L 20.5 17.2 L 20.5 18.1 L 19.3 18.3 '
            'A 2.4 2.4 0 0 1 19.0 19.3 '
            'L 19.6 20.3 L 19.0 20.9 L 18.1 20.2 '
            'A 2.4 2.4 0 0 1 17.1 20.6 '
            'L 16.9 21.8 L 16.0 21.8 L 15.8 20.6 '
            'A 2.4 2.4 0 0 1 14.8 20.2 '
            'L 13.9 20.9 L 13.3 20.3 L 13.9 19.3 '
            'A 2.4 2.4 0 0 1 13.6 18.3 '
            'L 12.4 18.1 L 12.4 17.2 L 13.6 17.0 '
            'A 2.4 2.4 0 0 1 13.9 16.0 '
            'L 13.3 15.0 L 13.9 14.4 L 14.8 15.1 '
            'A 2.4 2.4 0 0 1 15.8 14.7 '
            'L 16 13.5 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Inner hole of small gear
            circle(16.45, 17.65, 0.8, fill=a, stroke="none"),
        ])

    if glyph_id == "shield_keyhole":
        # Shield outline with keyhole inside (data sovereignty).
        return "".join([
            '<path d="M 12 3 L 19 6 L 19 12 Q 19 17 12 21 Q 5 17 5 12 L 5 6 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" stroke-linejoin="round"/>',
            # Keyhole circle
            circle(12, 11, 1.6, fill=a, stroke="none"),
            # Keyhole stem
            path("M 11 12 L 10.2 16 L 13.8 16 L 13 12 Z",
                 fill=a, stroke="none"),
        ])

    if glyph_id == "dharma_wheel":
        # Decentralized namespace as a dharma-wheel / orbit:
        # outer ring + inner ring + 8 spokes + central hub + 8 outer nodes.
        import math
        parts = [
            circle(12, 12, 8.5, fill="none", stroke=a, stroke_width=sw),
            circle(12, 12, 5.5, fill="none", stroke=a, stroke_width=sw2,
                   stroke_opacity=0.6),
            circle(12, 12, 1.4, fill=a, stroke="none"),
        ]
        # 8 spokes + 8 outer nodes
        for i in range(8):
            ang = i * (math.pi / 4)
            x1 = 12 + 5.5 * math.cos(ang)
            y1 = 12 + 5.5 * math.sin(ang)
            x2 = 12 + 8.5 * math.cos(ang)
            y2 = 12 + 8.5 * math.sin(ang)
            parts.append(
                f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
                f'stroke="{a}" stroke-width="{sw2}" stroke-linecap="round"/>'
            )
            parts.append(circle(round(x2, 2), round(y2, 2), 1.0,
                                fill=a, stroke="none"))
        return "".join(parts)

    if glyph_id == "cart":
        # Shopping cart — commerce.
        return "".join([
            '<path d="M 4 6 L 6 6 L 7.5 14 L 18 14 L 20 8 L 8 8" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>',
            # Handle
            path("M 4 6 L 3 4", fill="none", stroke=a, stroke_width=sw),
            # Wheels
            circle(9, 18, 1.4, fill="none", stroke=a, stroke_width=sw),
            circle(17, 18, 1.4, fill="none", stroke=a, stroke_width=sw),
        ])

    if glyph_id == "puzzle":
        # Single puzzle piece — interoperability.
        return "".join([
            '<path d="M 4.5 6 L 10 6 L 10 8 Q 10 10 12 10 Q 14 10 14 8 L 14 6 '
            'L 19.5 6 L 19.5 11 Q 21 11 21 13 Q 21 15 19.5 15 L 19.5 20 '
            'L 4.5 20 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>',
        ])

    if glyph_id == "network":
        # Network of 6 nodes connected to a central node.
        import math
        parts = [circle(12, 12, 2.4, fill="none", stroke=a, stroke_width=sw)]
        for i in range(6):
            ang = -math.pi / 2 + i * (math.pi / 3)
            cx = 12 + 7.5 * math.cos(ang)
            cy = 12 + 7.5 * math.sin(ang)
            parts.append(
                f'<line x1="12" y1="12" x2="{cx:.2f}" y2="{cy:.2f}" '
                f'stroke="{a}" stroke-width="{sw2}" stroke-opacity="0.7"/>'
            )
            parts.append(circle(round(cx, 2), round(cy, 2), 1.4,
                                fill=a, stroke="none"))
        return "".join(parts)

    if glyph_id == "rocket":
        # Rocket — developer & community incentives (launch).
        return "".join([
            '<path d="M 12 3 Q 15 5 15 9 L 15 16 L 9 16 L 9 9 Q 9 5 12 3 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Window
            circle(12, 9, 1.5, fill="none", stroke=a, stroke_width=sw2),
            # Left fin
            '<path d="M 9 12 L 5 16 L 5 19 L 9 17 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Right fin
            '<path d="M 15 12 L 19 16 L 19 19 L 15 17 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Flame
            '<path d="M 10 16 Q 12 20 14 16 L 13.5 18 L 12 21 L 10.5 18 Z" '
            f'fill="{a}" stroke="none"/>',
        ])

    if glyph_id == "book_bulb":
        # Open book with a lightbulb above — education.
        return "".join([
            # Lightbulb (top)
            circle(12, 7, 2.6, fill="none", stroke=a, stroke_width=sw),
            # Bulb base lines
            path("M 10.5 9 L 13.5 9", fill="none", stroke=a,
                 stroke_width=sw2),
            path("M 11 10.5 L 13 10.5", fill="none", stroke=a,
                 stroke_width=sw2),
            # Open book (bottom) — two pages
            '<path d="M 3 14 Q 7.5 12.5 12 14 Q 16.5 12.5 21 14 L 21 20 '
            'Q 16.5 18.5 12 20 Q 7.5 18.5 3 20 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Center spine of the book
            path("M 12 14 L 12 20", fill="none", stroke=a, stroke_width=sw2),
        ])

    if glyph_id == "brain":
        # Brain — safe & ethical AI. Two hemispheres with central fissure.
        return "".join([
            # Outer brain outline
            '<path d="M 8 4 Q 4 4 4 8 Q 2 9 3 12 Q 2 15 4 16 Q 4 20 8 20 '
            'L 12 20 L 12 4 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            '<path d="M 16 4 Q 20 4 20 8 Q 22 9 21 12 Q 22 15 20 16 '
            'Q 20 20 16 20 L 12 20 L 12 4 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Fissure lines (left hemisphere)
            path("M 6 8 Q 8 9 6 11", fill="none", stroke=a, stroke_width=sw2),
            path("M 5 13 Q 8 14 6 16", fill="none", stroke=a, stroke_width=sw2),
            # Fissure lines (right hemisphere)
            path("M 18 8 Q 16 9 18 11", fill="none", stroke=a, stroke_width=sw2),
            path("M 19 13 Q 16 14 18 16", fill="none", stroke=a, stroke_width=sw2),
            # Central fissure
            path("M 12 4 L 12 20", fill="none", stroke=a, stroke_width=sw),
        ])

    if glyph_id == "community_graph":
        # Triangle with 3 dots at vertices + central AI node.
        return "".join([
            # Outer triangle
            '<path d="M 12 4 L 20 18 L 4 18 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Central node (the AI being governed)
            circle(12, 13, 1.5, fill=a, stroke="none"),
            # Vertex nodes
            circle(12, 4, 1.6, fill=a, stroke="none"),
            circle(20, 18, 1.6, fill=a, stroke="none"),
            circle(4, 18, 1.6, fill=a, stroke="none"),
        ])

    if glyph_id == "padlock":
        # Padlock with shackle — AI containment.
        return "".join([
            # Shackle
            '<path d="M 8 11 L 8 8 Q 8 4 12 4 Q 16 4 16 8 L 16 11" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>',
            # Body
            '<rect x="5" y="11" width="14" height="10" rx="1.5" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Keyhole
            circle(12, 15, 1.0, fill=a, stroke="none"),
            path("M 12 15.8 L 12 18", fill="none", stroke=a, stroke_width=sw),
        ])

    if glyph_id == "handshake":
        # Two hands clasping — trust & transparency.
        # Stylized handshake silhouette: two arms meeting at the center,
        # each with a thumb wrapping over the clasp.
        return "".join([
            # Left arm/sleeve (lower-left to center, slight angle)
            '<path d="M 3 18 L 7 18 L 9 14 L 11 14" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>',
            # Right arm/sleeve (lower-right to center)
            '<path d="M 21 18 L 17 18 L 15 14 L 13 14" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="round"/>',
            # Left hand (palm) — rounded shape wrapping around center
            '<path d="M 7 14 Q 7 11 10 11 L 12 11 Q 13 11 13 12 L 13 14 '
            'Q 13 15 12 15 L 10 15 Q 8 15 8 14 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Right hand (palm) — wraps over the left
            '<path d="M 17 14 Q 17 11 14 11 L 12 11 Q 11 11 11 12 L 11 14 '
            'Q 11 15 12 15 L 14 15 Q 16 15 16 14 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Thumb-up at center (the meeting point)
            path("M 11 11 L 12 9 L 13 11", fill="none", stroke=a,
                 stroke_width=sw),
        ])

    if glyph_id == "shield_check":
        # Shield with a checkmark — security & provenance.
        return "".join([
            '<path d="M 12 3 L 19 6 L 19 12 Q 19 17 12 21 Q 5 17 5 12 L 5 6 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Checkmark
            path("M 8 12 L 11 15 L 16 9", fill="none", stroke=a,
                 stroke_width=sw),
        ])

    if glyph_id == "roadmap":
        # Winding path with a flag at the end — roadmap & milestones.
        return "".join([
            # Dashed path
            path(
                "M 4 19 Q 6 14 9 13 Q 13 12 13 8 Q 13 5 17 4",
                fill="none", stroke=a, stroke_width=sw,
                stroke_dasharray="2.0 1.6",
            ),
            # Milestone dots
            circle(4, 19, 1.0, fill=a, stroke="none"),
            circle(9, 13, 1.0, fill=a, stroke="none"),
            circle(13, 8, 1.0, fill=a, stroke="none"),
            # Flag pole
            path("M 17 4 L 17 12", fill="none", stroke=a, stroke_width=sw),
            # Flag triangle
            '<path d="M 17 4 L 21 5.5 L 17 7 Z" '
            f'fill="{a}" stroke="{a}" stroke-width="{sw2}" '
            f'stroke-linejoin="round"/>',
        ])

    if glyph_id == "dollar_circle":
        # Dollar sign inside a circle — financial sustainability.
        return "".join([
            circle(12, 12, 8.5, fill="none", stroke=a, stroke_width=sw),
            # Vertical bar
            path("M 12 7 L 12 17", fill="none", stroke=a, stroke_width=sw2),
            # S-curve
            '<path d="M 15 9 Q 15 7 12 7 L 11 7 Q 9 7 9 9 Q 9 11 11 11 '
            'L 13 11 Q 15 11 15 13 Q 15 15 13 15 L 11 15 Q 9 15 9 13" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>',
        ])

    if glyph_id == "message_loop":
        # Speech bubble with three dots — feedback loops.
        return "".join([
            '<path d="M 4 5 L 20 5 Q 21 5 21 6 L 21 15 Q 21 16 20 16 L 12 16 '
            'L 8 20 L 8 16 L 4 16 Q 3 16 3 15 L 3 6 Q 3 5 4 5 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Three dots inside
            circle(8, 10.5, 0.9, fill=a, stroke="none"),
            circle(12, 10.5, 0.9, fill=a, stroke="none"),
            circle(16, 10.5, 0.9, fill=a, stroke="none"),
        ])

    if glyph_id == "megaphone":
        # Megaphone — amplifying presence & community engagement.
        return "".join([
            '<path d="M 4 10 L 4 14 L 12 16 L 20 18 L 20 6 L 12 8 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Handle
            '<rect x="3" y="10.5" width="2" height="3" rx="0.4" '
            f'fill="{a}" stroke="none"/>',
            # Sound waves
            path("M 21 9 Q 22.5 12 21 15", fill="none", stroke=a,
                 stroke_width=sw2),
            path("M 19 10.5 Q 20 12 19 13.5", fill="none", stroke=a,
                 stroke_width=sw2, stroke_opacity=0.7),
        ])

    if glyph_id == "globe_people":
        # Globe with 4 small person heads around it — community ownership.
        return "".join([
            # Globe circle
            circle(12, 12, 5.5, fill="none", stroke=a, stroke_width=sw),
            # Latitude line
            path("M 6.5 12 L 17.5 12", fill="none", stroke=a,
                 stroke_width=sw2, stroke_opacity=0.6),
            # Longitude curves
            path("M 12 6.5 Q 8 12 12 17.5", fill="none", stroke=a,
                 stroke_width=sw2, stroke_opacity=0.6),
            path("M 12 6.5 Q 16 12 12 17.5", fill="none", stroke=a,
                 stroke_width=sw2, stroke_opacity=0.6),
            # 4 person figures around the globe (head + small body curve)
            # Top-left
            circle(3, 4, 1.1, fill=a, stroke="none"),
            path("M 1.5 8 Q 3 7 4.5 8", fill="none", stroke=a, stroke_width=sw2),
            # Top-right
            circle(21, 4, 1.1, fill=a, stroke="none"),
            path("M 19.5 8 Q 21 7 22.5 8", fill="none", stroke=a, stroke_width=sw2),
            # Bottom-left
            circle(3, 20, 1.1, fill=a, stroke="none"),
            path("M 1.5 22 Q 3 23 4.5 22", fill="none", stroke=a, stroke_width=sw2),
            # Bottom-right
            circle(21, 20, 1.1, fill=a, stroke="none"),
            path("M 19.5 22 Q 21 23 22.5 22", fill="none", stroke=a, stroke_width=sw2),
        ])

    if glyph_id == "waveform":
        # Audio waveform — multi-modal interfaces.
        return "".join([
            f'<rect x="3"  y="10" width="2" height="4" rx="1" fill="{a}" stroke="none"/>',
            f'<rect x="6"  y="7"  width="2" height="10" rx="1" fill="{a}" stroke="none"/>',
            f'<rect x="9"  y="4"  width="2" height="16" rx="1" fill="{a}" stroke="none"/>',
            f'<rect x="12" y="6"  width="2" height="12" rx="1" fill="{a}" stroke="none"/>',
            f'<rect x="15" y="9"  width="2" height="6" rx="1" fill="{a}" stroke="none"/>',
            f'<rect x="18" y="11" width="2" height="2" rx="1" fill="{a}" stroke="none"/>',
        ])

    if glyph_id == "scroll":
        # Open scroll — epistemic continuity & digital artifacts.
        return "".join([
            '<path d="M 5 6 Q 5 4 7 4 L 17 4 Q 19 4 19 6 L 19 18 Q 19 20 17 20 '
            'L 7 20 Q 5 20 5 18 Z" '
            f'fill="none" stroke="{a}" stroke-width="{sw}" '
            f'stroke-linejoin="round"/>',
            # Lines of text on the scroll
            path("M 8 9 L 16 9", fill="none", stroke=a, stroke_width=sw2),
            path("M 8 12 L 16 12", fill="none", stroke=a, stroke_width=sw2),
            path("M 8 15 L 14 15", fill="none", stroke=a, stroke_width=sw2),
            # Curl accents
            circle(5, 6, 0.7, fill=a, stroke="none"),
            circle(19, 6, 0.7, fill=a, stroke="none"),
            circle(5, 18, 0.7, fill=a, stroke="none"),
            circle(19, 18, 0.7, fill=a, stroke="none"),
        ])

    raise ValueError(f"Unknown glyph_id: {glyph_id}")


# --------------------------------------------------------------------------- #
# Build source SVG (24x24)                                                    #
# --------------------------------------------------------------------------- #
def build_source(dp_num: int, name: str, code: str, group: str,
                 glyph_id: str) -> str:
    family_color = GROUPS[group]
    frame = frame_svg()
    glyph = glyph_svg(glyph_id, family_color)
    title = name.replace("&", "&amp;")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num} — {code} — {title}</title>
  {frame}
  {glyph}
</svg>
"""


def build_source_inner_only(dp_num: int, code: str, group: str,
                            glyph_id: str) -> str:
    """Like build_source but returns only the frame + glyph fragments (no
    <svg> wrapper) for embedding inside another viewBox."""
    family_color = GROUPS[group]
    return frame_svg() + "\n  " + glyph_svg(glyph_id, family_color)


# --------------------------------------------------------------------------- #
# Build badge SVG (600x600)                                                   #
# --------------------------------------------------------------------------- #
def build_badge(dp_num: int, name: str, code: str, group: str,
                glyph_id: str, short_title: str) -> str:
    family_color = GROUPS[group]
    inner = build_source_inner_only(dp_num, code, group, glyph_id)
    title = name.replace("&", "&amp;")

    # Title may be long; wrap to 1-2 lines at 22 px font.
    title_lines = _wrap_title(name, max_chars_per_line=34)
    if len(title_lines) == 1:
        # Push down a little so it sits below the group label
        title_lines = [title_lines[0]]
    line_y_start = 538
    line_height = 26
    title_svg_parts = []
    for i, line in enumerate(title_lines):
        safe = line.replace("&", "&amp;")
        title_svg_parts.append(
            f'<text x="300" y="{line_y_start + i * line_height}" '
            f'font-family=\'{FONT_STACK}\' font-size="22" font-weight="500" '
            f'fill="{CAPTION}" text-anchor="middle">{safe}</text>'
        )
    title_svg = "\n  ".join(title_svg_parts)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num} — {code} — {title}</title>
  <!-- white background -->
  <rect width="600" height="600" fill="{WHITE}"/>
  <!-- gold outer frame (brand) -->
  <rect x="8" y="8" width="584" height="584" rx="14" fill="none" stroke="{GOLD_BORDER}" stroke-width="6"/>
  <!-- subtle inner gold border for depth -->
  <rect x="22" y="22" width="556" height="556" rx="8" fill="none" stroke="{GOLD_BORDER}" stroke-width="1.5" stroke-opacity="0.35"/>
  <!-- DPnn label, top-left, gold (brand) -->
  <text x="56" y="100" font-family='{FONT_STACK}' font-size="64" font-weight="700" fill="{GOLD_BORDER}" letter-spacing="-1">DP{dp_num:02d}</text>
  <!-- 2-letter code, top-right, family color -->
  <text x="544" y="100" font-family='{FONT_STACK}' font-size="48" font-weight="700" fill="{family_color}" text-anchor="end" letter-spacing="2">{code}</text>
  <!-- icon at 60,150 → 540,490 (480x480) -->
  <svg x="60" y="150" width="480" height="480" viewBox="0 0 24 24" fill="none">
    {inner}
  </svg>
  <!-- short title, bottom, neutral gray -->
  {title_svg}
  <!-- group label, small caps, gold -->
  <text x="300" y="510" font-family='{FONT_STACK}' font-size="13" font-weight="600" fill="{GOLD_BORDER}" text-anchor="middle" letter-spacing="2.5">{x(group.upper())}</text>
</svg>
"""


def x(s: str) -> str:
    """Escape & for safe inclusion in SVG text."""
    return s.replace("&", "&amp;")


# --------------------------------------------------------------------------- #
# Build cover SVG (1200x630)                                                  #
# --------------------------------------------------------------------------- #
def build_cover(dp_num: int, name: str, code: str, group: str,
                glyph_id: str, short_title: str) -> str:
    family_color = GROUPS[group]
    title = name.replace("&", "&amp;")
    # Right strip: up to 3 lines of full title at 44 px bold.
    # We wrap to ≤16 chars/line so 3 lines comfortably fit.
    title_lines = _wrap_title(name, max_chars_per_line=18)
    title_lines = title_lines[:3]
    # Compute vertical placement: start lower if fewer lines, higher if more
    n_lines = len(title_lines)
    line_height = 56
    block_height = line_height * (n_lines - 1)
    line_y_start = 320 - block_height // 2
    text_lines = []
    for i, line in enumerate(title_lines):
        safe = line.replace("&", "&amp;")
        text_lines.append(
            f'<text x="650" y="{line_y_start + i * line_height}" '
            f'font-family=\'{FONT_STACK}\' font-size="46" font-weight="700" '
            f'fill="{DARK_TEXT}">{safe}</text>'
        )
    lines_svg = "\n  ".join(text_lines)

    inner = build_source_inner_only(dp_num, code, group, glyph_id)
    group_label = GROUP_LABEL[group]

    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-labelledby="t">
  <title id="t">DP{dp_num} — {code} — {title}</title>
  <!-- white background -->
  <rect width="1200" height="630" fill="{WHITE}"/>
  <!-- gold border -->
  <rect x="4" y="4" width="1192" height="622" rx="6" fill="none" stroke="{GOLD_BORDER}" stroke-width="4"/>
  <!-- family-color wash on right strip -->
  <rect x="600" y="4" width="596" height="622" fill="{family_color}" fill-opacity="0.08"/>
  <!-- gold divider line between halves -->
  <line x1="600" y1="4" x2="600" y2="626" stroke="{GOLD_BORDER}" stroke-width="2" stroke-opacity="0.7"/>
  <!-- icon at left half: 480x480 centered -->
  <svg x="60" y="75" width="480" height="480" viewBox="0 0 24 24" fill="none">
    {inner}
  </svg>
  <!-- DPnn, gold -->
  <text x="650" y="110" font-family='{FONT_STACK}' font-size="36" font-weight="700" fill="{GOLD_BORDER}" letter-spacing="2">DP{dp_num:02d}</text>
  <!-- 2-letter code, family color, larger -->
  <text x="650" y="180" font-family='{FONT_STACK}' font-size="64" font-weight="700" fill="{family_color}" letter-spacing="2">{code}</text>
  <!-- group label, small caps, gold -->
  <text x="650" y="215" font-family='{FONT_STACK}' font-size="14" font-weight="600" fill="{GOLD_BORDER}" letter-spacing="3">{x(group_label.upper())}</text>
  <!-- divider under header -->
  <line x1="650" y1="240" x2="1140" y2="240" stroke="{GOLD_BORDER}" stroke-width="1" stroke-opacity="0.45"/>
  <!-- title text lines -->
  {lines_svg}
  <!-- caption bottom-left -->
  <text x="32" y="600" font-family='{FONT_STACK}' font-size="20" font-weight="500" fill="{CAPTION}" letter-spacing="1.5">DP{dp_num:02d} · {code} · {x(group.upper())}</text>
  <!-- gold accent dot bottom-right -->
  <circle cx="1170" cy="600" r="10" fill="{GOLD_BORDER}"/>
</svg>
"""


def _wrap_title(title: str, max_chars_per_line: int) -> list[str]:
    """Naive word-wrap. Targets max_chars_per_line for the given font size."""
    words = title.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= max_chars_per_line:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# --------------------------------------------------------------------------- #
# Main                                                                        #
# --------------------------------------------------------------------------- #
def main() -> int:
    titles = load_dp_titles()

    source_targets = [
        DESIRABLE_ASSET_ROOT / "source",
        REPO_DEV / "static" / "images" / "dp-icons" / "source",
        REPO_PROD / "static" / "images" / "dp-icons" / "source",
    ]
    for t in source_targets:
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

    for dp_num, name, code, group, glyph_id, short_title in DP_TABLE:
        title_name = titles.get(dp_num, name)
        src = build_source(dp_num, title_name, code, group, glyph_id)
        bdg = build_badge(dp_num, title_name, code, group, glyph_id, short_title)
        cov = build_cover(dp_num, title_name, code, group, glyph_id, short_title)

        for d in source_targets:
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